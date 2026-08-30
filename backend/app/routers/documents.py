from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlmodel import Session
from app.database import  get_session
from app.models.vehicle import Vehicle
from app.services.ingestion import process_pdf_manual

router = APIRouter(
    prefix="/api/v1/documents",
    tags=["documents"],
)

@router.post("/upload-manual")
async def upload_manual(
        vehicle_id: int = Form(...),
        file: UploadFile = File(...),
        session: Session = Depends(get_session),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files manuals are accepted",
        )

    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    try:
        chunks_count = await process_pdf_manual(file, vehicle_id)
        return {
            "status": "success",
            "filename": file.filename,
            "vehicle_id": vehicle_id,
            "chunks_index": chunks_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process manual file: {e}",
        )