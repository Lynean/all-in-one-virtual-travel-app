"""
Encryption service for API keys
"""
from cryptography.fernet import Fernet
import os
import base64

class EncryptionService:
    def __init__(self):
        # Get encryption key from environment or generate one
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            # Generate a key (in production, set this as env variable!)
            key = Fernet.generate_key().decode()
            print(f"⚠️  WARNING: Using generated encryption key. Set ENCRYPTION_KEY env variable!")
            print(f"Generated key: {key}")
        
        if isinstance(key, str):
            key = key.encode()
        
        self.cipher = Fernet(key)
    
    def encrypt(self, value: str) -> str:
        """Encrypt a string value"""
        try:
            encrypted = self.cipher.encrypt(value.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            print(f"Encryption error: {e}")
            raise
    
    def decrypt(self, encrypted_value: str) -> str:
        """Decrypt an encrypted string"""
        try:
            decoded = base64.b64decode(encrypted_value.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            print(f"Decryption error: {e}")
            raise
    
    def mask_key(self, value: str) -> str:
        """
        Mask an API key for safe display
        Shows first 8 and last 4 characters, masks the rest
        Example: AIzaSyBQ...l9sQ
        """
        if not value or len(value) <= 12:
            return "***"
        
        return f"{value[:8]}...{value[-4:]}"

# Singleton instance
encryption_service = EncryptionService()
