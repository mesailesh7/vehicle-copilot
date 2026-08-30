from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_session
from app.models.vehicle import (
    Vehicle,
    VehicleCreate,
    ServiceLog,
    ServiceLogCreate,
    ServiceCategory,
)

router = APIRouter(prefix="/api/v1", tags=["vehicles"])

@router.post("/vehicles/", response_model=Vehicle)
def create_vehicle(vehicle_data: VehicleCreate, session: Session = Depends(get_session)):
    vehicle = Vehicle.model_validate(vehicle_data)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle

@router.get("/vehicles/", response_model=List[Vehicle])
def read_vehicles(session: Session = Depends(get_session)):
    vehicles = session.exec(select(Vehicle)).all()
    return vehicles

@router.post("/logs/", response_model=ServiceLog)
def create_service_log(
    log_data: ServiceLogCreate,
    session: Session = Depends(get_session)
):
    vehicle = session.get(Vehicle, log_data.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    log = ServiceLog.model_validate(log_data)
    if log.service_date is None:
        log.service_date = date.today()

    session.add(log)

    # Auto-update current_mileage if log's mileage is greater
    if log.mileage_at_service > vehicle.current_mileage:
        vehicle.current_mileage = log.mileage_at_service
        session.add(vehicle)

    session.commit()
    session.refresh(log)
    return log

@router.get("/logs/{vehicle_id}", response_model=List[ServiceLog])
def read_service_log(vehicle_id: int, session: Session = Depends(get_session)):
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )
    return session.exec(
        select(ServiceLog)
        .where(ServiceLog.vehicle_id == vehicle_id)
        .order_by(ServiceLog.service_date.desc())
    ).all()

@router.get("/service-categories/", response_model=List[str])
def get_service_categories():
    return [cat.value for cat in ServiceCategory]

@router.get("/common-parts/", response_model=List[str])
def get_common_parts(q: Optional[str] = None, session: Session = Depends(get_session)):
    statement = select(ServiceLog.parts_replaced).where(ServiceLog.parts_replaced != None)
    results = session.exec(statement).all()

    parts = set()
    for row in results:
        if row:
            # Clean and split parts by comma or semicolon
            for part in row.replace(";", ",").split(","):
                part_clean = part.strip()
                if part_clean:
                    parts.add(part_clean)

    if q:
        q_lower = q.lower()
        filtered_parts = [p for p in parts if q_lower in p.lower()]
    else:
        filtered_parts = list(parts)

    return sorted(filtered_parts)[:20]