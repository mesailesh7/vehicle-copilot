import stripe
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlmodel import Session, select
from app.config import settings
from app.models.tenant import Tenant

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

PLANS = {
    "starter": {
        "id": "starter",
        "name": "Starter Workshop",
        "price_monthly": 49.00,
        "description": "Essential diagnostic copilot and vehicle maintenance records for small service bays.",
        "max_vehicles": 15,
        "max_members": 3,
        "features": [
            "Up to 15 Active Vehicles",
            "Up to 3 Team Members (Techs & Advisors)",
            "AI Copilot Chat Assistant",
            "OBD-II DTC Freeze Frame Scanner",
            "Full Service History & Log Tracking",
            "Standard Diagnostic Guidance",
        ],
        "price_id_env": settings.stripe_price_id_starter,
    },
    "pro": {
        "id": "pro",
        "name": "Pro Workshop",
        "price_monthly": 149.00,
        "description": "Advanced AI diagnostics, OEM manual indexing, and shop knowledge base for growing auto shops.",
        "max_vehicles": 50,
        "max_members": 10,
        "badge": "Most Popular",
        "features": [
            "Up to 50 Active Vehicles",
            "Up to 10 Team Members (Admins, Techs, Advisors)",
            "AI Copilot with Vector Manual RAG (PDF Indexer)",
            "Shop Fixes Collective Knowledge Base",
            "Fast DTC AI Pinpoint Diagnostic Tests",
            "Staff Invitation Links & Role Management",
            "Priority AI Inference Speed",
        ],
        "price_id_env": settings.stripe_price_id_pro,
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise Fleet & Chain",
        "price_monthly": 299.00,
        "description": "High-volume multi-location franchises, dealership networks, and municipal fleet service centers.",
        "max_vehicles": 9999,
        "max_members": 9999,
        "badge": "High Volume",
        "features": [
            "Unlimited Fleet Vehicles",
            "Unlimited Team Seats (Multi-location)",
            "Dedicated Qdrant Vector Partitioning",
            "Centralized Multi-shop Knowledge Base Sync",
            "Custom OEM TSB / Service Bulletins Ingestion",
            "Dedicated Account Manager & 24/7 SLA",
            "Consolidated Enterprise Billing",
        ],
        "price_id_env": settings.stripe_price_id_enterprise,
    },
}

def get_plans_list() -> List[Dict[str, Any]]:
    return list(PLANS.values())

def get_plan(plan_tier: str) -> Dict[str, Any]:
    return PLANS.get(plan_tier.lower(), PLANS["starter"])

def is_stripe_configured() -> bool:
    return bool(settings.stripe_secret_key and not settings.stripe_secret_key.startswith("sk_test_dummy"))

def get_or_create_customer(tenant: Tenant, session: Session) -> str:
    if tenant.stripe_customer_id:
        return tenant.stripe_customer_id

    if not is_stripe_configured():
        fake_cust_id = f"cus_simulated_{tenant.slug}_{tenant.id}"
        tenant.stripe_customer_id = fake_cust_id
        session.add(tenant)
        session.commit()
        return fake_cust_id

    try:
        customer = stripe.Customer.create(
            name=tenant.name,
            metadata={"tenant_id": str(tenant.id), "tenant_slug": tenant.slug},
        )
        tenant.stripe_customer_id = customer.id
        session.add(tenant)
        session.commit()
        return customer.id
    except Exception as e:
        print(f"Stripe customer creation error: {e}")
        fake_cust_id = f"cus_simulated_{tenant.slug}_{tenant.id}"
        tenant.stripe_customer_id = fake_cust_id
        session.add(tenant)
        session.commit()
        return fake_cust_id

