from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

class DTCScanBase(SQLModel):
    vehicle_id: int = Field(foreign_key="vehicles.id")
    dtc_code: str
    rpm: Optional[float] = None
    coolant_temp: Optional[float] = None
    fuel_trim: Optional[float] = None

class DTCScan(DTCScanBase, table=True):
    __tablename__ = "dtc_scans"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id", index=True)
    severity: str  # Critical Engine Fault, Emissions Warning, Body/Chassis
    status: str = "pending"  # pending, resolved
    created_at: datetime = Field(default_factory=_utc_now)

class DTCScanCreate(DTCScanBase):
    pass

class ShopFixBase(SQLModel):
    dtc_code: str
    make: str
    model: str
    year: int
    reported_symptom: str
    root_cause: str
    confirmed_fix: str

class ShopFix(ShopFixBase, table=True):
    __tablename__ = "shop_fixes"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id", index=True)
    created_at: datetime = Field(default_factory=_utc_now)

class ShopFixCreate(ShopFixBase):
    scan_id: Optional[int] = None  # If associated with a DTCScan
