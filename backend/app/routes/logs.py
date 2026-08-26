from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.database import  get_session
from app.models.vehicle import Vehicle, ServiceLog

router = APIRouter(prefix="/api/v1", tags=["vehicles"])

@router.post("/vehicles/", response_model=Vehicle)
def create_vehicle(vehicle: Vehicle, session: Session = Depends(get_session)):
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle