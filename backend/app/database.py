import os
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session, select

sqlite_file_name = os.getenv("DATABASE_FILE", "vehicle_copilot.db")
if sqlite_file_name.startswith("sqlite://"):
    sqlite_url = sqlite_file_name
else:
    sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

def init_db():
    # Import all models so SQLModel metadata is fully populated
    from app.models.tenant import Tenant, TenantInvite
    from app.models.user import User
    from app.models.vehicle import Vehicle, ServiceLog
    from app.models.inspection import DTCScan, ShopFix

    SQLModel.metadata.create_all(engine)

    # Safe column migrations for SQLite if tables existed prior to multi-tenancy
    with Session(engine) as session:
        try:
            # Check and add tenant_id columns if missing
            alter_statements = [
                "ALTER TABLE vehicles ADD COLUMN tenant_id INTEGER DEFAULT 1",
                "ALTER TABLE service_logs ADD COLUMN tenant_id INTEGER DEFAULT 1",
                "ALTER TABLE users ADD COLUMN tenant_id INTEGER DEFAULT 1",
                "ALTER TABLE users ADD COLUMN email VARCHAR",
                "ALTER TABLE users ADD COLUMN full_name VARCHAR",
                "ALTER TABLE dtc_scans ADD COLUMN tenant_id INTEGER DEFAULT 1",
                "ALTER TABLE shop_fixes ADD COLUMN tenant_id INTEGER DEFAULT 1",
            ]
            for stmt in alter_statements:
                try:
                    session.connection().execute(text(stmt))
                    session.commit()
                except Exception:
                    # Column already exists or table is fresh
                    pass
        except Exception:
            pass

        # Ensure default workshop tenant exists
        existing_tenant = session.exec(select(Tenant).where(Tenant.id == 1)).first()
        if not existing_tenant:
            default_tenant = Tenant(
                id=1,
                name="Apex Diagnostics Workshop",
                slug="apex-workshop",
                plan_tier="pro",
                subscription_status="active",
                max_vehicles=50,
                max_members=10,
            )
            session.add(default_tenant)
            session.commit()

        # Ensure any orphan vehicles or users are assigned to tenant 1
        try:
            session.connection().execute(text("UPDATE vehicles SET tenant_id = 1 WHERE tenant_id IS NULL"))
            session.connection().execute(text("UPDATE service_logs SET tenant_id = 1 WHERE tenant_id IS NULL"))
            session.connection().execute(text("UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL"))
            session.commit()
        except Exception:
            pass

def get_session():
    with Session(engine) as session:
        yield session