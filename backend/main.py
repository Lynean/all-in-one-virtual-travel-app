from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

from config import settings
from services.agent_service import AgentService
from services.redis_service import RedisService
from models.requests import ChatRequest, SessionRequest
from models.responses import ChatResponse, SessionResponse

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global services
redis_service: RedisService = None
agent_service: AgentService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown"""
    global redis_service, agent_service
    
    logger.info("Starting TravelMate AI Agent Backend (Gemini-Powered)...")
    
    # Initialize Redis (optional)
    redis_service = RedisService()
    try:
        await redis_service.connect()
        logger.info("✅ Redis connected")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed: {e}")
        logger.warning("⚠️ Running without Redis (sessions will use in-memory storage)")
        redis_service = None
    
    # Initialize Agent Service with Gemini
    agent_service = AgentService(redis_service)
    logger.info("✅ Gemini agent service initialized")
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI Agent Backend...")
    if redis_service:
        await redis_service.disconnect()


app = FastAPI(
    title="TravelMate AI Agent (Gemini)",
    description="LangChain + Gemini-2.5-Flash powered AI travel assistant",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "TravelMate AI Agent",
        "version": "2.0.0",
        "model": "gemini-2.5-flash",
        "environment": settings.environment
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Check Redis connection
        redis_healthy = await redis_service.ping()
        
        return {
            "status": "healthy",
            "services": {
                "redis": "connected" if redis_healthy else "disconnected",
                "agent": "operational",
                "model": "gemini-2.5-flash"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for Gemini agent interactions
    
    Args:
        request: ChatRequest with user_id, session_id, message, and optional context
    
    Returns:
        ChatResponse with agent's response and any map actions
    """
    try:
        logger.info(f"Chat request from user {request.user_id}, session {request.session_id}")
        
        response = await agent_service.process_message(
            user_id=request.user_id,
            session_id=request.session_id,
            message=request.message,
            context=request.context
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/api/session/create", response_model=SessionResponse)
async def create_session(request: SessionRequest):
    """
    Create a new chat session
    
    Args:
        request: SessionRequest with user_id and optional metadata
    
    Returns:
        SessionResponse with session_id and status
    """
    try:
        session_id = await agent_service.create_session(
            user_id=request.user_id,
            metadata=request.metadata
        )
        
        return SessionResponse(
            session_id=session_id,
            user_id=request.user_id,
            status="created"
        )
        
    except Exception as e:
        logger.error(f"Session creation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Session error: {str(e)}")


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str, user_id: str):
    """
    Delete a chat session
    
    Args:
        session_id: Session identifier
        user_id: User identifier for authorization
    
    Returns:
        Success status
    """
    try:
        await agent_service.delete_session(session_id, user_id)
        return {"status": "deleted", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Session deletion error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Session error: {str(e)}")


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str):
    """
    WebSocket endpoint for real-time chat with Gemini agent
    
    Args:
        websocket: WebSocket connection
        user_id: User identifier
        session_id: Session identifier
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: user {user_id}, session {session_id}")
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            message = data.get("message", "")
            context = data.get("context", {})
            
            # Process with Gemini agent
            response = await agent_service.process_message(
                user_id=user_id,
                session_id=session_id,
                message=message,
                context=context
            )
            
            # Send response
            await websocket.send_json(response.dict())
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user {user_id}, session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)
        await websocket.close(code=1011, reason=str(e))


if __name__ == "__main__":
    import uvicorn
    from datetime import datetime
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development"
    )
