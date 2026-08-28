from typing import List, Dict, Any
from sqlmodel import Session, select
from qdrant_client.http import models as qmodels
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.vehicle import Vehicle, ServiceLog
from app.services.ingestion import get_vector_store

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2,
    openai_api_key=settings.openai_api_key,
)

SYSTEM_PROMPT="""You are an expert Automotive Diagnostic and Maintenance Copilot.
Your job is to assist vehicle owners using two sources of truth:
1. Structured Service Records & Vehicle Specs (from the SQL database)
2. Technical Manual Excerpts (from vector retrieval)

Guidelines:
- When asked about past maintenance, rely on the provided Service History.
- When asked about torque specs, fluid capacities, oil weights, or fuse locations, cite the Owner's Manual context.
- If the data is not in either source, clearly state that the specific information is not available in the records or manual.
- Always provide clear, safety-conscious step-by-step guidance.
"""

USER_TEMPLATE = """--- VEHICLE PROFILE ---
Make/Model/Year: {year} {make} {model}
VIN: {vin}
Current Mileage: {current_mileage} miles

--- STRUCTURED SERVICE HISTORY ---
{service_history}

--- OWNER'S MANUAL & TECHNICAL CONTEXT ---
{manual_context}

--- USER QUESTION ---
{question}
"""
def fetch_vehicle_context(vehicle_id: int, session: Session) -> Dict[str, Any]:
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise ValueError(f"Vehicle with id {vehicle_id} not found")
    statement = (
        select(ServiceLog)
        .where(ServiceLog.vehicle_id == vehicle_id)
        .order_by(ServiceLog.service_date.desc())
    )
    logs = session.exec(statement).all()

    if not logs:
        history_text = "No maintenance records currently on file for this vehicle."
    else:
        history_items = []
        for log in logs:
            history_items.append(
                f"- [{log.service_date}] Category: {log.category} | Mileage: {log.mileage_at_service} mi\n"
                f"  Description: {log.description}\n"
                f"  Parts: {log.parts_replaced or 'N/A'} | Cost: ${log.cost if log.cost is not None else 'N/A'}\n"
                f"  Notes: {log.notes or 'None'}"
            )
        history_text = "\n".join(history_items)

    return {
        "vehicle": vehicle,
        "service_history": history_text
    }

def fetch_manual_context(vehicle_id: int, query: str, top_k:int =4)  -> str:
    vector_store = get_vector_store()

    vehicle_filter = qmodels.Filter(
        must = [
            qmodels.FieldCondition(
                key="metadata.vehicle_id",
                match=qmodels.MatchValue(value=vehicle_id),
            )
        ]
    )

    results = vector_store.similarity_search(
        query=query,
        k=top_k,
        filter=vehicle_filter,
    )

    if not results:
        return "NO relevant owner's manual excerpts located."

    formatted_docs = []
    for i, doc in enumerate(results, start=1):
        source = doc.metadata.get("source_filename", "Manual")
        page = doc.metadata.get("page", "N/A")
        formatted_docs.append(f"Excerpt [{i}] (Source: {source}, Page: {page}):\n{doc.page_content}")

    return "\n\n".join(formatted_docs)


async def generate_copilot_response(vehicle_id: int, question: str,session: Session) -> str:
    veh_data = fetch_vehicle_context(vehicle_id, session)
    vehicle: Vehicle = veh_data["vehicle"]
    service_history: str = veh_data["service_history"]

    manual_context = fetch_manual_context(vehicle_id=vehicle_id, query=question)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user", USER_TEMPLATE),
    ])

    chain = prompt | llm
    response = await chain.ainvoke({
        "year": vehicle.year,
        "make": vehicle.make,
        "model": vehicle.model,
        "vin": vehicle.vin or "N/A",
        "current_mileage": vehicle.current_mileage,
        "service_history": service_history,
        "manual_context": manual_context,
        "question": question
    })

    return response.content