#!/usr/bin/env python3
"""
CLI script to add API keys to Redis database.
This connects to your Redis instance and stores keys.

Usage:
    python redis_add_key.py <key_name> <key_value>

Example:
    python redis_add_key.py VITE_GOOGLE_MAPS_API_KEY "AIza..."
"""

import sys
import asyncio
from services.redis_service import RedisService
from config import settings


async def main():
    if len(sys.argv) != 3:
        print("Usage: python redis_add_key.py <key_name> <key_value>")
        print("\nExample:")
        print('  python redis_add_key.py VITE_GOOGLE_MAPS_API_KEY "AIza..."')
        sys.exit(1)
    
    key_name = sys.argv[1]
    key_value = sys.argv[2]
    
    print(f"Adding API key to Redis: {key_name}")
    print(f"Redis URL: {settings.redis_url}")
    print("-" * 50)
    
    redis_service = RedisService()
    
    try:
        # Connect to Redis
        await redis_service.connect()
        print("✅ Connected to Redis")
        
        # Store the API key
        await redis_service.set_api_key(key_name, key_value)
        print(f"✅ Successfully stored key: {key_name}")
        
        # Verify it was stored
        retrieved_value = await redis_service.get_api_key(key_name)
        if retrieved_value == key_value:
            print("✅ Verification successful - key stored correctly")
        else:
            print("❌ Verification failed - key not stored correctly")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        await redis_service.disconnect()
        print("🔌 Disconnected from Redis")


if __name__ == "__main__":
    asyncio.run(main())