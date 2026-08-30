from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from qdrant_client.http import models as qmodels
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document

from app.database import get_session
from app.config import settings
from app.models.vehicle import Vehicle
from app.models.inspection import (
    DTCScan,
    DTCScanCreate,
    ShopFix,
    ShopFixCreate,
)
from app.services.ingestion import qdrant_client, ensure_collection_exists, embeddings
from app.services.copilot import fetch_manual_context

router = APIRouter(prefix="/api/v1/inspections", tags=["inspections"])

FIXES_COLLECTION = "shop_fixes"

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2,
    openai_api_key=settings.openai_api_key,
)

def get_fixes_vector_store() -> QdrantVectorStore:
    ensure_collection_exists(FIXES_COLLECTION)
    return QdrantVectorStore(
        client=qdrant_client,
        collection_name=FIXES_COLLECTION,
        embedding=embeddings,
    )

def calculate_dtc_severity(dtc_code: str) -> str:
    code = dtc_code.upper().strip()
    if code.startswith("P03") or code.startswith("P02") or code.startswith("P00"):
        return "Critical Engine Fault"
    elif code.startswith("P04") or code.startswith("P01") or code.startswith("P05"):
        return "Emissions Warning"
    elif code.startswith("B") or code.startswith("C") or code.startswith("U"):
        return "Body/Chassis/Network"
    else:
        return "General Diagnostics Alert"

@router.post("/dtc-scan/", response_model=DTCScan)
def create_dtc_scan(
    scan_data: DTCScanCreate,
    session: Session = Depends(get_session)
):
    vehicle = session.get(Vehicle, scan_data.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )
    
    severity = calculate_dtc_severity(scan_data.dtc_code)
    scan = DTCScan(
        vehicle_id=scan_data.vehicle_id,
        dtc_code=scan_data.dtc_code.upper().strip(),
        rpm=scan_data.rpm,
        coolant_temp=scan_data.coolant_temp,
        fuel_trim=scan_data.fuel_trim,
        severity=severity,
        status="pending"
    )
    session.add(scan)
    session.commit()
    session.refresh(scan)
    return scan

