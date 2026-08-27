from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_name: str = "vehicle_manuals"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
