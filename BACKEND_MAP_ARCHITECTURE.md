# Backend Map Processing Architecture

## Overview

This document explains the **Backend Map Processing** architecture where:
- **Backend**: Calls Google Maps APIs and processes data
- **Frontend**: Renders maps and displays backend data

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Frontend React App                                     │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 1. User searches "restaurants near me"          │   │    │
│  │  │ 2. Send to backend: /api/maps/places/search    │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                          ↓                              │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 5. Receive processed data from backend          │   │    │
│  │  │    - Place names, addresses, coordinates        │   │    │
│  │  │    - Ratings, photos, business hours            │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                          ↓                              │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 6. Render Google Maps with data:                │   │    │
│  │  │    - Display map (Google Maps JavaScript API)   │   │    │
│  │  │    - Place markers at coordinates               │   │    │
│  │  │    - Draw polylines for routes                  │   │    │
│  │  │    - Handle zoom, pan, click interactions       │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                 │ HTTP Request
                                 │ POST /api/maps/places/search
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  FastAPI Backend                                        │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 3. Receive search request from frontend         │   │    │
│  │  │    - Extract: query, location, filters          │   │    │
│  │  │    - Validate and sanitize inputs               │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                          ↓                              │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 4. Call Google Maps API (API KEY ON SERVER)     │   │    │
│  │  │    - Use server-side API key (from .env)        │   │    │
│  │  │    - Call Places API / Routes API / Geocoding   │   │    │
│  │  │    - Process and format response                │   │    │
│  │  │    - Apply business logic / caching             │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS Request
                                 │ API Key: AIza...
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE MAPS API                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  • Places API (New)                                     │    │
│  │  • Routes API                                           │    │
│  │  • Geocoding API                                        │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

### Backend Files

```
backend/
├── services/
│   ├── backend_places_service.py   # Google Places API integration
│   ├── backend_routes_service.py   # Google Routes API integration
│   └── agent_service.py            # AI agent (uses tools)
├── main.py                          # FastAPI endpoints for maps
└── .env                             # API keys (VITE_GOOGLE_MAPS_API_KEY)
```

### Frontend Files

```
src/
├── services/
│   ├── backendMapService.ts        # Calls backend map endpoints
│   ├── maps.ts                     # Google Maps rendering only
│   └── configService.ts            # Admin key management
├── components/
│   ├── MapView.tsx                 # Main map display
│   └── BackendMapExample.tsx       # Usage examples
```

## API Endpoints

### Places Search

**Endpoint**: `POST /api/maps/places/search`

**Request**:
```typescript
{
  query: "restaurants",
  latitude: 40.7128,
  longitude: -74.0060,
  radius: 5000,
  included_types: ["restaurant"],
  min_rating: 4.0,
  open_now: true
}
```

**Response**:
```typescript
{
  results: [
    {
      id: "ChIJ...",
      name: "Restaurant Name",
      formatted_address: "123 Main St, New York, NY",
      location: { latitude: 40.7128, longitude: -74.0060 },
      rating: 4.5,
      user_ratings_total: 1234,
      types: ["restaurant", "food"],
      price_level: "MODERATE",
      business_status: "OPERATIONAL",
      photos: ["places/ChIJ.../photos/..."]
    }
  ],
  count: 10
}
```

### Nearby Search

**Endpoint**: `GET /api/maps/places/nearby`

**Query Params**:
- `latitude`: 40.7128
- `longitude`: -74.0060
- `radius`: 5000
- `types`: "restaurant,cafe" (comma-separated)

**Response**: Same as places search

### Route Computation

**Endpoint**: `POST /api/maps/routes/compute`

**Request**:
```typescript
{
  origin: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  destination: {
    latitude: 40.758,
    longitude: -73.9855
  },
  waypoints: [
    { latitude: 40.730, longitude: -74.000 }
  ],
  travel_mode: "DRIVE",
  avoid: ["tolls", "highways"]
}
```

**Response**:
```typescript
{
  legs: [
    {
      start_address: "40.7128, -74.0060",
      end_address: "40.758, -73.9855",
      distance: 5234,  // meters
      duration: 780,   // seconds
      steps: [
        {
          instruction: "Head north on 5th Ave",
          distance: 234,
          duration: 45,
          start_location: { latitude: 40.7128, longitude: -74.0060 },
          end_location: { latitude: 40.715, longitude: -74.006 }
        }
      ]
    }
  ],
  polyline: "encoded_polyline_string",
  distance: 5234,
  duration: 780,
  travel_mode: "DRIVE"
}
```

### Place Details

**Endpoint**: `GET /api/maps/places/{place_id}`

**Response**: Detailed place information including hours, website, phone

## Frontend Usage

### Example: Search Places

