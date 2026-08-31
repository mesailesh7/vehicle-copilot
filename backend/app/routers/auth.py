import os
import re
import random
import string
import datetime
from typing import Optional, List
import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.database import get_session
from app.config import settings
from app.models.user import User, UserCreate, UserLogin, UserResponse, MemberResponse, UserRole
from app.models.tenant import (
    Tenant,
    TenantInvite,
    InviteCreateRequest,
    InviteResponse,
)
from app.services.stripe_service import get_plan

SECRET_KEY = settings.jwt_secret
ALGORITHM = "HS256"

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
security = HTTPBearer()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_slug(name: str, session: Session) -> str:
    base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if not base_slug:
        base_slug = "workshop"
    
    slug = base_slug
    counter = 1
    while session.exec(select(Tenant).where(Tenant.slug == slug)).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

def generate_invite_code(prefix: str = "INV") -> str:
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix.upper()}-{random_chars}"

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=48)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token credentials",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )
    return user

def get_current_tenant(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Tenant:
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to any workshop organization",
        )
    tenant = session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop organization not found",
        )
    return tenant

def require_role(allowed_roles: list[str]):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles. Your role is '{current_user.role}'.",
            )
        return current_user
    return dependency

def _build_user_response(user: User, session: Session) -> UserResponse:
    tenant = session.get(Tenant, user.tenant_id) if user.tenant_id else None
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        tenant_id=user.tenant_id,
        tenant_name=tenant.name if tenant else None,
        tenant_slug=tenant.slug if tenant else None,
        tenant_plan=tenant.plan_tier if tenant else None,
        tenant_status=tenant.subscription_status if tenant else None,
        created_at=user.created_at,
    )

@router.post("/signup", response_model=UserResponse)
def signup(user_data: UserCreate, session: Session = Depends(get_session)):
    # 1. Check if username already exists
    existing = session.exec(select(User).where(User.username == user_data.username)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another."
        )

    assigned_tenant_id = None
    assigned_role = user_data.role or UserRole.TECHNICIAN
    invite_record = None

    # Case A: Creating a new workshop organization (Owner role)
    if user_data.shop_name and user_data.shop_name.strip():
        slug = generate_slug(user_data.shop_name.strip(), session)
        plan_tier = user_data.plan_tier or "starter"
        plan_info = get_plan(plan_tier)
        
        new_tenant = Tenant(
            name=user_data.shop_name.strip(),
            slug=slug,
            plan_tier=plan_tier,
            subscription_status="active",
            max_vehicles=plan_info["max_vehicles"],
            max_members=plan_info["max_members"],
        )
        session.add(new_tenant)
        session.commit()
        session.refresh(new_tenant)
        
        assigned_tenant_id = new_tenant.id
        assigned_role = UserRole.OWNER

    # Case B: Joining with an Invite Code
    elif user_data.invite_code and user_data.invite_code.strip():
        clean_code = user_data.invite_code.strip().upper()
        invite_record = session.exec(
            select(TenantInvite).where(
                TenantInvite.code == clean_code,
                TenantInvite.is_used == False,
            )
        ).first()

        if not invite_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or already used invitation code."
            )

        if invite_record.expires_at:
            exp = invite_record.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=datetime.timezone.utc)
            if exp < datetime.datetime.now(datetime.timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This invitation code has expired. Please request a new invite from your workshop manager."
                )

        assigned_tenant_id = invite_record.tenant_id
        assigned_role = invite_record.role

    # Case C: Fallback to default demo workshop
    else:
        default_tenant = session.exec(select(Tenant).where(Tenant.id == 1)).first()
        assigned_tenant_id = default_tenant.id if default_tenant else 1
        if user_data.role not in UserRole.ALL:
            assigned_role = UserRole.TECHNICIAN

    # 2. Check tenant member limit
    if assigned_tenant_id:
        tenant = session.get(Tenant, assigned_tenant_id)
        if tenant:
            current_member_count = len(session.exec(select(User).where(User.tenant_id == tenant.id)).all())
            if current_member_count >= tenant.max_members:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Workshop has reached its team limit of {tenant.max_members} members. Please ask your shop owner to upgrade the subscription plan."
                )

    # 3. Create the user
    hashed = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=assigned_role,
        tenant_id=assigned_tenant_id,
        hashed_password=hashed,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # 4. Mark invite code as used if applicable
    if invite_record:
        invite_record.is_used = True
        invite_record.used_by_user_id = user.id
        session.add(invite_record)
        session.commit()

    return _build_user_response(user, session)

