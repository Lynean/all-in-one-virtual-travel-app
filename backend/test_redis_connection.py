#!/usr/bin/env python3
"""
Test Redis connection to Railway Redis instance
"""
import asyncio
import os
from services.redis_service import RedisService

async def test_redis():
    """Test Redis connection and API keys"""
    print("🔍 Testing Redis connection...")
    
    # Check environment variables
    redis_url = os.getenv("REDIS_URL")
    print(f"Redis URL: {redis_url}")
    
    redis_service = RedisService()
    
    try:
        await redis_service.connect()
        
        if redis_service.client:
            # Test basic connection
            ping_result = await redis_service.ping()
            print(f"Redis ping: {'✅ Success' if ping_result else '❌ Failed'}")
            
            # List all keys
            keys = await redis_service.client.keys("*")
            print(f"Total Redis keys: {len(keys)}")
            
            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                value = await redis_service.client.get(key)
                value_str = value.decode() if isinstance(value, bytes) else value
                print(f"  {key_str}: {value_str}")
            
            # Test specific API key retrieval
            google_key = await redis_service.get_api_key("VITE_GOOGLE_MAPS_API_KEY")
            map_id = await redis_service.get_api_key("VITE_GOOGLE_MAPS_MAP_ID")
            
            print(f"\nAPI Key Tests:")
            print(f"Google Maps API Key: {google_key[:10] + '...' if google_key else 'Not found'}")
            print(f"Google Maps Map ID: {map_id[:10] + '...' if map_id else 'Not found'}")
            
        else:
            print("❌ Redis client not available")
            
        await redis_service.disconnect()
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_redis())