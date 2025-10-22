import redis.asyncio as redis
import json
import asyncio
import logging
from typing import Dict, Any, Optional

from config import settings

logger = logging.getLogger(__name__)


class RedisService:
    """Redis service for session management"""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self.connection_timeout = 5  # 5 second connection timeout
        self.operation_timeout = 2   # 2 second operation timeout
    
    async def connect(self):
        """Connect to Redis with timeout"""
        try:
            redis_url = settings.redis_url
            
            logger.info(f"🔌 Attempting Redis connection to: {redis_url.split('@')[-1] if '@' in redis_url else redis_url}")
            
            # Create connection with strict timeouts
            self.client = await asyncio.wait_for(
                redis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=self.connection_timeout,
                    socket_timeout=self.operation_timeout,
                    socket_keepalive=True,
                    health_check_interval=30,
                    retry_on_timeout=True,
                    max_connections=10
                ),
                timeout=self.connection_timeout
            )
            
            # Test connection with timeout
            await asyncio.wait_for(
                self.client.ping(),
                timeout=self.operation_timeout
            )
            
            logger.info("✅ Redis connected successfully")
            
        except asyncio.TimeoutError:
            logger.error(f"❌ Redis connection timeout after {self.connection_timeout}s")
            self.client = None
            raise
        except Exception as e:
            logger.error(f"❌ Redis connection error: {e}")
            self.client = None
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.client:
            try:
                await self.client.close()
                logger.info("✅ Redis disconnected")
            except Exception as e:
                logger.warning(f"⚠️ Redis disconnect error: {e}")
    
    async def ping(self) -> bool:
        """Check Redis connection with timeout"""
        if not self.client:
            return False
        
        try:
            result = await asyncio.wait_for(
                self.client.ping(),
                timeout=self.operation_timeout
            )
            return result
        except asyncio.TimeoutError:
            logger.warning("⚠️ Redis ping timeout")
            return False
        except Exception as e:
            logger.warning(f"⚠️ Redis ping error: {e}")
            return False
    
    async def set_session(self, session_id: str, data: Dict[str, Any]):
        """Store session data with timeout"""
        if not self.client:
            raise Exception("Redis not connected")
        
        try:
            key = f"session:{session_id}"
            await asyncio.wait_for(
                self.client.setex(
                    key,
                    settings.session_ttl,
                    json.dumps(data)
                ),
                timeout=self.operation_timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"⚠️ Redis setex timeout for session {session_id}")
            raise Exception("Redis operation timeout")
        except Exception as e:
            logger.error(f"⚠️ Redis setex error: {e}")
            raise
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session data with timeout"""
        if not self.client:
            return None
        
        try:
            key = f"session:{session_id}"
            data = await asyncio.wait_for(
                self.client.get(key),
                timeout=self.operation_timeout
            )
            
            if data:
                return json.loads(data)
            return None
        except asyncio.TimeoutError:
            logger.warning(f"⚠️ Redis get timeout for session {session_id}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ Redis get error: {e}")
            return None
    
    async def delete_session(self, session_id: str):
        """Delete session data with timeout"""
        if not self.client:
            raise Exception("Redis not connected")
        
        try:
            key = f"session:{session_id}"
            await asyncio.wait_for(
                self.client.delete(key),
                timeout=self.operation_timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"⚠️ Redis delete timeout for session {session_id}")
            raise Exception("Redis operation timeout")
        except Exception as e:
            logger.error(f"⚠️ Redis delete error: {e}")
            raise
    
    async def extend_session(self, session_id: str):
        """Extend session TTL with timeout"""
        if not self.client:
            return
        
        try:
            key = f"session:{session_id}"
            await asyncio.wait_for(
                self.client.expire(key, settings.session_ttl),
                timeout=self.operation_timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"⚠️ Redis expire timeout for session {session_id}")
        except Exception as e:
            logger.warning(f"⚠️ Redis expire error: {e}")
    
    async def get_api_key(self, key_name: str) -> Optional[str]:
        """Retrieve API key from Redis with timeout"""
        if not self.client:
            return None
        
        try:
            key = f"api_key:{key_name}"
            value = await asyncio.wait_for(
                self.client.get(key),
                timeout=self.operation_timeout
            )
            return value if value else None
        except asyncio.TimeoutError:
            logger.warning(f"⚠️ Redis get timeout for API key {key_name}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ Redis get error for API key: {e}")
            return None
    
    async def set_api_key(self, key_name: str, key_value: str):
        """Store API key in Redis with timeout"""
        if not self.client:
            raise Exception("Redis not connected")
        
        try:
            key = f"api_key:{key_name}"
            await asyncio.wait_for(
                self.client.set(key, key_value),
                timeout=self.operation_timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"⚠️ Redis set timeout for API key {key_name}")
            raise Exception("Redis operation timeout")
        except Exception as e:
            logger.error(f"⚠️ Redis set error: {e}")
            raise
    
    async def list_api_keys(self) -> Dict[str, str]:
        """List all API keys from Redis with timeout"""
        if not self.client:
            return {}
        
        try:
            pattern = "api_key:*"
            keys = await asyncio.wait_for(
                self.client.keys(pattern),
                timeout=self.operation_timeout * 2  # Allow more time for listing
            )
            
            result = {}
            for redis_key in keys:
                key_name = redis_key.replace("api_key:", "")
                try:
                    value = await asyncio.wait_for(
                        self.client.get(redis_key),
                        timeout=self.operation_timeout
                    )
                    if value:
                        result[key_name] = value
                except asyncio.TimeoutError:
                    logger.warning(f"⚠️ Timeout getting key {key_name}")
                    continue
            
            return result
        except asyncio.TimeoutError:
            logger.warning("⚠️ Redis keys list timeout")
            return {}
        except Exception as e:
            logger.warning(f"⚠️ Redis list error: {e}")
            return {}