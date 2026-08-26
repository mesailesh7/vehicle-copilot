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

@router.get("/vehicles/", response_model=List[Vehicle])
def read_vehicles(session: Session = Depends(get_session)):
    vehicles = session.exec(select(Vehicle)).all()
    return vehicles

@router.post("/logs/", response_model=ServiceLog)
def create_service_log(log:ServiceLog, session: Session = Depends(get_session)):
    vehicle = session.get(Vehicle, log.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    session.add(log)
    session.commit()
    session.refresh(log)
    return log

