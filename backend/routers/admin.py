from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any
import logging

from models.admin import (
    AdminLogin, AdminToken, APIKeyCreate, APIKeyUpdate, 
    APIKeyResponse, APIKeyList
)
from services.admin_service import admin_service, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()


async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Dependency to verify admin JWT token"""
    username = admin_service.verify_token(credentials.credentials)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return username


@router.post("/login", response_model=AdminToken)
async def admin_login(login: AdminLogin):
    """Admin login endpoint"""
    token = admin_service.authenticate_admin(login.username, login.password)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    return AdminToken(
        access_token=token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/keys", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    username: str = Depends(verify_admin_token)
):
    """Create or update an API key"""
    try:
        return admin_service.create_api_key(
            key_name=key_data.key_name,
            key_value=key_data.key_value,
            description=key_data.description
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating API key: {str(e)}"
        )


@router.get("/keys", response_model=APIKeyList)
async def list_api_keys(username: str = Depends(verify_admin_token)):
    """List all API keys"""
    keys = admin_service.list_api_keys()
    return APIKeyList(keys=keys, total=len(keys))


@router.get("/keys/{key_name}", response_model=APIKeyResponse)
async def get_api_key(
    key_name: str,
    username: str = Depends(verify_admin_token)
):
    """Get a specific API key (masked)"""
    keys = admin_service.list_api_keys()
    key = next((k for k in keys if k.key_name == key_name), None)
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return key


@router.get("/keys/{key_name}/value")
async def get_api_key_value(
    key_name: str,
    username: str = Depends(verify_admin_token)
):
    """
    Get decrypted API key value (admin only)
    
    SECURITY WARNING: This endpoint returns raw API key values.
    - Requires valid admin JWT token
    - All access is logged
    - Use only over secure connections (HTTPS)
    - Consider implementing additional security measures:
      * IP allowlist
      * Rate limiting
      * MFA requirement
      * Key rotation after retrieval
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Log the access attempt
    logger.warning(f"API key value accessed: {key_name} by user: {username}")
    
    value = admin_service.get_api_key(key_name)
    
    if not value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return {"key_name": key_name, "value": value}


@router.delete("/keys/{key_name}")
async def delete_api_key(
    key_name: str,
    username: str = Depends(verify_admin_token)
):
    """Delete an API key"""
    success = admin_service.delete_api_key(key_name)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return {"status": "deleted", "key_name": key_name}


@router.get("/verify")
async def verify_token(username: str = Depends(verify_admin_token)):
    """Verify admin token"""
    return {"status": "valid", "username": username}


# ============================================================================
# Redis Database Management Endpoints
# ============================================================================

@router.get("/redis/info")
async def get_redis_info(username: str = Depends(verify_admin_token)):
    """Get Redis database information and statistics"""
    try:
        from main import redis_service
        
        if not redis_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis is not connected"
            )
        
        # Get Redis info
        info = await redis_service.client.info()
        
        return {
            "status": "connected",
            "server": {
                "redis_version": info.get("redis_version"),
                "uptime_in_seconds": info.get("uptime_in_seconds"),
                "uptime_in_days": info.get("uptime_in_days"),
            },
            "clients": {
                "connected_clients": info.get("connected_clients"),
            },
            "memory": {
                "used_memory_human": info.get("used_memory_human"),
                "used_memory_peak_human": info.get("used_memory_peak_human"),
            },
            "stats": {
                "total_connections_received": info.get("total_connections_received"),
                "total_commands_processed": info.get("total_commands_processed"),
                "instantaneous_ops_per_sec": info.get("instantaneous_ops_per_sec"),
            },
            "keyspace": {
                "db0": info.get("db0", "No keys"),
            }
        }
    except Exception as e:
        logger.error(f"Error getting Redis info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accessing Redis: {str(e)}"
        )


@router.get("/redis/keys")
async def list_redis_keys(
    pattern: str = "*",
    username: str = Depends(verify_admin_token)
):
    """List all keys in Redis database matching pattern"""
    try:
        from main import redis_service
        
        if not redis_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis is not connected"
            )
        
        # Get all keys matching pattern
        keys = []
        async for key in redis_service.client.scan_iter(match=pattern):
            # Get key type and TTL
            key_type = await redis_service.client.type(key)
            ttl = await redis_service.client.ttl(key)
            
            keys.append({
                "key": key,
                "type": key_type,
                "ttl": ttl if ttl > 0 else None
            })
        
        return {
            "keys": keys,
            "total": len(keys),
            "pattern": pattern
        }
    except Exception as e:
        logger.error(f"Error listing Redis keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accessing Redis: {str(e)}"
        )


@router.get("/redis/key/{key_name}")
async def get_redis_key(
    key_name: str,
    username: str = Depends(verify_admin_token)
):
    """Get value of a specific Redis key"""
    try:
        from main import redis_service
        
        if not redis_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis is not connected"
            )
        
        # Check if key exists
        if not await redis_service.client.exists(key_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Key '{key_name}' not found"
            )
        
        # Get key info
        key_type = await redis_service.client.type(key_name)
        ttl = await redis_service.client.ttl(key_name)
        
        # Get value based on type
        value = None
        if key_type == "string":
            value = await redis_service.client.get(key_name)
        elif key_type == "hash":
            value = await redis_service.client.hgetall(key_name)
        elif key_type == "list":
            value = await redis_service.client.lrange(key_name, 0, -1)
        elif key_type == "set":
            value = list(await redis_service.client.smembers(key_name))
        elif key_type == "zset":
            value = await redis_service.client.zrange(key_name, 0, -1, withscores=True)
        
        return {
            "key": key_name,
            "type": key_type,
            "ttl": ttl if ttl > 0 else None,
            "value": value
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Redis key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accessing Redis: {str(e)}"
        )


@router.delete("/redis/key/{key_name}")
async def delete_redis_key(
    key_name: str,
    username: str = Depends(verify_admin_token)
):
    """Delete a specific Redis key"""
    try:
        from main import redis_service
        
        if not redis_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis is not connected"
            )
        
        # Check if key exists
        if not await redis_service.client.exists(key_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Key '{key_name}' not found"
            )
        
        # Delete the key
        deleted = await redis_service.client.delete(key_name)
        
        logger.warning(f"Redis key deleted: {key_name} by user: {username}")
        
        return {
            "status": "deleted",
            "key": key_name,
            "deleted_count": deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting Redis key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accessing Redis: {str(e)}"
        )


@router.post("/redis/flush")
async def flush_redis_database(
    confirm: bool = False,
    username: str = Depends(verify_admin_token)
):
    """
    Flush all keys from Redis database
    
    WARNING: This will delete ALL data in Redis!
    Requires confirm=true parameter.
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must set confirm=true to flush database"
        )
    
    try:
        from main import redis_service
        
        if not redis_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis is not connected"
            )
        
        # Flush all keys
        await redis_service.client.flushdb()
        
        logger.warning(f"Redis database flushed by user: {username}")
        
        return {
            "status": "flushed",
            "message": "All keys have been deleted from the database"
        }
    except Exception as e:
        logger.error(f"Error flushing Redis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accessing Redis: {str(e)}"
        )
