# Debugging Transit Routes - Console Logs Guide

## Overview
Added comprehensive console logging to debug transit route display issues.

## Console Log Locations

### 1. Routes API Service (`routesApi.ts`)

**Location**: `computeRoutes` function
**Logs**:
```javascript
🗺️ Routes API Request: {
  travelMode: "TRANSIT",
  fieldMask: "routes.duration,routes...",
  requestBody: { origin, destination, travelMode, ... }
}

🗺️ Routes API Response: {
  routes: [...]
}
```

**Purpose**: 
- Verify request is correct
- Check if API is returning transit details
- Validate field mask includes transit fields

### 2. MapView Component - showDirections Function

**Location**: After receiving route response
**Logs**:
```javascript
🗺️ Route response: { legs, polyline, ... }
🚇 Travel mode: "TRANSIT"
🚇 Route legs: [...]
```

**Purpose**: Verify route data structure

**Location**: When processing TRANSIT mode
**Logs**:
```javascript
🚇 Processing TRANSIT mode
🚇 Leg steps: [...]
🚇 Step 1: { transitDetails, travelMode, ... }
🚇 Step 2: { transitDetails, travelMode, ... }
...
🚇 Transit steps collected: [...]
🚇 Setting transit instructions: { steps, totalDistance, ... }
```

**Purpose**: 
- Verify TRANSIT mode is detected
- Check if steps contain transitDetails
- Validate data structure before setting state

### 3. MapView Component - Render Phase

**Location**: Transit instructions component
**Logs**:
```javascript
🎨 Rendering transit instructions: { steps, totalDistance, totalDuration, fare }
```

**Purpose**: Verify component is actually rendering

## Debugging Checklist

### Issue: No route displayed on map

1. **Check Routes API Request**
   ```
   Look for: 🗺️ Routes API Request
   Verify: 
   - travelMode is "TRANSIT"
   - requestBody has valid origin/destination
   - fieldMask includes "routes.legs.steps.transitDetails"
   ```

2. **Check Routes API Response**
   ```
   Look for: 🗺️ Routes API Response
   Verify:
   - routes array is not empty
   - routes[0].polyline.encodedPolyline exists
   - routes[0].legs exists and has steps
   ```

3. **Check Polyline Decoding**
   ```
   Look for any errors in decodePolyline()
   Verify: Path is being drawn on map
   ```

### Issue: Transit instructions card not showing

1. **Check if TRANSIT mode detected**
   ```
   Look for: 🚇 Travel mode: "TRANSIT"
   If missing: Check travelMode parameter passed to showDirections()
   ```

2. **Check leg steps processing**
   ```
   Look for: 🚇 Processing TRANSIT mode
   If missing: travelMode !== 'TRANSIT' or route.legs is empty
   ```

3. **Check step details**
   ```
   Look for: 🚇 Step 1: ...
   Verify:
   - Steps exist
   - transitDetails property exists for transit steps
   - travelMode property exists for walk steps
   ```

4. **Check collected steps**
   ```
   Look for: 🚇 Transit steps collected: [...]
   Verify: Array is not empty
   ```

5. **Check state update**
   ```
   Look for: 🚇 Setting transit instructions: ...
   Verify: Object has steps array with data
   ```

6. **Check component render**
   ```
   Look for: 🎨 Rendering transit instructions: ...
   If missing: transitInstructions state is null/undefined
   ```

## Common Issues & Solutions

### Issue 1: Field Mask Not Including Transit Details
**Symptom**: Steps don't have `transitDetails` property
**Solution**: Verify field mask includes:
```
routes.legs.steps.transitDetails
routes.legs.steps.travelMode
routes.legs.steps.navigationInstruction
routes.legs.steps.localizedValues
```

### Issue 2: Travel Mode Not Set Correctly
**Symptom**: `🚇 Processing TRANSIT mode` never logs
**Solution**: Check that `travelMode` parameter is exactly `"TRANSIT"` (case-sensitive)

### Issue 3: Route Legs Empty
**Symptom**: `route.legs` is undefined or empty array
**Solution**: 
- Check API response structure
- Verify origin/destination are valid
- Check if API returned error

### Issue 4: Component Not Rendering
**Symptom**: No `🎨 Rendering transit instructions` log
**Solution**: 
- Check if `transitInstructions` state was set
- Verify conditional rendering: `{transitInstructions && ...}`
- Check for JSX syntax errors

### Issue 5: Steps Array Empty
**Symptom**: `🚇 Transit steps collected: []`
**Solution**:
- Verify steps have either `transitDetails` or `travelMode: 'WALK'`
- Check step structure in API response
- Verify forEach loop is executing

## Testing Commands

### Test Transit Route
```javascript
// In browser console after loading map:
// Check state
console.log('Transit instructions:', transitInstructions);

// Manually trigger
showDirections(
  { lat: 40.64, lng: -73.78 }, // JFK
  { lat: 40.758, lng: -73.985 }, // Times Square
  'TRANSIT'
);
```

### Test Routes API Directly
```javascript
import { computeRoutes, TravelMode, latLngToLocation } from './routesApi';

await computeRoutes({
  origin: {
    location: {
      latLng: latLngToLocation({ lat: 40.64, lng: -73.78 })
    }
  },
  destination: {
    location: {
      latLng: latLngToLocation({ lat: 40.758, lng: -73.985 })
    }
  },
  travelMode: TravelMode.TRANSIT
});
```

## Expected Console Output (Success)

```
🗺️ Routes API Request: {
  travelMode: "TRANSIT",
  fieldMask: "routes.duration,routes.distanceMeters,...,routes.legs.steps.transitDetails,...",
  requestBody: {
    origin: { location: { latLng: { latitude: 40.64, longitude: -73.78 } } },
    destination: { location: { latLng: { latitude: 40.758, longitude: -73.985 } } },
    travelMode: "TRANSIT",
    ...
  }
}

🗺️ Routes API Response: {
  routes: [
    {
      legs: [ { steps: [...] } ],
      polyline: { encodedPolyline: "..." },
      ...
    }
  ]
}

🗺️ Route response: { legs: [...], polyline: {...}, ... }
🚇 Travel mode: "TRANSIT"
🚇 Route legs: [ { steps: [...] } ]

🚇 Processing TRANSIT mode
🚇 Leg steps: [ { transitDetails: {...}, travelMode: "TRANSIT" }, { travelMode: "WALK" }, ... ]

🚇 Step 1: { transitDetails: {...}, distanceMeters: 15234, ... }
🚇 Step 2: { travelMode: "WALK", distanceMeters: 234, ... }
🚇 Step 3: { transitDetails: {...}, distanceMeters: 8456, ... }

🚇 Transit steps collected: [
  { type: "transit", index: 1, transitDetails: {...}, ... },
  { type: "walk", index: 2, distance: "234 m", ... },
  { type: "transit", index: 3, transitDetails: {...}, ... }
]

🚇 Setting transit instructions: {
  steps: [...],
  totalDistance: "23.5 km",
  totalDuration: "45 min",
  fare: { currencyCode: "USD", units: "5", nanos: 500000000 }
}

🎨 Rendering transit instructions: {
  steps: [...],
  totalDistance: "23.5 km",
  totalDuration: "45 min"
}
```

## Removing Debug Logs

Once debugging is complete, remove console.log statements:

1. **routesApi.ts**: Lines ~239-242, ~260-261
2. **MapView.tsx**: Lines ~576-578, ~611, ~615, ~625-626, ~632, ~1341

---

**Created**: 2025-10-20
**Purpose**: Debug transit route display issues
