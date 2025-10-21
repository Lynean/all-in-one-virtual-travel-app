#!/usr/bin/env python3
"""
Script to migrate API keys to a new encryption key.
This fixes the issue where keys were encrypted with a temporary key.

Usage:
    python migrate_keys.py <old_key> <new_key>
    
Or to generate a new key:
    python migrate_keys.py --generate-key
"""

import sys
import json
import os
from datetime import datetime
from cryptography.fernet import Fernet
import base64


class KeyMigrator:
    def __init__(self, old_key: str, new_key: str):
        if isinstance(old_key, str):
            old_key = old_key.encode()
        if isinstance(new_key, str):
            new_key = new_key.encode()
            
        self.old_cipher = Fernet(old_key)
        self.new_cipher = Fernet(new_key)
    
    def decrypt_old(self, encrypted_value: str) -> str:
        """Decrypt with old key"""
        decoded = base64.b64decode(encrypted_value.encode())
        decrypted = self.old_cipher.decrypt(decoded)
        return decrypted.decode()
    
    def encrypt_new(self, value: str) -> str:
        """Encrypt with new key"""
        encrypted = self.new_cipher.encrypt(value.encode())
        return base64.b64encode(encrypted).decode()


def generate_key():
    """Generate a new Fernet key"""
    return Fernet.generate_key().decode()


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--generate-key":
        key = generate_key()
        print(f"Generated new encryption key: {key}")
        print("\nTo use this key:")
        print("1. Set it as ENCRYPTION_KEY environment variable on Railway")
        print("2. Run: python migrate_keys.py <old_key> <new_key>")
        return
    
    if len(sys.argv) != 3:
        print("Usage:")
        print("  python migrate_keys.py <old_key> <new_key>")
        print("  python migrate_keys.py --generate-key")
        sys.exit(1)
    
    old_key = sys.argv[1]
    new_key = sys.argv[2]
    
    print("🔄 Migrating API keys to new encryption key...")
    print("-" * 50)
    
    try:
        # Load existing keys
        with open("api_keys.json", "r") as f:
            keys = json.load(f)
        
        if not keys:
            print("No keys found to migrate.")
            return
        
        migrator = KeyMigrator(old_key, new_key)
        migrated_count = 0
        
        # Migrate each key
        for key_name, key_data in keys.items():
            try:
                # Decrypt with old key
                old_encrypted = key_data["encrypted_value"]
                decrypted_value = migrator.decrypt_old(old_encrypted)
                
                # Encrypt with new key
                new_encrypted = migrator.encrypt_new(decrypted_value)
                
                # Update the key data
                key_data["encrypted_value"] = new_encrypted
                key_data["updated_at"] = datetime.utcnow().isoformat()
                
                print(f"✅ Migrated: {key_name}")
                migrated_count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate {key_name}: {e}")
        
        if migrated_count > 0:
            # Save the updated keys
            with open("api_keys.json", "w") as f:
                json.dump(keys, f, indent=2)
            
            print(f"\n🎉 Successfully migrated {migrated_count} keys!")
            print("   Keys have been re-encrypted with the new key.")
            print("   Make sure to set ENCRYPTION_KEY environment variable on Railway.")
        else:
            print("\n❌ No keys were successfully migrated.")
    
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()