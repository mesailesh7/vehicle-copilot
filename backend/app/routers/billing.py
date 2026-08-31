from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select, func

from app.database import get_session
from app.config import settings
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.routers.auth import get_current_user
from app.services.stripe_service import (
    get_plans_list,
    get_plan,
    create_checkout_session,
    create_portal_session,
    simulate_subscription_upgrade,
    handle_stripe_webhook,
    is_stripe_configured,
)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

class CheckoutRequest(BaseModel):
    plan_tier: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class PortalRequest(BaseModel):
    return_url: Optional[str] = None

class SimulatePlanRequest(BaseModel):
    plan_tier: str

@router.get("/plans")
def list_available_plans():
    return {
        "plans": get_plans_list(),
        "stripe_live_mode": is_stripe_configured(),
    }

@router.get("/subscription")
def get_current_subscription(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to any workshop organization.",
        )

    tenant = session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop organization not found.",
        )

    # Calculate resource usages
    vehicle_count = session.exec(
        select(func.count(Vehicle.id)).where(Vehicle.tenant_id == tenant.id)
    ).one()

    member_count = session.exec(
        select(func.count(User.id)).where(User.tenant_id == tenant.id)
    ).one()

    plan_info = get_plan(tenant.plan_tier)

    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "tenant_slug": tenant.slug,
        "plan_tier": tenant.plan_tier,
        "plan_name": plan_info["name"],
        "plan_price_monthly": plan_info["price_monthly"],
        "subscription_status": tenant.subscription_status,
        "current_period_end": tenant.current_period_end,
        "max_vehicles": tenant.max_vehicles,
        "max_members": tenant.max_members,
        "vehicle_count": vehicle_count,
        "member_count": member_count,
        "has_stripe_customer": bool(tenant.stripe_customer_id),
        "stripe_configured": is_stripe_configured(),
    }

@router.post("/create-checkout-session")
def create_checkout(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Workshop Owners and Admins can manage billing subscriptions.",
        )

    tenant = session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Workshop organization not found.")

    success_url = req.success_url or f"{settings.frontend_url}/?billing_success=true"
    cancel_url = req.cancel_url or f"{settings.frontend_url}/?billing_canceled=true"

    result = create_checkout_session(
        tenant=tenant,
        plan_tier=req.plan_tier,
        success_url=success_url,
        cancel_url=cancel_url,
        session=session,
    )
    return result

@router.post("/create-portal-session")
def create_portal(
    req: PortalRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Workshop Owners and Admins can access the customer portal.",
        )

    tenant = session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Workshop organization not found.")

    return_url = req.return_url or settings.frontend_url
    result = create_portal_session(tenant=tenant, return_url=return_url, session=session)
    return result

@router.post("/simulate")
def simulate_plan_change(
    req: SimulatePlanRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Allows instant switching between subscription tiers for fast local testing and demoing."""
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Workshop Owners and Admins can simulate plan changes.",
        )

    tenant = session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Workshop organization not found.")

    updated_tenant = simulate_subscription_upgrade(tenant, req.plan_tier, session)
    return {
        "status": "success",
        "message": f"Successfully updated subscription to {req.plan_tier.upper()} plan.",
        "tenant_id": updated_tenant.id,
        "plan_tier": updated_tenant.plan_tier,
        "max_vehicles": updated_tenant.max_vehicles,
        "max_members": updated_tenant.max_members,
        "subscription_status": updated_tenant.subscription_status,
    }

@router.post("/webhook")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = handle_stripe_webhook(payload, sig_header, session)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing error: {e}")