@router.post("/dtc-scan/{scan_id}/analyze/")
async def analyze_dtc_scan(
    scan_id: int,
    session: Session = Depends(get_session)
):
    scan = session.get(DTCScan, scan_id)
    if not scan:
        raise HTTPException(
            status_code=404,
            detail="DTC Scan record not found"
        )
    
    vehicle = session.get(Vehicle, scan.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle associated with scan not found"
        )
    
    # 1. Query manuals vector DB
    manual_context = fetch_manual_context(vehicle_id=vehicle.id, query=scan.dtc_code)
    
    # 2. Query shop fixes vector DB for related past fixes
    fixes_store = get_fixes_vector_store()
    try:
        fix_results = fixes_store.similarity_search(query=scan.dtc_code, k=3)
    except Exception:
        fix_results = []
        
    fix_context_list = []
    for i, doc in enumerate(fix_results, start=1):
        fix_context_list.append(f"Past Fix [{i}]:\n{doc.page_content}")
    
    fix_context = "\n\n".join(fix_context_list) if fix_context_list else "No matching past shop fixes indexed."

    # 3. Construct system and user prompt
    system_prompt = """You are an expert Automotive Master Technician.
Your task is to analyze the active DTC trouble code and OBD-II freeze frame data.
Provide:
1. Diagnosis & description of what the DTC code means.
2. Step-by-step diagnostic verification and pinpoint testing steps.
3. Reference values based on manual excerpts or past shop fixes.
Be precise, safety-conscious, and technical. Use markdown.
"""
    user_prompt = f"""--- VEHICLE PROFILE ---
Make/Model/Year: {vehicle.year} {vehicle.make} {vehicle.model}
VIN: {vehicle.vin or 'N/A'}
Current Mileage: {vehicle.current_mileage} miles

--- DTC ERROR CODE & FREEZE FRAME ---
DTC Code: {scan.dtc_code} ({scan.severity})
RPM: {scan.rpm if scan.rpm is not None else 'N/A'} RPM
Coolant Temp: {scan.coolant_temp if scan.coolant_temp is not None else 'N/A'} °C
Fuel Trim: {scan.fuel_trim if scan.fuel_trim is not None else 'N/A'} %

--- VECTOR MANUAL EXCERPTS ---
{manual_context}

--- HISTORICAL SHOP REPAIR FIXES ---
{fix_context}

Please provide pinpoint diagnostic steps and confirmed checks.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", user_prompt),
    ])

    chain = prompt | llm
    response = await chain.ainvoke({})
    
    return {
        "scan_id": scan.id,
        "dtc_code": scan.dtc_code,
        "analysis": response.content
    }

@router.post("/resolve-and-learn/", response_model=ShopFix)
def resolve_and_learn_fix(
    fix_data: ShopFixCreate,
    session: Session = Depends(get_session)
):
    # 1. Save ShopFix to SQLite
    fix = ShopFix(
        dtc_code=fix_data.dtc_code.upper().strip(),
        make=fix_data.make,
        model=fix_data.model,
        year=fix_data.year,
        reported_symptom=fix_data.reported_symptom,
        root_cause=fix_data.root_cause,
        confirmed_fix=fix_data.confirmed_fix
    )
    session.add(fix)
    
    # 2. Mark scan as resolved if scan_id is provided
    if fix_data.scan_id:
        scan = session.get(DTCScan, fix_data.scan_id)
        if scan:
            scan.status = "resolved"
            session.add(scan)
            
    session.commit()
    session.refresh(fix)
    
    # 3. Formulate text and index in Qdrant shop_fixes collection
    fix_text = (
        f"DTC: {fix.dtc_code} | "
        f"Vehicle: {fix.year} {fix.make} {fix.model} | "
        f"Symptom: {fix.reported_symptom} | "
        f"Root Cause: {fix.root_cause} | "
        f"Confirmed Fix: {fix.confirmed_fix}"
    )
    
    doc = Document(
        page_content=fix_text,
        metadata={
            "fix_id": fix.id,
            "dtc_code": fix.dtc_code,
            "make": fix.make,
            "model": fix.model,
            "year": fix.year
        }
    )
    
    try:
        fixes_store = get_fixes_vector_store()
        fixes_store.add_documents([doc])
    except Exception as e:
        # Don't fail the REST endpoint if vector DB upload has an error, but log it
        print(f"Failed to upsert fix to Qdrant collection: {e}")
        
    return fix

@router.get("/knowledge-base/", response_model=List[ShopFix])
def get_knowledge_base(
    q: Optional[str] = None,
    session: Session = Depends(get_session)
):
    if not q:
        # Return all fixes
        return session.exec(select(ShopFix).order_by(ShopFix.created_at.desc())).all()
    
    # Hybrid Search:
    # 1. SQL database matches
    q_pattern = f"%{q}%"
    stmt = (
        select(ShopFix)
        .where(
            (ShopFix.dtc_code.like(q_pattern)) |
            (ShopFix.make.like(q_pattern)) |
            (ShopFix.model.like(q_pattern)) |
            (ShopFix.reported_symptom.like(q_pattern)) |
            (ShopFix.root_cause.like(q_pattern)) |
            (ShopFix.confirmed_fix.like(q_pattern))
        )
        .order_by(ShopFix.created_at.desc())
    )
    sql_matches = session.exec(stmt).all()
    
    # Keep track of matched IDs
    matched_ids = {fix.id for fix in sql_matches if fix.id is not None}
    results = list(sql_matches)
    
    # 2. Qdrant vector semantic search
    try:
        fixes_store = get_fixes_vector_store()
        vector_results = fixes_store.similarity_search(query=q, k=5)
        for doc in vector_results:
            fix_id = doc.metadata.get("fix_id")
            if fix_id and fix_id not in matched_ids:
                # Retrieve from SQL
                fix_db = session.get(ShopFix, fix_id)
                if fix_db:
                    results.append(fix_db)
                    matched_ids.add(fix_id)
    except Exception as e:
        print(f"Failed to query Qdrant collection: {e}")
        
    return results
