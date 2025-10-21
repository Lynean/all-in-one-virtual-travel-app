from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # API Keys - Required
    gemini_api_key: str
    google_maps_api_key: str
    
    # Frontend API Keys (VITE_ prefixed for frontend)
    vite_google_maps_api_key: str = ""
    vite_google_maps_map_id: str = ""
    
    # API Keys - Optional (not currently used in the app)
    openweather_api_key: str = ""
    exchangerate_api_key: str = ""
    google_translate_api_key: str = ""
    
    # Redis - Railway provides REDIS_URL, fallback to localhost for local dev
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_password: str = ""
    
    # Application - Auto-detect Railway environment
    environment: str = "production" if os.getenv("RAILWAY_ENVIRONMENT") else "development"
    log_level: str = "INFO"
    
    # CORS - Support both local and deployed frontends  
    def get_cors_origins(self) -> List[str]:
        if self.environment == "production":
            return ["*"]  # Allow all origins in production
        return [
            "http://localhost:5173",
            "http://localhost:3000", 
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
    
    # Session
    session_ttl: int = 86400  # 24 hours
    
    # Rate Limiting
    rate_limit_per_minute: int = 10
    rate_limit_per_hour: int = 100
    
    # LLM Configuration
    primary_model: str = "gemini-2.5-flash"
    max_tokens: int = 4000  # Increased for comprehensive checklists
    temperature: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # Allow Railway environment variables to override .env
        env_file_encoding = 'utf-8'
        extra = 'allow'  # Allow extra fields for environment variables


settings = Settings()
