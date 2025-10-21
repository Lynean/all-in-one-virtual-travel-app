#!/usr/bin/env python3
"""
Railway startup script for TravelMate AI Agent Backend
"""
import os
import uvicorn
from main import app

def start_server():
    """Start the FastAPI server with Railway configuration"""
    # Get port from environment, fallback to 8000
    try:
        port = int(os.environ.get("PORT", "8000"))
    except (ValueError, TypeError):
        port = 8000
    
    print(f"🚀 Starting TravelMate AI server on port {port}")
    print(f"🔧 PORT environment variable: {os.environ.get('PORT', 'not set')}")
    print(f"🌐 Host: 0.0.0.0:{port}")
    
    # Start uvicorn server
    uvicorn.run(
        app,  # Use the app directly
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    start_server()