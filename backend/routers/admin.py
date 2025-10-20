from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List

from models.admin import (
    AdminLogin, AdminToken, APIKeyCreate, APIKeyUpdate, 
    APIKeyResponse, APIKeyList
)
from services.admin_service import admin_service, ACCESS_TOKEN_EXPIRE_MINUTES

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
