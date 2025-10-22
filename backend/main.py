from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from typing import Dict, Any

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
    
    # Check critical environment variables
    import os
    
    # Initialize Redis
    redis_service = RedisService()
    try:
        await redis_service.connect()
        
    except Exception as e:
        redis_service = None
    
    # Initialize Agent Service with Gemini
    try:
        agent_service = AgentService(redis_service)
    except Exception as e:
        # Allow app to start without agent service
        agent_service = None
    
    yield
    
    # Cleanup
    if redis_service:
        await redis_service.disconnect()


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
        # Allow requests from public sites to private networks (for development)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

# CORS middleware - MUST be before routes
# Configured to allow requests from specific external domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),  # Use origins from config
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
        
        if redis_service and redis_service.client:
            # Try to get from Redis first
            maps_api_key = await redis_service.get_api_key("VITE_GOOGLE_MAPS_API_KEY")
            map_id = await redis_service.get_api_key("GOOGLE_MAPS_MAP_ID")
        # Fallback to environment variables if Redis fails
        if not maps_api_key:
            import os
            maps_api_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
        
        if not maps_api_key:
            raise HTTPException(
                status_code=503, 
                detail="Google Maps API key not configured. Please check Redis connection or environment variables."
            )
        
        config = {
            "apiKey": maps_api_key,
            "mapId": map_id,
            "libraries": ["places", "geometry", "drawing"],
            "version": "weekly"
        }
        
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve Google Maps configuration: {str(e)}")


@app.get("/api/public/debug/redis-keys")
async def debug_redis_keys():
    """
    Debug endpoint to check Redis API keys
    """
    try:
        if not redis_service:
            return {"redis_connected": False, "error": "Redis service not available"}
        
        # Test Redis connection
        ping_result = await redis_service.ping()
        
        if not ping_result:
            return {"redis_connected": False, "error": "Redis ping failed"}
        
        # Get all API keys
        api_keys = await redis_service.list_api_keys()
        
        # Mask the key values for security
        masked_keys = {}
        for key_name, key_value in api_keys.items():
            if key_value and len(key_value) > 8:
                masked_keys[key_name] = f"{key_value[:4]}...{key_value[-4:]}"
            else:
                masked_keys[key_name] = "***"
        
        return {
            "redis_connected": True,
            "api_keys_found": len(api_keys),
            "keys": masked_keys,
            "required_keys": {
                "VITE_GOOGLE_MAPS_API_KEY": "VITE_GOOGLE_MAPS_API_KEY" in api_keys
            }
        }
    except Exception as e:
        return {
            "redis_connected": False,
            "error": str(e)
        }


@app.post("/api/debug/chat-validate")
async def debug_chat_validate(request_data: dict):
    """
    Debug endpoint to validate chat request format
    """
    try:
        
        # Try to validate the request
        chat_request = ChatRequest(**request_data)
        
        return {
            "status": "valid",
            "parsed_request": {
                "user_id": chat_request.user_id,
                "session_id": chat_request.session_id,
                "message": chat_request.message,
                "context": chat_request.context
            }
        }
    except Exception as e:
        logger.error(f"Chat validation error: {e}")
        return {
            "status": "invalid",
            "error": str(e),
            "received_data": request_data
        }


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
        import os
        
        # Check Redis connection
        redis_healthy = False
        redis_error = None
        if redis_service:
            try:
                redis_healthy = await redis_service.ping() if redis_service.client else False
            except Exception as e:
                redis_error = str(e)
        
        # Check for API keys
        maps_key_available = bool(
            (redis_service and redis_service.client and await redis_service.get_api_key("VITE_GOOGLE_MAPS_API_KEY")) or
            os.getenv("VITE_GOOGLE_MAPS_API_KEY") or 
            os.getenv("GOOGLE_MAPS_API_KEY")
        )
        
        return {
            "status": "healthy",
            "services": {
                "redis": {
                    "connected": redis_healthy,
                    "error": redis_error,
                    "url": settings.redis_url.split('@')[-1] if '@' in settings.redis_url else settings.redis_url
                },
                "agent": "operational",
                "model": "gemini-2.5-flash"
            },
            "configuration": {
                "environment": settings.environment,
                "maps_key_available": maps_key_available,
                "redis_url_set": bool(os.getenv("REDIS_URL")),
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


# ============================================================================
# Map API Endpoints - Backend processes Google Maps API calls
# ============================================================================

@app.post("/api/maps/places/search")
async def search_places(request: PlaceSearchRequest):
    """
    Search for places using Google Places API (server-side)
    Frontend sends search parameters, backend calls Google API and returns results
    
    Args:
        request: PlaceSearchRequest with query, location, filters
    
    Returns:
        List of PlaceResult objects with place data
    """
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
    types: str = None  # Comma-separated list
):
    """
    Search for nearby places (server-side)
    
    Args:
        latitude: Center latitude
        longitude: Center longitude
        radius: Search radius in meters (default 5000)
        types: Comma-separated place types (optional)
    
    Returns:
        List of nearby places
    """
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


@app.get("/api/maps/places/{place_id}")
async def get_place_details(place_id: str):
    """
    Get detailed information about a specific place (server-side)
    
    Args:
        place_id: Google Place ID
    
    Returns:
        Detailed place information
    """
    try:
        places_service = get_places_service()
        details = await places_service.get_place_details(place_id)
        
        if not details:
            raise HTTPException(status_code=404, detail="Place not found")
        
        return details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Place details error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/maps/routes/compute")
async def compute_routes(request: RouteRequest):
    """
    Compute routes using Google Routes API (server-side)
    Frontend sends origin/destination, backend calls Google API and returns route data
    
    Args:
        request: RouteRequest with origin, destination, waypoints, travel mode
    
    Returns:
        RouteResult with legs, polyline, distance, duration
    """
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


# Note: Server startup is handled by server.py for Railway deployment
