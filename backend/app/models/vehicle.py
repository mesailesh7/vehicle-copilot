from datetime import date
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field

class ServiceCategory(str, Enum):
    OIL_CHANGE = "OIL_CHANGE"
    BRAKE_SERVICE = "BRAKE_SERVICE"
    TIRE_SERVICE = "TIRE_SERVICE"
    BATTERY = "BATTERY"
    TRANSMISSION = "TRANSMISSION"
    COOLANT = "COOLANT"
    SPARK_PLUGS = "SPARK_PLUGS"
    CABIN_AIR_FILTER = "CABIN_AIR_FILTER"
    SUSPENSION = "SUSPENSION"
    DTC_DIAGNOSTIC = "DTC_DIAGNOSTIC"
    GENERAL_INSPECTION = "GENERAL_INSPECTION"
    CUSTOM = "CUSTOM"

# Vehicle Schemas
class VehicleBase(SQLModel):
    vin: Optional[str] = Field(default=None, index=True)
    make: str
    model: str
    year: int
    current_mileage: int

class Vehicle(VehicleBase, table=True):
    __tablename__ = "vehicles"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(default=1, foreign_key="tenants.id", index=True)

class VehicleCreate(VehicleBase):
    pass

# Service Log Schemas
class ServiceLogBase(SQLModel):
    vehicle_id: int = Field(foreign_key="vehicles.id")
    service_date: date
    mileage_at_service: int
    category: str
    description: str
    parts_replaced: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class ServiceLog(ServiceLogBase, table=True):
    __tablename__ = "service_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: Optional[int] = Field(default=1, foreign_key="tenants.id", index=True)

class ServiceLogCreate(ServiceLogBase):
    service_date: Optional[date] = None