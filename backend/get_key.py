#!/usr/bin/env python3
"""
CLI script to retrieve decrypted API keys from the server.
This is safer than exposing raw keys over HTTP.

Usage:
    python get_key.py <key_name>

Example:
    python get_key.py VITE_GOOGLE_MAPS_API_KEY
"""

import sys
from services.admin_service import admin_service


def main():
    if len(sys.argv) != 2:
        print("Usage: python get_key.py <key_name>")
        print("\nExample:")
        print("  python get_key.py VITE_GOOGLE_MAPS_API_KEY")
        sys.exit(1)
    
    key_name = sys.argv[1]
    
    print(f"Retrieving API key: {key_name}")
    print("-" * 50)
    
    value = admin_service.get_api_key(key_name)
    
    if value:
        print(f"Key Name: {key_name}")
        print(f"Value: {value}")
        print("-" * 50)
        print("✅ Key retrieved successfully")
    else:
        print(f"❌ API key '{key_name}' not found")
        print("\nAvailable keys:")
        keys = admin_service.list_api_keys()
        for key in keys:
            print(f"  - {key.key_name}")
        sys.exit(1)


if __name__ == "__main__":
    main()
