#!/usr/bin/env python3
"""
Minimal FastAPI server to test Google Maps config endpoint
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TravelMate AI Simple", version="1.0.0")

# CORS - Allow all origins
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
    
    return {
        "apiKey": maps_api_key,
        "mapId": maps_map_id,
        "libraries": ["places", "geometry", "drawing"],
        "version": "weekly"
    }
