from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting API keys"""
    
    def __init__(self):
        # Get or generate encryption key
        self.encryption_key = self._get_or_create_key()
        self.cipher = Fernet(self.encryption_key)
    
    def _get_or_create_key(self) -> bytes:
        """Get existing encryption key or create a new one"""
        key_file = ".encryption_key"
        
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                return f.read()
        
        # Generate new key
        key = Fernet.generate_key()
        
        # Save key securely
        with open(key_file, "wb") as f:
            f.write(key)
        
        # Set restrictive permissions (Unix-like systems)
        try:
            os.chmod(key_file, 0o600)
        except Exception as e:
            logger.warning(f"Could not set file permissions: {e}")
        
        logger.info("Generated new encryption key")
        return key
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string"""
        try:
            encrypted = self.cipher.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt a string"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_text.encode())
            decrypted = self.cipher.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise
    
    def mask_key(self, key: str, visible_chars: int = 4) -> str:
        """Mask an API key for display"""
        if len(key) <= visible_chars:
            return "*" * len(key)
        return key[:visible_chars] + "*" * (len(key) - visible_chars)


encryption_service = EncryptionService()
