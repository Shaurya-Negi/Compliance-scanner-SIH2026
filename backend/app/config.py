"""
Configuration settings for the SIH26034 Compliance Scanner API
Uses Pydantic Settings to load from environment variables
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BASE_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from .env file"""

    # Groq API
    GROQ_API_KEY: str = "demo_groq_api_key"
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    # Database
    DATABASE_URL: str = "sqlite:///./sih2026.db"

    # JWT Authentication
    JWT_SECRET_KEY: str = "sih2026_super_secret_jwt_key_hackathon_demo"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # App Settings
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # File Storage
    UPLOAD_DIR: str = str(_BASE_DIR / "uploads")
    REPORT_DIR: str = str(_BASE_DIR / "reports")
    MAX_UPLOAD_SIZE_MB: int = 10

    @property
    def cors_origins_list(self) -> list:
        """Parse comma-separated CORS_ORIGINS into a clean list"""
        if isinstance(self.CORS_ORIGINS, str):
            origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
            # Ensure local dev origins are always included
            for default_origin in [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8000",
                "http://127.0.0.1:8000"
            ]:
                if default_origin not in origins:
                    origins.append(default_origin)
            return origins
        return self.CORS_ORIGINS

    model_config = SettingsConfigDict(
        env_file=(str(_ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )


# Global settings instance
settings = Settings()
