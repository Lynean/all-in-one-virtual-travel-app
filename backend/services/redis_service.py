import redis.asyncio as redis
import json
from typing import Dict, Any, Optional

from config import settings


class RedisService:
    """Redis service for session management"""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            # Parse Redis URL to handle Railway's format
            redis_url = settings.redis_url
            
            # Railway Redis URLs include authentication in the URL
            # Format: redis://default:password@host:port
            self.client = await redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=10,
                socket_keepalive=True,
                health_check_interval=30,
                retry_on_timeout=True
            )
            
            # Test connection
            await self.client.ping()
        except Exception as e:
            # Don't raise the exception to allow the app to start without Redis
            self.client = None
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.client:
            await self.client.close()
    
    async def ping(self) -> bool:
        """Check Redis connection"""
        try:
            return await self.client.ping()
        except Exception:
            return False
    
    async def set_session(self, session_id: str, data: Dict[str, Any]):
        """
        Store session data
        
        Args:
            session_id: Session identifier
            data: Session data to store
        """
        try:
            key = f"session:{session_id}"
            await self.client.setex(
                key,
                settings.session_ttl,
                json.dumps(data)
            )
        except Exception as e:
            raise
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session data
        
        Args:
            session_id: Session identifier
        
        Returns:
            Session data or None if not found
        """
        try:
            key = f"session:{session_id}"
            data = await self.client.get(key)
            
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            return None
    
    async def delete_session(self, session_id: str):
        """
        Delete session data
        
        Args:
            session_id: Session identifier
        """
        try:
            key = f"session:{session_id}"
            await self.client.delete(key)
        except Exception as e:
            raise
    
    async def extend_session(self, session_id: str):
        """
        Extend session TTL
        
        Args:
            session_id: Session identifier
        """
        try:
            key = f"session:{session_id}"
            await self.client.expire(key, settings.session_ttl)
        except Exception as e:
            pass
    
    async def get_api_key(self, key_name: str) -> Optional[str]:
        """
        Retrieve API key from Redis
        
        Args:
            key_name: API key name (e.g., 'VITE_GOOGLE_MAPS_API_KEY')
        
        Returns:
            API key value or None if not found
        """
        try:
            if not self.client:
                return None
            
            key = f"api_key:{key_name}"
            value = await self.client.get(key)
            if value:
                return value
            else:
                return None
        except Exception as e:
            return None
    
    async def set_api_key(self, key_name: str, key_value: str):
        """
        Store API key in Redis
        
        Args:
            key_name: API key name
            key_value: API key value
        """
        try:
            key = f"api_key:{key_name}"
            await self.client.set(key, key_value)
        except Exception as e:
            raise
    
    async def list_api_keys(self) -> Dict[str, str]:
        """
        List all API keys from Redis
        
        Returns:
            Dictionary of key names and values
        """
        try:
            pattern = "api_key:*"
            keys = await self.client.keys(pattern)
            
            result = {}
            for redis_key in keys:
                key_name = redis_key.replace("api_key:", "")
                value = await self.client.get(redis_key)
                if value:
                    result[key_name] = value
            
            return result
        except Exception as e:
            return {}
