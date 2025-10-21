#!/usr/bin/env python3
"""
Minimal FastAPI server to test Google Maps config endpoint
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print("🚀 Initializing TravelMate AI Simple Server...")

app = FastAPI(title="TravelMate AI Simple", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "healthy", "service": "TravelMate AI Agent (Simple)"}

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "service": "TravelMate AI Agent (Simple)",
        "port": os.environ.get("PORT", "8000"),
        "environment_vars": {
            "PORT": os.environ.get("PORT"),
            "VITE_GOOGLE_MAPS_API_KEY": bool(os.getenv("VITE_GOOGLE_MAPS_API_KEY")),
            "GOOGLE_MAPS_API_KEY": bool(os.getenv("GOOGLE_MAPS_API_KEY")),
        }
    }

@app.get("/api/public/google-maps-config")
async def get_google_maps_config():
    """
    Public endpoint to provide Google Maps configuration for frontend
    """
    print("📡 Google Maps config requested")
    
    # Try environment variables directly
    maps_api_key = (
        os.getenv("VITE_GOOGLE_MAPS_API_KEY") or 
        os.getenv("GOOGLE_MAPS_API_KEY") or
        "AIzaSyDiAZy9RIGFTiALDJgcH8j-GGaiUfzl9sQ"  # Fallback for testing
    )
    
    maps_map_id = (
        os.getenv("VITE_GOOGLE_MAPS_MAP_ID") or 
        os.getenv("GOOGLE_MAPS_MAP_ID") or
        "test-map-id"
    )
    
    print(f"🔑 Returning Google Maps config with API key: {maps_api_key[:10]}...")
    
    return {
        "apiKey": maps_api_key,
        "mapId": maps_map_id,
        "libraries": ["places", "geometry", "drawing"],
        "version": "weekly"
    }

def start_server():
    """Start the server"""
    try:
        port = int(os.environ.get("PORT", "8000"))
    except (ValueError, TypeError):
        port = 8000
        
    print(f"🚀 Starting TravelMate AI Simple Server on port {port}")
    print(f"🌐 Host: 0.0.0.0:{port}")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    start_server()