```typescript
import { backendMapService } from '../services/backendMapService';

const searchPlaces = async () => {
  // Frontend sends request to backend
  const places = await backendMapService.searchPlaces({
    query: 'restaurants near me',
    latitude: userLat,
    longitude: userLng,
    radius: 5000,
    min_rating: 4.0
  });

  // Backend returns processed data
  // Frontend renders markers on Google Maps
  places.forEach(place => {
    createMarker(map, {
      lat: place.location.latitude,
      lng: place.location.longitude
    }, {
      title: place.name,
      content: place.formatted_address
    });
  });
};
```

### Example: Compute Route

```typescript
const computeRoute = async () => {
  // Backend calls Google Routes API
  const route = await backendMapService.computeRoutes({
    origin: { latitude: startLat, longitude: startLng },
    destination: { latitude: endLat, longitude: endLng },
    travel_mode: 'DRIVE'
  });

  // Frontend draws polyline on map
  const path = decodePolyline(route.polyline);
  const polyline = new google.maps.Polyline({
    path: path,
    map: map,
    strokeColor: '#4285F4'
  });
};
```

## Benefits of This Architecture

### 🔒 Security
- ✅ API key stored ONLY on backend server
- ✅ Frontend never sees or exposes API key
- ✅ Domain restrictions enforced on server
- ✅ Rate limiting centralized

### ⚡ Performance
- ✅ Backend can cache API responses
- ✅ Reduce redundant API calls
- ✅ Aggregate multiple requests
- ✅ Optimize data transfer

### 🎯 Control
- ✅ Centralized API key management
- ✅ Monitor and log all API usage
- ✅ Apply business logic to API responses
- ✅ A/B test different providers

### 💰 Cost Management
- ✅ Track API usage per user/session
- ✅ Implement quotas and limits
- ✅ Cache expensive operations
- ✅ Batch requests when possible

### 🛠️ Maintainability
- ✅ Update API integrations without frontend changes
- ✅ Test backend API calls independently
- ✅ Version API endpoints
- ✅ Easier to add new map features

## Comparison: Backend vs Frontend API Calls

### Option 1: Frontend Calls Google APIs (OLD)

```
Frontend → Google Maps API (with exposed key) → Display
```

**Pros**:
- Simple for static sites
- Lower server costs
- Faster for client

**Cons**:
- ❌ API key exposed in browser
- ❌ No rate limiting control
- ❌ Can't cache responses
- ❌ Hard to change providers
- ❌ No usage tracking

### Option 2: Backend Calls Google APIs (NEW - RECOMMENDED)

```
Frontend → Backend API → Google Maps API → Backend → Frontend Display
```

**Pros**:
- ✅ API key secure on server
- ✅ Full control over requests
- ✅ Can cache/optimize
- ✅ Easy to track usage
- ✅ Can add business logic

**Cons**:
- Requires backend server
- Slight latency increase
- More complex setup

## Migration Steps

### Step 1: Backend Setup

1. Install httpx in backend:
   ```bash
   pip install httpx
   ```

2. Add API key to backend `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIza...
   ```

3. Files created:
   - `backend/services/backend_places_service.py`
   - `backend/services/backend_routes_service.py`

4. Endpoints added to `backend/main.py`:
   - POST `/api/maps/places/search`
   - GET `/api/maps/places/nearby`
   - GET `/api/maps/places/{place_id}`
   - POST `/api/maps/routes/compute`

### Step 2: Frontend Setup

1. Create `backendMapService.ts`:
   - Methods to call backend endpoints
   - Type definitions for requests/responses

2. Update components:
   - Replace direct Google API calls with backend calls
   - Example: `MapView.tsx`, `AIGuide.tsx`

### Step 3: Testing

1. Start backend:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. Test endpoints:
   ```bash
   # Search places
   curl -X POST http://localhost:8000/api/maps/places/search \
     -H "Content-Type: application/json" \
     -d '{"query":"restaurants","latitude":40.7128,"longitude":-74.0060}'

   # Compute route
   curl -X POST http://localhost:8000/api/maps/routes/compute \
     -H "Content-Type: application/json" \
     -d '{"origin":{"latitude":40.7128,"longitude":-74.0060},"destination":{"latitude":40.758,"longitude":-73.9855}}'
   ```

3. Test frontend:
   ```bash
   npm run dev
   ```

## Next Steps

1. ✅ Backend services created
2. ✅ API endpoints added
3. ✅ Frontend service created
4. ⏳ Update MapView to use backend service
5. ⏳ Test integration end-to-end
6. ⏳ Add caching (Redis)
7. ⏳ Add rate limiting
8. ⏳ Monitor API usage

## Summary

This architecture gives you:
- **Backend**: API key security, data processing, caching, rate limiting
- **Frontend**: Map rendering, user interactions, data display

It's the **best of both worlds** - secure server-side API calls with client-side map rendering for smooth UX!
