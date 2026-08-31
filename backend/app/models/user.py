from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserRole:
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"
    SERVICE_ADVISOR = "service_advisor"
    
    ALL = [OWNER, ADMIN, MANAGER, TECHNICIAN, SERVICE_ADVISOR]
    INVITABLE = [ADMIN, MANAGER, TECHNICIAN, SERVICE_ADVISOR]
    CAN_INVITE = [OWNER, ADMIN, MANAGER]

class UserBase(SQLModel):
    username: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None, index=True)
    full_name: Optional[str] = None
    role: str = "technician"  # owner, admin, manager, technician, service_advisor

class User(UserBase, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id", index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=_utc_now)

class UserCreate(UserBase):
    password: str
    shop_name: Optional[str] = None  # If provided, creates a new Tenant with this user as Owner
    plan_tier: Optional[str] = "starter"  # starter, pro, enterprise
    invite_code: Optional[str] = None  # If provided, joins existing Tenant with role in the invite

class UserLogin(SQLModel):
    username: str
    password: str

class UserResponse(SQLModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    tenant_slug: Optional[str] = None
    tenant_plan: Optional[str] = None
    tenant_status: Optional[str] = None
    created_at: Optional[datetime] = None

class MemberResponse(SQLModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    created_at: Optional[datetime] = None
