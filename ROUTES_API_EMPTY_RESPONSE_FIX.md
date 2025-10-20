# Routes API Empty Response - Troubleshooting Guide

## Issue
Routes API is returning an empty response `{}` instead of route data.

## Current Status
✅ **Request is being sent correctly**
- Travel mode: TRANSIT
- Field mask includes all transit fields
- Request body has valid origin/destination

❌ **Response is empty**
- No routes array
- No error message
- Just empty object `{}`

## Root Cause
The most common causes for empty responses are:

### 1. **Routes API Not Enabled** (Most Likely)
The Google Routes API (New) is a separate API that must be enabled in Google Cloud Console.

### 2. **API Key Restrictions**
Your API key may not have permission to access the Routes API.

### 3. **Billing Not Set Up**
Routes API is a paid service that requires billing to be enabled.

## Solution Steps

### Step 1: Enable Routes API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for **"Routes API"** (NOT Directions API)
5. Click **Enable**

**Important**: This is different from:
- ❌ Directions API (old)
- ❌ Distance Matrix API (old)
- ✅ Routes API (new) ← **Enable this one**

### Step 2: Verify API Key Permissions

1. Go to **APIs & Services** > **Credentials**
2. Click on your API key
3. Under **API restrictions**:
   - Option A: Select "Don't restrict key" (for development)
   - Option B: Add **Routes API** to the list of allowed APIs

### Step 3: Enable Billing

1. Go to **Billing** in Google Cloud Console
2. Link a billing account to your project
3. Routes API requires billing to be active

### Step 4: Check API Quotas

1. Go to **APIs & Services** > **Dashboard**
2. Click on **Routes API**
3. Check quotas and usage

## Testing After Fix

Once you've enabled the Routes API and updated permissions:

1. **Restart the frontend** (Ctrl+C and `npm run dev`)
2. **Clear browser cache** (Hard refresh: Ctrl+Shift+R)
3. **Test with a simple query**:
   ```
   "Show me transit directions from JFK Airport to Times Square"
   ```

## Expected Console Output After Fix

```javascript
🔑 API Key exists: true Length: 39

🗺️ Routes API Request: {
  travelMode: "TRANSIT",
  fieldMask: "routes.duration,routes...",
  requestBody: {...}
}

🗺️ Routes API HTTP Status: 200 OK

🗺️ Routes API Response: {
  routes: [
    {
      legs: [...],
      polyline: {...},
      duration: "...",
      distanceMeters: ...
    }
  ]
}

🗺️ Route response: { legs: [...], polyline: {...} }
🚇 Travel mode: "TRANSIT"
🚇 Route legs: [ { steps: [...] } ]
🚇 Processing TRANSIT mode
...
```

## Alternative: Check API Status in Console

You can verify if the API is enabled:

```javascript
// In browser console
fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    origin: {
      location: {
        latLng: { latitude: 40.64, longitude: -73.78 }
      }
    },
    destination: {
      location: {
        latLng: { latitude: 40.758, longitude: -73.985 }
      }
    },
    travelMode: "DRIVE"
  })
})
.then(r => r.json())
.then(data => console.log(data))
```

**Expected responses:**
- ✅ Success: `{ routes: [...] }`
- ❌ API not enabled: Error message about API not being enabled
- ❌ Empty: `{}`
- ❌ Auth error: `{ error: { code: 403, ... } }`

## API Pricing Information

**Routes API Pricing (as of 2025):**
- Compute Routes: $5.00 per 1,000 requests
- Compute Route Matrix: $10.00 per 1,000 element pairs

**Free Tier:**
- $200 monthly credit (≈ 40,000 route requests)
- New users get $300 credit for 90 days

## Related APIs to Enable

For full functionality, you may also want to enable:
- ✅ **Maps JavaScript API** (for map display) - Already working
- ✅ **Places API (New)** (for place search) - Already working
- ✅ **Geocoding API** (for address lookup) - Already working
- ✅ **Routes API** (for directions) - **NEEDS TO BE ENABLED**

## Quick Fix Checklist

- [ ] Routes API enabled in Google Cloud Console
- [ ] Billing account linked to project
- [ ] API key has Routes API permission
- [ ] Browser cache cleared
- [ ] Frontend restarted
- [ ] Test query executed

## Still Having Issues?

If the response is still empty after enabling the API:

1. **Wait 2-5 minutes** for API enablement to propagate
2. **Check browser network tab** for the actual HTTP response
3. **Verify API key** in Google Cloud Console
4. **Check for error messages** in the response body
5. **Try a simple DRIVE route first** before testing TRANSIT

---

**Status**: Waiting for Routes API to be enabled
**Priority**: High - Required for transit directions
**Next Step**: Enable Routes API in Google Cloud Console
