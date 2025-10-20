# API Key Management

## Overview
This application uses encrypted API key storage with admin authentication for secure key management.

## Security Features
- ✅ Keys encrypted at rest using Fernet encryption
- ✅ Admin JWT authentication required for all operations
- ✅ Access logging for raw key retrieval
- ✅ Masked values for list/get operations

## API Endpoints

### Authentication
```bash
POST /api/admin/login
Body: {"username": "admin", "password": "admin123"}
Response: {"access_token": "...", "expires_in": 3600}
```

### List Keys (Masked)
```bash
GET /api/admin/keys
Headers: Authorization: Bearer <token>
Response: {"keys": [...], "total": 3}
```

### Get Key (Masked)
```bash
GET /api/admin/keys/{key_name}
Headers: Authorization: Bearer <token>
Response: {"key_name": "...", "masked_value": "AIza...***...zQ", ...}
```

### Get Raw Key Value ⚠️
```bash
GET /api/admin/keys/{key_name}/value
Headers: Authorization: Bearer <token>
Response: {"key_name": "...", "value": "actual_api_key"}
```

**SECURITY WARNING**: This endpoint returns raw API key values!
- Only use over HTTPS in production
- All access is logged
- Consider implementing:
  - IP allowlist
  - Rate limiting
  - MFA requirement
  - Key rotation after retrieval

### Create/Update Key
```bash
POST /api/admin/keys
Headers: Authorization: Bearer <token>
Body: {
  "key_name": "VITE_GOOGLE_MAPS_API_KEY",
  "key_value": "AIza...",
  "description": "Google Maps API key"
}
```

### Delete Key
```bash
DELETE /api/admin/keys/{key_name}
Headers: Authorization: Bearer <token>
```

## CLI Script (Safer Alternative)

For server-side key retrieval without HTTP exposure:

```bash
# Make script executable
chmod +x backend/get_key.py

# Retrieve a key
python backend/get_key.py VITE_GOOGLE_MAPS_API_KEY
```

Output:
```
Retrieving API key: VITE_GOOGLE_MAPS_API_KEY
--------------------------------------------------
Key Name: VITE_GOOGLE_MAPS_API_KEY
Value: AIzaSyC...actual_key_here
--------------------------------------------------
✅ Key retrieved successfully
```

## Storage Location
- File: `backend/api_keys.json`
- Format: Encrypted JSON
- Permissions: 0600 (owner read/write only)

## Default Admin Credentials
⚠️ **CHANGE IN PRODUCTION!**
- Username: `admin`
- Password: `admin123`

## Security Best Practices

### Production Deployment
1. **Change default admin credentials immediately**
2. **Use HTTPS only** - Never expose raw keys over HTTP
3. **Implement rate limiting** on `/value` endpoint
4. **Add IP allowlist** for admin endpoints
5. **Enable MFA** for admin authentication
6. **Rotate keys regularly** after retrieval
7. **Monitor access logs** for suspicious activity

### Key Rotation
After retrieving a raw key value:
1. Update the key in the third-party service (Google, etc.)
2. Update the key in the admin panel
3. Verify all services are using the new key
4. Delete the old key

### Access Logging
All raw key retrievals are logged with:
- Timestamp
- Key name
- Username
- IP address (if available)

Check logs:
```bash
tail -f backend/logs/admin.log
```

## Troubleshooting

### 404 on `/value` endpoint
- Ensure you're using the correct endpoint: `/api/admin/keys/{key_name}/value`
- Verify the key exists: `GET /api/admin/keys`

### 401 Unauthorized
- Token expired (60 min default) - login again
- Invalid token - check Authorization header format: `Bearer <token>`

### Key not found
- List available keys: `GET /api/admin/keys`
- Check key name spelling (case-sensitive)

### Decryption errors
- Encryption key changed - keys cannot be decrypted
- Corrupted `api_keys.json` - restore from backup

## Example Usage

### Frontend Integration
```typescript
import { apiKeyService } from './services/apiKeyService';

// Login first
await apiKeyService.login('admin', 'admin123');

// Get raw API key value
const googleMapsKey = await apiKeyService.getGoogleMapsKey();

// Use the key
loadGoogleMapsScript({ apiKey: googleMapsKey });
```

### Backend Integration
```python
from services.admin_service import admin_service

# Get decrypted key value
api_key = admin_service.get_api_key('VITE_GOOGLE_MAPS_API_KEY')
```

## Support
For issues or questions, check:
1. Application logs: `backend/logs/`
2. API documentation: `/docs` (FastAPI auto-generated)
3. This README
