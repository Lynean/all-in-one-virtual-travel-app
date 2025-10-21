#!/usr/bin/env python3
"""
Script to add Google Maps API key directly to Railway Redis.
This connects to your production Redis and stores the API key.

Usage:
    python railway_add_key.py
"""

import asyncio
import redis.asyncio as redis
import os


async def add_google_maps_key():
    """Add Google Maps API key to Railway Redis"""
    
    # Railway Redis connection (from your logs)
    redis_url = "redis://default:spHMoLLtpZmowhprwFAAwqQxuvYhLzIU@switchyard.proxy.rlwy.net:34378"
    
    print("🔗 Connecting to Railway Redis...")
    print(f"   URL: switchyard.proxy.rlwy.net:34378")
    
    try:
        # Connect to Redis
        client = await redis.from_url(
            redis_url,
            encoding="utf-8", 
            decode_responses=True,
            socket_connect_timeout=10
        )
        
        # Test connection
        await client.ping()
        print("✅ Connected to Railway Redis successfully")
        
        # Add your Google Maps API key here
        # Replace with your actual API key
        api_key = input("\n🔑 Enter your Google Maps API key: ").strip()
        
        if not api_key:
            print("❌ No API key provided")
            return
        
        # Store the API key
        await client.set("api_key:VITE_GOOGLE_MAPS_API_KEY", api_key)
        print(f"✅ Successfully stored VITE_GOOGLE_MAPS_API_KEY")
        
        # Optionally add Map ID
        map_id = input("\n🗺️  Enter your Google Maps Map ID (optional, press Enter to skip): ").strip()
        if map_id:
            await client.set("api_key:VITE_GOOGLE_MAPS_MAP_ID", map_id)
            print(f"✅ Successfully stored VITE_GOOGLE_MAPS_MAP_ID")
        
        # Verify the keys were stored
        print("\n🔍 Verifying stored keys...")
        stored_api_key = await client.get("api_key:VITE_GOOGLE_MAPS_API_KEY")
        if stored_api_key:
            print(f"   ✅ VITE_GOOGLE_MAPS_API_KEY: {stored_api_key[:8]}...{stored_api_key[-4:]}")
        
        if map_id:
            stored_map_id = await client.get("api_key:VITE_GOOGLE_MAPS_MAP_ID")
            if stored_map_id:
                print(f"   ✅ VITE_GOOGLE_MAPS_MAP_ID: {stored_map_id}")
        
        await client.close()
        print("\n🎉 All done! Your Railway backend should now work with Google Maps.")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(add_google_maps_key())