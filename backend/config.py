from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API Keys
    gemini_api_key: str
    openweather_api_key: str
    exchangerate_api_key: str
    google_translate_api_key: str
    google_maps_api_key: str
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_password: str = ""
    
    # Application
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Session
    session_ttl: int = 86400  # 24 hours
    
    # Rate Limiting
    rate_limit_per_minute: int = 10
    rate_limit_per_hour: int = 100
    
    # LLM Configuration
    primary_model: str = "gemini-2.5-flash"
    max_tokens: int = 2000
    temperature: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
