from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str = ""
    qdrant_api_key: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_name: str = "vehicle_manuals"
    
    # Auth & Multi-Tenancy
    jwt_secret: str = "auto-copilot-saas-dashboard-super-secret-key-13579"
    frontend_url: str = "http://localhost:3000"
    
    # Stripe Billing
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_starter: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_enterprise: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
