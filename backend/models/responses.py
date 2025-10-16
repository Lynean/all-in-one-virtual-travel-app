from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class MapAction(BaseModel):
    """Map action to be executed on frontend"""
    type: str = Field(..., description="Action type: search, directions, marker, zoom")
    data: Dict[str, Any] = Field(..., description="Action-specific data")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., description="Agent's response message")
    map_actions: List[MapAction] = Field(
        default_factory=list,
        description="Map actions to execute"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional response metadata"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )


class SessionResponse(BaseModel):
    """Response model for session operations"""
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="User identifier")
    status: str = Field(..., description="Session status")
    created_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        description="Session creation timestamp"
    )
