import redis.asyncio as redis
import json
import logging
from typing import Dict, Any, Optional

from config import settings

logger = logging.getLogger(__name__)


class RedisService:
    """Redis service for session management"""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.client = await redis.from_url(
                settings.redis_url,
                password=settings.redis_password if settings.redis_password else None,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self.client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {str(e)}")
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.client:
            await self.client.close()
            logger.info("Redis connection closed")
    
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
            logger.debug(f"Session {session_id} stored")
        except Exception as e:
            logger.error(f"Failed to store session {session_id}: {str(e)}")
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
            logger.error(f"Failed to retrieve session {session_id}: {str(e)}")
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
            logger.debug(f"Session {session_id} deleted")
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {str(e)}")
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
            logger.debug(f"Session {session_id} TTL extended")
        except Exception as e:
            logger.error(f"Failed to extend session {session_id}: {str(e)}")
