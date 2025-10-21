#!/usr/bin/env python3
"""
CLI script to list all API keys in the database.
Shows key names, descriptions, and creation dates (values are masked for security).

Usage:
    python list_keys.py
"""

import json
from datetime import datetime
from services.encryption_service import encryption_service


def main():
    try:
        with open("api_keys.json", "r") as f:
            keys = json.load(f)
        
        print("📋 API Keys Database")
        print("=" * 80)
        
        if not keys:
            print("No API keys found.")
            return
        
        for key_name, key_data in keys.items():
            # Decrypt to get the original length for masking
            try:
                decrypted = encryption_service.decrypt(key_data["encrypted_value"])
                masked = encryption_service.mask_key(decrypted)
            except:
                masked = "***ERROR***"
            
            status = "🟢 Active" if key_data.get("is_active", True) else "🔴 Inactive"
            created = key_data.get("created_at", "Unknown")
            description = key_data.get("description", "No description")
            
            print(f"\n🔑 {key_name}")
            print(f"   Status: {status}")
            print(f"   Value:  {masked}")
            print(f"   Desc:   {description}")
            print(f"   Added:  {created}")
        
        print(f"\n📊 Total keys: {len(keys)}")
        
    except FileNotFoundError:
        print("❌ api_keys.json not found. No keys configured yet.")
    except Exception as e:
        print(f"❌ Error reading keys: {e}")


if __name__ == "__main__":
    main()