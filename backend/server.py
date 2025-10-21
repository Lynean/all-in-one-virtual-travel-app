#!/usr/bin/env python3
"""
Railway startup script for TravelMate AI Agent Backend
"""
import os
import uvicorn
import asyncio
from main import app

async def test_redis_keys():
    """Test Redis connection and check for API keys"""
    try:
        from services.redis_service import RedisService
        
        print("🔍 Testing Redis connection and API keys...")
        redis_service = RedisService()
        await redis_service.connect()
        
        if redis_service.client:
            # Test basic connection
            ping_result = await redis_service.ping()
            print(f"   Redis ping: {'✅ Success' if ping_result else '❌ Failed'}")
            
            # List all keys
            keys = await redis_service.client.keys("*")
            print(f"   Total Redis keys: {len(keys)}")
            for key in keys:
                print(f"     - {key}")
            
            # Check specific API keys
            google_key = await redis_service.get_api_key("VITE_GOOGLE_MAPS_API_KEY")
            map_id = await redis_service.get_api_key("VITE_GOOGLE_MAPS_MAP_ID")
            
            print(f"   Google Maps API Key: {'✅ Found' if google_key else '❌ Not found'}")
            print(f"   Google Maps Map ID: {'✅ Found' if map_id else '❌ Not found'}")
            
            await redis_service.disconnect()
        else:
            print("   ❌ Redis client not available")
            
    except Exception as e:
        print(f"   ❌ Redis test failed: {e}")

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
    
    # Test Redis before starting server
    try:
        asyncio.run(test_redis_keys())
    except Exception as e:
        print(f"⚠️  Redis test failed: {e}")
    
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