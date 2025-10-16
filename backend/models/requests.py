from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    user_id: str = Field(..., description="Unique user identifier")
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., description="User's message")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional context (location, preferences, etc.)"
    )


class SessionRequest(BaseModel):
    """Request model for session creation"""
    user_id: str = Field(..., description="Unique user identifier")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Session metadata"
    )
