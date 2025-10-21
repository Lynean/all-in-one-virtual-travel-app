#!/usr/bin/env python3
"""
CLI script to add encrypted API keys to the database.
This allows manual key management without the admin panel.

Usage:
    python add_key.py <key_name> <key_value> [description]

Example:
    python add_key.py OPENAI_API_KEY "sk-..." "OpenAI API key for chat functionality"
"""

import sys
import json
from datetime import datetime
from services.encryption_service import encryption_service


def main():
    if len(sys.argv) < 3:
        print("Usage: python add_key.py <key_name> <key_value> [description]")
        print("\nExample:")
        print('  python add_key.py OPENAI_API_KEY "sk-..." "OpenAI API key"')
        sys.exit(1)
    
    key_name = sys.argv[1]
    key_value = sys.argv[2]
    description = sys.argv[3] if len(sys.argv) > 3 else None
    
    print(f"Adding API key: {key_name}")
    if description:
        print(f"Description: {description}")
    print("-" * 50)
    
    try:
        # Load existing keys
        with open("api_keys.json", "r") as f:
            keys = json.load(f)
        
        # Encrypt the new key
        encrypted_value = encryption_service.encrypt(key_value)
        
        # Prepare key data
        now = datetime.utcnow().isoformat()
        keys[key_name] = {
            "encrypted_value": encrypted_value,
            "description": description,
            "created_at": keys.get(key_name, {}).get("created_at", now),
            "updated_at": now,
            "is_active": True
        }
        
        # Save back to file
        with open("api_keys.json", "w") as f:
            json.dump(keys, f, indent=2)
        
        print(f"✅ Successfully added/updated key: {key_name}")
        print(f"   Encrypted length: {len(encrypted_value)} characters")
        
    except Exception as e:
        print(f"❌ Error adding key: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()