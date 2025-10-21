#!/usr/bin/env python3
"""
CLI script to list API keys stored in Redis.

Usage:
    python redis_list_keys.py
"""

import sys
import asyncio
from services.redis_service import RedisService
from config import settings


async def main():
    print("📋 API Keys in Redis Database")
    print(f"Redis URL: {settings.redis_url}")
    print("=" * 80)
    
    redis_service = RedisService()
    
    try:
        # Connect to Redis
        await redis_service.connect()
        print("✅ Connected to Redis\n")
        
        # Get all API keys
        api_keys = await redis_service.list_api_keys()
        
        if not api_keys:
            print("No API keys found in Redis.")
            return
        
        for key_name, key_value in api_keys.items():
            # Mask the value for security
            if key_value and len(key_value) > 8:
                masked_value = f"{key_value[:6]}...{key_value[-4:]}"
            else:
                masked_value = "***"
            
            print(f"🔑 {key_name}")
            print(f"   Value: {masked_value}")
            print(f"   Length: {len(key_value)} characters")
            print()
        
        print(f"📊 Total keys: {len(api_keys)}")
        
        # Check for required Google Maps keys
        print("\n🗺️  Google Maps Keys Status:")
        required_keys = ["VITE_GOOGLE_MAPS_API_KEY", "VITE_GOOGLE_MAPS_MAP_ID"]
        for req_key in required_keys:
            status = "✅ Found" if req_key in api_keys else "❌ Missing"
            print(f"   {req_key}: {status}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        await redis_service.disconnect()
        print("\n🔌 Disconnected from Redis")


if __name__ == "__main__":
    asyncio.run(main())