@router.post("/login")
def login(login_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == login_data.username)).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    tenant = session.get(Tenant, user.tenant_id) if user.tenant_id else None

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_slug": tenant.slug if tenant else None,
            "tenant_name": tenant.name if tenant else None,
            "plan_tier": tenant.plan_tier if tenant else "starter",
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "tenant_name": tenant.name if tenant else None,
            "tenant_slug": tenant.slug if tenant else None,
            "tenant_plan": tenant.plan_tier if tenant else None,
            "tenant_status": tenant.subscription_status if tenant else None,
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return _build_user_response(current_user, session)

# ==============================================================================
# TEAM MANAGEMENT & INVITATION CODES (Owner, Admin, Manager)
# ==============================================================================

@router.post("/invites", response_model=InviteResponse)
def create_invite(
    req: InviteCreateRequest,
    current_user: User = Depends(require_role(UserRole.CAN_INVITE)),
    session: Session = Depends(get_session),
):
    """Allows Managers, Admins, and Owners to generate invite codes for Technicians, Advisors, and staff."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User is not attached to a workshop tenant.")

    tenant = session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant organization not found.")

    # Check member limit
    member_count = len(session.exec(select(User).where(User.tenant_id == tenant.id)).all())
    active_invites_count = len(session.exec(
        select(TenantInvite).where(
            TenantInvite.tenant_id == tenant.id,
            TenantInvite.is_used == False,
        )
    ).all())

    if (member_count + active_invites_count) >= tenant.max_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Staff limit of {tenant.max_members} seats reached for {tenant.plan_tier.upper()} plan. Please upgrade your subscription to invite more team members."
        )

    # Prefix based on role
    role_prefix = "TECH"
    if req.role == UserRole.SERVICE_ADVISOR:
        role_prefix = "ADV"
    elif req.role == UserRole.MANAGER:
        role_prefix = "MGR"
    elif req.role == UserRole.ADMIN:
        role_prefix = "ADM"

    code = generate_invite_code(role_prefix)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=req.expires_in_days)

    invite = TenantInvite(
        tenant_id=tenant.id,
        code=code,
        role=req.role,
        created_by_user_id=current_user.id,
        expires_at=expires_at,
        is_used=False,
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)

    return InviteResponse(
        id=invite.id,
        code=invite.code,
        role=invite.role,
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        is_used=invite.is_used,
    )

@router.get("/invites", response_model=List[InviteResponse])
def list_invites(
    current_user: User = Depends(require_role(UserRole.CAN_INVITE)),
    session: Session = Depends(get_session),
):
    """Lists all active and pending invitations for the manager/admin's workshop."""
    invites = session.exec(
        select(TenantInvite)
        .where(TenantInvite.tenant_id == current_user.tenant_id)
        .order_by(TenantInvite.created_at.desc())
    ).all()

    tenant = session.get(Tenant, current_user.tenant_id)
    tenant_name = tenant.name if tenant else None

    return [
        InviteResponse(
            id=inv.id,
            code=inv.code,
            role=inv.role,
            tenant_id=inv.tenant_id,
            tenant_name=tenant_name,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
            is_used=inv.is_used,
        )
        for inv in invites
    ]

@router.delete("/invites/{invite_id}")
def revoke_invite(
    invite_id: int,
    current_user: User = Depends(require_role(UserRole.CAN_INVITE)),
    session: Session = Depends(get_session),
):
    invite = session.get(TenantInvite, invite_id)
    if not invite or invite.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Invitation code not found.")

    session.delete(invite)
    session.commit()
    return {"status": "success", "message": "Invitation code revoked."}

@router.get("/members", response_model=List[MemberResponse])
def list_team_members(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lists all current active staff members in the workshop."""
    if not current_user.tenant_id:
        return []

    members = session.exec(
        select(User)
        .where(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at.asc())
    ).all()

    return [
        MemberResponse(
            id=m.id,
            username=m.username,
            email=m.email,
            full_name=m.full_name,
            role=m.role,
            created_at=m.created_at,
        )
        for m in members
    ]

@router.delete("/members/{member_id}")
def remove_team_member(
    member_id: int,
    current_user: User = Depends(require_role([UserRole.OWNER, UserRole.ADMIN])),
    session: Session = Depends(get_session),
):
    """Allows Owner and Admins to remove a staff member."""
    target_user = session.get(User, member_id)
    if not target_user or target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Team member not found.")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself.")

    if target_user.role == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove the Workshop Owner.")

    session.delete(target_user)
    session.commit()
    return {"status": "success", "message": f"User {target_user.username} removed from workshop."}
