from datetime import datetime, timedelta
from typing import Optional, Dict, List
import json
import os
import logging
import hashlib
import secrets
import jwt

from models.admin import APIKeyResponse
from services.encryption_service import encryption_service

logger = logging.getLogger(__name__)

# JWT settings
SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt"""
    salt = "travelmate_admin_salt_2024"  # Use a proper secret in production
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(plain_password) == hashed_password


class AdminService:
    """Service for admin authentication and API key management"""
    
    def __init__(self):
        self.keys_file = "api_keys.json"
        self.admin_file = "admin_users.json"
        self._ensure_files_exist()
        self._ensure_default_admin()
    
    def _ensure_files_exist(self):
        """Create storage files if they don't exist"""
        if not os.path.exists(self.keys_file):
            with open(self.keys_file, "w") as f:
                json.dump({}, f)
            os.chmod(self.keys_file, 0o600)
        
        if not os.path.exists(self.admin_file):
            with open(self.admin_file, "w") as f:
                json.dump({}, f)
            os.chmod(self.admin_file, 0o600)
    
    def _ensure_default_admin(self):
        """Create default admin user if none exists"""
        with open(self.admin_file, "r") as f:
            admins = json.load(f)
        
        if not admins:
            # Default admin credentials (CHANGE IN PRODUCTION!)
            default_username = "admin"
            default_password = "admin123"
            
            admins[default_username] = {
                "password_hash": hash_password(default_password),
                "created_at": datetime.utcnow().isoformat()
            }
            
            with open(self.admin_file, "w") as f:
                json.dump(admins, f, indent=2)
            
        
    def verify_password_method(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return verify_password(plain_password, hashed_password)
    
    def authenticate_admin(self, username: str, password: str) -> Optional[str]:
        """Authenticate admin and return JWT token"""
        try:
            with open(self.admin_file, "r") as f:
                admins = json.load(f)
            
            if username not in admins:
                return None
            
            if not self.verify_password_method(password, admins[username]["password_hash"]):
                return None
            
            # Create JWT token
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            token_data = {
                "sub": username,
                "exp": expire
            }
            token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
            
            return token
            
        except Exception as e:
            return None
    
    def verify_token(self, token: str) -> Optional[str]:
        """Verify JWT token and return username"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            return username
        except jwt.ExpiredSignatureError:
            return None
        except jwt.JWTError as e:
            return None
    
    def create_api_key(self, key_name: str, key_value: str, description: Optional[str] = None) -> APIKeyResponse:
        """Create or update an API key"""
        try:
            with open(self.keys_file, "r") as f:
                keys = json.load(f)
            
            # Encrypt the key value
            encrypted_value = encryption_service.encrypt(key_value)
            
            now = datetime.utcnow().isoformat()
            keys[key_name] = {
                "encrypted_value": encrypted_value,
                "description": description,
                "created_at": keys.get(key_name, {}).get("created_at", now),
                "updated_at": now,
                "is_active": True
            }
            
            with open(self.keys_file, "w") as f:
                json.dump(keys, f, indent=2)
            
            return self._key_to_response(key_name, keys[key_name], key_value)
            
        except Exception as e:
            raise
    
    def get_api_key(self, key_name: str) -> Optional[str]:
        """Get decrypted API key value"""
        try:
            with open(self.keys_file, "r") as f:
                keys = json.load(f)
            
            if key_name not in keys or not keys[key_name].get("is_active"):
                return None
            
            encrypted_value = keys[key_name]["encrypted_value"]
            return encryption_service.decrypt(encrypted_value)
            
        except Exception:
            return None
    
    def list_api_keys(self) -> List[APIKeyResponse]:
        """List all API keys (with masked values)"""
        try:
            with open(self.keys_file, "r") as f:
                keys = json.load(f)
            
            result = []
            for key_name, key_data in keys.items():
                decrypted = encryption_service.decrypt(key_data["encrypted_value"])
                result.append(self._key_to_response(key_name, key_data, decrypted))
            
            return result
            
        except Exception:
            return []
    
    def delete_api_key(self, key_name: str) -> bool:
        """Delete an API key"""
        try:
            with open(self.keys_file, "r") as f:
                keys = json.load(f)
            
            if key_name in keys:
                del keys[key_name]
                
                with open(self.keys_file, "w") as f:
                    json.dump(keys, f, indent=2)
                
                return True
            
            return False
            
        except Exception:
            return False
    
    def _key_to_response(self, key_name: str, key_data: dict, decrypted_value: str) -> APIKeyResponse:
        """Convert key data to response model"""
        return APIKeyResponse(
            key_name=key_name,
            description=key_data.get("description"),
            masked_value=encryption_service.mask_key(decrypted_value),
            created_at=datetime.fromisoformat(key_data["created_at"]),
            updated_at=datetime.fromisoformat(key_data["updated_at"]),
            is_active=key_data.get("is_active", True)
        )


admin_service = AdminService()
