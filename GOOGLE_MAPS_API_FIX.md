# Google Maps API ERR_INSUFFICIENT_RESOURCES Fix

## Problem

Error in console:
```
GET https://maps.googleapis.com/maps/api/geocode/json?latlng=1.292921675189867,103.77234515118408&key=AIzaSy...
net::ERR_INSUFFICIENT_RESOURCES
```

This error occurs when making too many requests to Google Maps Geocoding API too quickly.

## Root Causes

### 1. **Rapid Repeated Calls**
- Multiple geocoding requests fired in quick succession
- No delay between requests
- Browser runs out of network resources

### 2. **No Caching**
- Same location geocoded multiple times
- Wasting API quota
- Unnecessary network overhead

### 3. **Reverse Geocoding from Map Interactions**
- The error shows `latlng=...` which is reverse geocoding
- Might be triggered by:
  - Creating markers
  - Clicking on map
  - Info windows trying to get address names
  - Google Maps SDK internal calls

## Solutions Implemented

### 1. **Request Caching**

Added a cache to store geocoding results:

```typescript
const geocodeCache = useRef<Map<string, MapLocation>>(new Map());
const pendingGeocodeRequests = useRef<Set<string>>(new Set());
```

**How it works:**
- Before making API call, check if result is already cached
- If cached, return immediately (no API call)
- Prevents duplicate requests for same location

### 2. **Duplicate Request Prevention**

Tracks pending requests to prevent simultaneous duplicate calls:

```typescript
if (pendingGeocodeRequests.current.has(cacheKey)) {
  console.log('⏳ Geocode request already pending');
  await new Promise(resolve => setTimeout(resolve, 500));
  return geocodeCache.current.get(cacheKey) || null;
}
```

### 3. **Rate Limiting**

Added 200ms minimum delay between geocoding requests:

```typescript
const GEOCODING_RATE_LIMIT = 200; // Minimum ms between requests

const now = Date.now();
const timeSinceLastRequest = now - lastGeocodingTime.current;
if (timeSinceLastRequest < GEOCODING_RATE_LIMIT) {
  const waitTime = GEOCODING_RATE_LIMIT - timeSinceLastRequest;
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

### 4. **Enhanced Error Handling**

Detects quota errors and provides warnings:

```typescript
catch (e) {
  console.error('❌ Geocoding failed:', e);
  if (e instanceof Error && e.message.includes('OVER_QUERY_LIMIT')) {
    console.warn('⚠️ Geocoding quota exceeded');
  }
}
```

## Files Modified

**`src/components/MapView.tsx`:**
- Added geocoding cache
- Added pending request tracking
- Added rate limiting (200ms between requests)
- Enhanced error logging

## Google Maps API Quotas

### Free Tier Limits:
- **Geocoding API**: 40,000 requests/month
- **Reverse Geocoding**: Included in above limit
- **Rate limit**: 50 requests/second (but browser limits apply)

### Best Practices:
1. ✅ **Always cache results** - Don't geocode same location twice
2. ✅ **Rate limit requests** - Space out API calls
3. ✅ **Handle errors gracefully** - Detect quota errors
4. ✅ **Use alternative approaches** - Consider storing coordinates instead of addresses
5. ✅ **Monitor usage** - Check Google Cloud Console for quota usage

## How to Monitor API Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Enabled APIs"
4. Click "Geocoding API"
5. View metrics and quota usage

## Additional Optimizations

### If Error Persists:

#### 1. **Increase Rate Limit Delay**

Change from 200ms to 500ms or 1000ms:

```typescript
const GEOCODING_RATE_LIMIT = 500; // or 1000
```

#### 2. **Limit Marker Creation**

Only create markers for visible results:

```typescript
// Instead of creating 20 markers, limit to 10
maxResultCount: 10
```

#### 3. **Disable Automatic Address Lookup**

If info windows are causing reverse geocoding:

```typescript
// Don't show formatted address in info window
const infoContent = `
  <div>
    <strong>${place.displayName?.text}</strong><br/>
    ${/* DON'T use place.formattedAddress */}
  </div>
`;
```

#### 4. **Use Client-Side Clustering**

For many markers, use marker clustering:

```bash
npm install @googlemaps/markerclusterer
```

```typescript
import { MarkerClusterer } from '@googlemaps/markerclusterer';

const clusterer = new MarkerClusterer({ map, markers });
```

## Testing the Fix

### 1. Clear Console
Press F12 → Console → Clear

### 2. Test Geocoding
Type in MapView search: `New York`

### 3. Check Console Logs
You should see:
```
🌍 Geocoding address: New York
✅ Geocoded and cached: New York → {lat: 40.7128, lng: -74.0060}
```

### 4. Repeat Same Search
Type `New York` again. Should see:
```
📦 Using cached geocode result for: new york
```

### 5. Rapid Searches
Type multiple searches quickly. Should see rate limiting:
```
⏱️ Rate limiting: waiting 150ms before geocoding
```

## What Changed

### Before:
- ❌ No caching - same location geocoded multiple times
- ❌ No rate limiting - requests fired rapidly
- ❌ No duplicate prevention - parallel requests for same location
- ❌ Poor error handling

### After:
- ✅ Results cached in memory
- ✅ 200ms minimum between requests
- ✅ Duplicate requests prevented
- ✅ Enhanced error detection and logging
- ✅ Console logs show caching and rate limiting in action

## Emergency Fix (If Still Having Issues)

If you're still getting `ERR_INSUFFICIENT_RESOURCES`, temporarily disable geocoding:

```typescript
const geocodeAddress = async (address: string): Promise<MapLocation | null> => {
  console.warn('⚠️ Geocoding temporarily disabled');
  return null;
};
```

This will make address-based searches not work, but will stop the API errors.

## Long-Term Solutions

### Option 1: Use Places API Instead
Places API Text Search doesn't require geocoding:

```typescript
// Already implemented in your code
await searchText({
  textQuery: query,
  locationBias: { ... }
});
```

### Option 2: Pre-compute Coordinates
Store coordinates in your backend/database instead of geocoding on-the-fly.

### Option 3: Upgrade Google Maps Plan
If you need more quota, upgrade to pay-as-you-go plan.

## Success Criteria

After implementing these fixes:
- ✅ No more `ERR_INSUFFICIENT_RESOURCES` errors
- ✅ Console shows cache hits: "📦 Using cached geocode result"
- ✅ Console shows rate limiting when needed
- ✅ Same location only geocoded once per session
- ✅ Smoother user experience

## Summary

The error was caused by too many geocoding requests. Fixed by:
1. **Caching** - Store results, don't repeat calls
2. **Rate Limiting** - 200ms minimum between requests  
3. **Duplicate Prevention** - Track pending requests
4. **Better Error Handling** - Detect and warn about quota issues

The map should now work smoothly without resource errors! 🎉
