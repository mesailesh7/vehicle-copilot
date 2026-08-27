from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field



def _now() -> datetime:
    return datetime.now(timezone.utc)

# {
#   "id": 1,
#   "vehicle_id": 1,
#   "service_date": "2026-08-26T23:26:58.519Z",
#   "mileage_at_service": 155555,
#   "category": "Oil Change",
#   "description": "Oil Change",
#   "parts_replaced": "Oil Filter Changed",
#   "cost": 125,
#   "notes": "Flush Oil Next Time"
# }
class Vehicle(SQLModel, table=True):
    __tablename__ = "vehicles"

    id: Optional[int] = Field(default=None, primary_key=True)
    vin: Optional[str] = Field(default=None, index=True)
    make: str
    model: str
    year: int
    current_mileage:int

class ServiceLog(SQLModel, table=True):
    __tablename__ = "service_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key='vehicles.id')
    service_date: datetime = Field(default_factory=_now)
    mileage_at_service: int
    category: str
    description: str
    parts_replaced: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None


class ServiceLogCreate(SQLModel):
    vehicle_id: int
    service_date: Optional[datetime] = None
    mileage_at_service: int
    category: str
    description: str
    parts_replaced: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None