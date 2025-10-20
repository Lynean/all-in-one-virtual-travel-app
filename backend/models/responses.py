from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime


class MapAction(BaseModel):
    """Map action to be executed on frontend"""
    type: str = Field(..., description="Action type: search, directions, marker, zoom")
    data: Dict[str, Any] = Field(..., description="Action-specific data")


class AppAction(BaseModel):
    """App action to be executed on frontend (checklists, buttons, etc.)"""
    type: str = Field(..., description="Action type: checklist, quick_reply, button_group, etc.")
    data: Dict[str, Any] = Field(..., description="Action-specific data")


class ClarificationRequest(BaseModel):
    """Request for user clarification"""
    branch: str = Field(..., description="Branch that needs clarification")
    question: str = Field(..., description="Question to ask the user")
    type: Literal["text", "multiple_choice", "yes_no"] = Field(..., description="Type of clarification")
    options: Optional[List[str]] = Field(None, description="Options for multiple choice")
    default: Optional[str] = Field(None, description="Default value if user doesn't respond")
    timeout: int = Field(30, description="Timeout in seconds before using default")


class BranchDecision(BaseModel):
    """Decision about whether to enable a branch"""
    branch: str = Field(..., description="Branch name: routes, places, checklist, text")
    enabled: bool = Field(..., description="Whether this branch should execute")
    confidence: float = Field(..., description="Confidence score 0.0-1.0")
    needs_clarification: bool = Field(False, description="Whether clarification is needed")
    clarification: Optional[ClarificationRequest] = Field(None, description="Clarification request if needed")
    priority: int = Field(1, description="Execution priority (1=highest)")
    reasoning: Optional[str] = Field(None, description="Why this branch was enabled/disabled")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., description="Agent's response message")
    map_actions: List[MapAction] = Field(
        default_factory=list,
        description="Map actions to execute"
    )
    app_actions: List[AppAction] = Field(
        default_factory=list,
        description="App actions to execute (checklists, buttons, etc.)"
    )
    clarifications: List[ClarificationRequest] = Field(
        default_factory=list,
        description="Clarifications needed from user"
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="Helpful suggestions for next actions"
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
