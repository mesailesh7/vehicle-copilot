from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

class TenantBase(SQLModel):
    name: str
    slug: str = Field(unique=True, index=True)
    plan_tier: str = "starter"  # starter, pro, enterprise
    subscription_status: str = "trialing"  # active, trialing, past_due, canceled, inactive
    max_vehicles: int = 15
    max_members: int = 5

class Tenant(TenantBase, table=True):
    __tablename__ = "tenants"

    id: Optional[int] = Field(default=None, primary_key=True)
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = Field(default=None, index=True)
    current_period_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utc_now)

class TenantCreate(SQLModel):
    name: str
    slug: Optional[str] = None
    plan_tier: str = "starter"

class TenantUpdate(SQLModel):
    name: Optional[str] = None
    plan_tier: Optional[str] = None
    subscription_status: Optional[str] = None
    max_vehicles: Optional[int] = None
    max_members: Optional[int] = None

class TenantResponse(SQLModel):
    id: int
    name: str
    slug: str
    plan_tier: str
    subscription_status: str
    max_vehicles: int
    max_members: int
    current_period_end: Optional[datetime] = None
    created_at: datetime

class TenantInviteBase(SQLModel):
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    code: str = Field(unique=True, index=True)
    role: str = "technician"  # technician, service_advisor, manager, admin
    created_by_user_id: int = Field(foreign_key="users.id")

class TenantInvite(TenantInviteBase, table=True):
    __tablename__ = "tenant_invites"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=_utc_now)
    expires_at: Optional[datetime] = None
    is_used: bool = False
    used_by_user_id: Optional[int] = None

class InviteCreateRequest(SQLModel):
    role: str = "technician"  # technician, service_advisor, manager, admin
    expires_in_days: int = 7

class InviteResponse(SQLModel):
    id: int
    code: str
    role: str
    tenant_id: int
    tenant_name: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_used: bool