def create_checkout_session(
    tenant: Tenant,
    plan_tier: str,
    success_url: str,
    cancel_url: str,
    session: Session,
) -> Dict[str, Any]:
    plan = get_plan(plan_tier)
    customer_id = get_or_create_customer(tenant, session)

    if not is_stripe_configured():
        # Simulated Checkout URL for immediate dev / testing
        simulated_url = f"{success_url}?session_id=sim_cs_{tenant.id}_{plan_tier}&simulated=true&plan={plan_tier}"
        return {
            "url": simulated_url,
            "session_id": f"sim_cs_{tenant.id}_{plan_tier}",
            "is_simulated": True,
            "plan_tier": plan_tier,
        }

    try:
        price_id = plan.get("price_id_env")
        line_items = []
        if price_id:
            line_items.append({"price": price_id, "quantity": 1})
        else:
            line_items.append({
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Vehicle Copilot - {plan['name']}",
                        "description": plan["description"],
                    },
                    "unit_amount": int(plan["price_monthly"] * 100),
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            })

        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=line_items,
            mode="subscription",
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}&billing_success=true",
            cancel_url=cancel_url + "?billing_canceled=true",
            client_reference_id=str(tenant.id),
            metadata={
                "tenant_id": str(tenant.id),
                "plan_tier": plan_tier,
            },
        )
        return {
            "url": checkout_session.url,
            "session_id": checkout_session.id,
            "is_simulated": False,
            "plan_tier": plan_tier,
        }
    except Exception as e:
        print(f"Error creating Stripe checkout session: {e}")
        # Fallback to simulated checkout session
        simulated_url = f"{success_url}?session_id=sim_cs_{tenant.id}_{plan_tier}&simulated=true&plan={plan_tier}"
        return {
            "url": simulated_url,
            "session_id": f"sim_cs_{tenant.id}_{plan_tier}",
            "is_simulated": True,
            "plan_tier": plan_tier,
        }

def create_portal_session(tenant: Tenant, return_url: str, session: Session) -> Dict[str, Any]:
    customer_id = get_or_create_customer(tenant, session)

    if not is_stripe_configured():
        return {
            "url": f"{return_url}?portal_simulated=true",
            "is_simulated": True,
        }

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {
            "url": portal_session.url,
            "is_simulated": False,
        }
    except Exception as e:
        print(f"Error creating Stripe portal session: {e}")
        return {
            "url": f"{return_url}?portal_simulated=true",
            "is_simulated": True,
        }

def simulate_subscription_upgrade(tenant: Tenant, new_plan_tier: str, session: Session) -> Tenant:
    plan = get_plan(new_plan_tier)
    tenant.plan_tier = new_plan_tier
    tenant.subscription_status = "active"
    tenant.max_vehicles = plan["max_vehicles"]
    tenant.max_members = plan["max_members"]
    tenant.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant

def handle_stripe_webhook(payload: bytes, sig_header: str, session: Session) -> Dict[str, Any]:
    if not settings.stripe_webhook_secret:
        return {"status": "ignored", "reason": "No webhook secret configured"}

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise ValueError(f"Webhook signature verification failed: {e}")

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        tenant_id = data_object.get("client_reference_id") or data_object.get("metadata", {}).get("tenant_id")
        plan_tier = data_object.get("metadata", {}).get("plan_tier", "pro")
        subscription_id = data_object.get("subscription")

        if tenant_id:
            tenant = session.get(Tenant, int(tenant_id))
            if tenant:
                plan = get_plan(plan_tier)
                tenant.plan_tier = plan_tier
                tenant.subscription_status = "active"
                tenant.stripe_subscription_id = subscription_id
                tenant.max_vehicles = plan["max_vehicles"]
                tenant.max_members = plan["max_members"]
                tenant.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
                session.add(tenant)
                session.commit()

    elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
        subscription_id = data_object.get("id")
        status = data_object.get("status")
        customer_id = data_object.get("customer")

        tenant = session.exec(
            select(Tenant).where(
                (Tenant.stripe_subscription_id == subscription_id) |
                (Tenant.stripe_customer_id == customer_id)
            )
        ).first()

        if tenant:
            tenant.subscription_status = "active" if status in ["active", "trialing"] else status
            if status == "canceled":
                # Downgrade limits
                tenant.plan_tier = "starter"
                plan = get_plan("starter")
                tenant.max_vehicles = plan["max_vehicles"]
                tenant.max_members = plan["max_members"]
            session.add(tenant)
            session.commit()

    return {"status": "success", "event_type": event_type}
