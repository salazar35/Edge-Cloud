from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Edge Cloud - K8s Management Platform"
    debug: bool = True
    database_url: str = "sqlite+aiosqlite:///./edge_cloud.db"
    cors_origins: list[str] = ["*"]  # Allow all origins in development
    health_check_interval: int = 30  # seconds

    class Config:
        env_file = ".env"
        env_prefix = "EDGE_CLOUD_"


settings = Settings()
