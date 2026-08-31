from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from sqlmodel import Session
from app.database import get_session
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.routers.auth import get_current_user
from app.services.ingestion import process_pdf_manual

router = APIRouter(
    prefix="/api/v1/documents",
    tags=["documents"],
)

@router.post("/upload-manual")
async def upload_manual(
    vehicle_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role == UserRole.SERVICE_ADVISOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service Advisors do not have manual upload permissions.",
        )

    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF vehicle service manual files are accepted.",
        )

    tenant_id = current_user.tenant_id or 1
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle or vehicle.tenant_id != tenant_id:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found in your workshop.",
        )

    try:
        chunks_count = await process_pdf_manual(file, vehicle_id, tenant_id)
        return {
            "status": "success",
            "filename": file.filename,
            "vehicle_id": vehicle_id,
            "tenant_id": tenant_id,
            "chunks_index": chunks_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process manual file: {e}",
        )