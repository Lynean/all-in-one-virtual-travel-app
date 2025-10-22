from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any
import os

from config import settings
from services.agent_service import AgentService
from services.redis_service import RedisService
from services.backend_places_service import (
    get_places_service,
    PlaceSearchRequest,
    PlaceResult
)
from services.backend_routes_service import (
    get_routes_service,
    RouteRequest,
    RouteResult
)
from models.requests import ChatRequest, SessionRequest
from models.responses import ChatResponse, SessionResponse
from routers import admin

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
    
    logger.info("🚀 Starting backend services...")
    
    # Check critical environment variables
    if not settings.gemini_api_key:
        logger.error("❌ GEMINI_API_KEY not set!")
    
    # Initialize Redis with timeout
    redis_service = RedisService()
    try:
        logger.info("📡 Connecting to Redis...")
        await redis_service.connect()
        logger.info("✅ Redis connected successfully")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed: {e}")
        logger.warning("⚠️ Continuing without Redis (will use in-memory storage)")
        redis_service = None
    
    # Initialize Agent Service with Gemini
    try:
        logger.info("🤖 Initializing Agent Service...")
        agent_service = AgentService(redis_service)
        logger.info("✅ Agent Service initialized")
    except Exception as e:
        logger.error(f"❌ Agent Service initialization failed: {e}")
        agent_service = None
    
    logger.info("✅ Backend startup complete")
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down backend services...")
    if redis_service:
        await redis_service.disconnect()
    logger.info("✅ Backend shutdown complete")


app = FastAPI(
    title="TravelMate AI Agent (Gemini)",
    description="LangChain + Gemini-2.5-Flash powered AI travel assistant",
    version="2.0.0",
    lifespan=lifespan
)

# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "body": str(exc.body) if hasattr(exc, 'body') else None
        }
    )

# Add middleware to handle private network access (only for development)
if settings.environment == "development":
    @app.middleware("http")
    async def add_private_network_access_headers(request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Include admin router
app.include_router(admin.router)


@app.get("/api/public/google-maps-config")
async def get_google_maps_config():
    """
    Public endpoint to provide Google Maps configuration for frontend
    Returns API key needed for Google Maps integration
    """
    try:
        maps_api_key = None
        
        # Try Redis first (with timeout protection)
        if redis_service and redis_service.client:
            try:
                import asyncio
                # Add 2 second timeout to prevent hanging
                maps_api_key = await asyncio.wait_for(
                    redis_service.get_api_key("VITE_GOOGLE_MAPS_API_KEY"),
                    timeout=2.0
                )
                logger.info("✅ Got Maps API key from Redis")
            except asyncio.TimeoutError:
                logger.warning("⚠️ Redis timeout - falling back to environment")
                maps_api_key = None
            except Exception as e:
                logger.warning(f"⚠️ Redis error: {e} - falling back to environment")
                maps_api_key = None
        
        # Fallback to environment variables
        if not maps_api_key:
            maps_api_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
            if maps_api_key:
                logger.info("✅ Got Maps API key from environment")
        
        if not maps_api_key:
            logger.error("❌ No Google Maps API key found!")
            raise HTTPException(
                status_code=503, 
                detail="Google Maps API key not configured. Please check environment variables."
            )
        
        config = {
            "apiKey": maps_api_key,
            "libraries": ["places", "geometry", "drawing"],
            "version": "weekly"
        }
        
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving Google Maps config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve Google Maps configuration: {str(e)}")


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
        from datetime import datetime
        import asyncio
        
        # Check Redis connection with timeout
        redis_healthy = False
        redis_error = None
        if redis_service and redis_service.client:
            try:
                redis_healthy = await asyncio.wait_for(
                    redis_service.ping(),
                    timeout=2.0
                )
            except asyncio.TimeoutError:
                redis_error = "Connection timeout"
            except Exception as e:
                redis_error = str(e)
        
        # Check for API keys
        maps_key_available = bool(
            os.getenv("VITE_GOOGLE_MAPS_API_KEY") or 
            os.getenv("GOOGLE_MAPS_API_KEY")
        )
        
        gemini_key_available = bool(settings.gemini_api_key)
        
        return {
            "status": "healthy",
            "services": {
                "redis": {
                    "connected": redis_healthy,
                    "error": redis_error,
                    "url": settings.redis_url.split('@')[-1] if '@' in settings.redis_url else settings.redis_url
                },
                "agent": "operational" if agent_service else "unavailable",
                "model": "gemini-2.5-flash"
            },
            "configuration": {
                "environment": settings.environment,
                "maps_key_available": maps_key_available,
                "gemini_key_available": gemini_key_available,
                "redis_url_set": bool(os.getenv("REDIS_URL")),
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint for Gemini agent interactions"""
    try:
        if not agent_service:
            raise HTTPException(
                status_code=503,
                detail="Agent service unavailable. Please check logs."
            )
        
        # Validate required fields
        if not request.user_id:
            raise HTTPException(status_code=422, detail="user_id is required")
        if not request.session_id:
            raise HTTPException(status_code=422, detail="session_id is required")
        if not request.message:
            raise HTTPException(status_code=422, detail="message is required")
        
        response = await agent_service.process_message(
            user_id=request.user_id,
            session_id=request.session_id,
            message=request.message,
            context=request.context
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/api/session/create", response_model=SessionResponse)
async def create_session(request: SessionRequest):
    """Create a new chat session"""
    try:
        if not agent_service:
            raise HTTPException(
                status_code=503,
                detail="Agent service unavailable"
            )
        
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
    """Delete a chat session"""
    try:
        if not agent_service:
            raise HTTPException(
                status_code=503,
                detail="Agent service unavailable"
            )
        
        await agent_service.delete_session(session_id, user_id)
        return {"status": "deleted", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Session deletion error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Session error: {str(e)}")


# Map API Endpoints
@app.post("/api/maps/places/search")
async def search_places(request: PlaceSearchRequest):
    """Search for places using Google Places API (server-side)"""
    try:
        places_service = get_places_service()
        results = await places_service.search_text(request)
        
        return {
            "results": [result.dict() for result in results],
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Places search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/maps/places/nearby")
async def search_nearby_places(
    latitude: float,
    longitude: float,
    radius: int = 5000,
    types: str = None
):
    """Search for nearby places (server-side)"""
    try:
        places_service = get_places_service()
        included_types = types.split(",") if types else None
        
        results = await places_service.search_nearby(
            latitude=latitude,
            longitude=longitude,
            radius=radius,
            included_types=included_types
        )
        
        return {
            "results": [result.dict() for result in results],
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Nearby search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/maps/routes/compute")
async def compute_routes(request: RouteRequest):
    """Compute routes using Google Routes API (server-side)"""
    try:
        routes_service = get_routes_service()
        result = await routes_service.compute_routes(request)
        
        if not result:
            raise HTTPException(status_code=404, detail="No route found")
        
        return result.dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Routes compute error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))