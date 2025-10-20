from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class APIKeyCreate(BaseModel):
    key_name: str = Field(..., description="Name of the API key (e.g., 'gemini_api_key')")
    key_value: str = Field(..., description="The actual API key value")
    description: Optional[str] = Field(None, description="Optional description")


class APIKeyUpdate(BaseModel):
    key_value: Optional[str] = None
    description: Optional[str] = None


class APIKeyResponse(BaseModel):
    key_name: str
    description: Optional[str]
    masked_value: str
    created_at: datetime
    updated_at: datetime
    is_active: bool


class APIKeyList(BaseModel):
    keys: list[APIKeyResponse]
    total: int
