from datetime import date
from typing import Optional
from sqlmodel import SQLModel, Field

class Vehicle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vin: Optional[str] = Field(default=None, index=True)
    make: str
    model: str
    year: int
    current_mileage:int

class ServiceLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key='Vehicle.id')
    service_date: date
    mileage_at_service: int
    category: str
    description: str
    parts_replaced: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
