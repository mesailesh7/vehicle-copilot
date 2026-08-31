from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List, Optional
from app.database import get_session
from app.models.tenant import Tenant
from app.models.user import User
from app.models.vehicle import (
    Vehicle,
    VehicleCreate,
    ServiceLog,
    ServiceLogCreate,
    ServiceCategory,
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["vehicles"])

@router.post("/vehicles/", response_model=Vehicle)
def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    tenant_id = current_user.tenant_id or 1
    tenant = session.get(Tenant, tenant_id)
    
    # Enforce vehicle quota per subscription tier
    if tenant:
        current_vehicle_count = session.exec(
            select(func.count(Vehicle.id)).where(Vehicle.tenant_id == tenant.id)
        ).one()
        if current_vehicle_count >= tenant.max_vehicles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vehicle limit of {tenant.max_vehicles} reached for your {tenant.plan_tier.upper()} plan. Please upgrade your subscription to add more vehicles."
            )

    vehicle = Vehicle(
        vin=vehicle_data.vin,
        make=vehicle_data.make,
        model=vehicle_data.model,
        year=vehicle_data.year,
        current_mileage=vehicle_data.current_mileage,
        tenant_id=tenant_id,
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle

@router.get("/vehicles/", response_model=List[Vehicle])
def read_vehicles(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    tenant_id = current_user.tenant_id or 1
    vehicles = session.exec(
        select(Vehicle).where(Vehicle.tenant_id == tenant_id)
    ).all()
    return vehicles

@router.post("/logs/", response_model=ServiceLog)
def create_service_log(
    log_data: ServiceLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    tenant_id = current_user.tenant_id or 1
    vehicle = session.get(Vehicle, log_data.vehicle_id)
    if not vehicle or vehicle.tenant_id != tenant_id:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found in your workshop."
        )

    log = ServiceLog(
        vehicle_id=log_data.vehicle_id,
        service_date=log_data.service_date or date.today(),
        mileage_at_service=log_data.mileage_at_service,
        category=log_data.category,
        description=log_data.description,
        parts_replaced=log_data.parts_replaced,
        cost=log_data.cost,
        notes=log_data.notes,
        tenant_id=tenant_id,
    )
    session.add(log)

    # Auto-update current_mileage if log's mileage is greater
    if log.mileage_at_service > vehicle.current_mileage:
        vehicle.current_mileage = log.mileage_at_service
        session.add(vehicle)

    session.commit()
    session.refresh(log)
    return log

@router.get("/logs/{vehicle_id}", response_model=List[ServiceLog])
def read_service_log(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    tenant_id = current_user.tenant_id or 1
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle or vehicle.tenant_id != tenant_id:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found in your workshop."
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
def get_common_parts(
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    tenant_id = current_user.tenant_id or 1
    statement = select(ServiceLog.parts_replaced).where(
        ServiceLog.parts_replaced != None,
        ServiceLog.tenant_id == tenant_id,
    )
    results = session.exec(statement).all()

    parts = set()
    for row in results:
        if row:
            for part in row.replace(";", ",").split(","):
                part_clean = part.strip()
                if part_clean:
                    parts.add(part_clean)

    # Standard default automotive parts if tenant is fresh
    default_parts = [
        "Oil Filter", "Engine Oil 5W-30", "Engine Oil 0W-20", "Cabin Air Filter",
        "Engine Air Filter", "Front Brake Pads", "Rear Brake Pads", "Brake Rotors",
        "Spark Plugs (Iridium)", "12V AGM Battery", "DOT 4 Brake Fluid",
        "Transmission Fluid ATF", "Serpentine Belt", "Coolant 50/50 Prediluted"
    ]
    parts.update(default_parts)

    if q:
        q_lower = q.lower()
        filtered_parts = [p for p in parts if q_lower in p.lower()]
    else:
        filtered_parts = list(parts)

    return sorted(filtered_parts)[:20]