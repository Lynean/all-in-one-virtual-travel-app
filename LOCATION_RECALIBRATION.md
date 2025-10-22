# Location Recalibration in Google Maps API

## Overview

The map now supports recalibrating the user's location to any coordinate programmatically. This feature allows you to:

- Update the blue dot marker to a new position
- Simulate being in different locations
- Test location-based features without physical travel
- Manually set location when GPS is unavailable

## Implementation

### Core Function

```typescript
const recalibrateUserLocation = async (
  newLocation: MapLocation,      // New coordinates {lat, lng}
  recenterMap: boolean = true,    // Whether to recenter map
  zoomLevel?: number              // Optional zoom level
) => {
  // Updates userLocation state
  // Moves the blue dot marker
  // Optionally recenters and zooms the map
}
```

### MapLocation Interface

```typescript
interface MapLocation {
  lat: number;  // Latitude (-90 to 90)
  lng: number;  // Longitude (-180 to 180)
}
```

## Usage Examples

### 1. Basic Recalibration

```typescript
// Recalibrate to Paris, recenter map at default zoom
recalibrateUserLocation({ lat: 48.8566, lng: 2.3522 });
```

### 2. Recalibrate with Custom Zoom

```typescript
// Recalibrate to Tokyo with zoom level 15
recalibrateUserLocation({ lat: 35.6762, lng: 139.6503 }, true, 15);
```

### 3. Update Without Recentering

```typescript
// Update location but keep current map view
recalibrateUserLocation({ lat: 40.7128, lng: -74.0060 }, false);
```

### 4. Programmatic Location Change

```typescript
// Example: Move user location based on route progress
const updateLocationAlongRoute = (progress: number, waypoints: MapLocation[]) => {
  const currentPosition = interpolatePosition(waypoints, progress);
  recalibrateUserLocation(currentPosition, false);
};
```

### 5. Reset to GPS Location

```typescript
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition((position) => {
    recalibrateUserLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }, true, 15);
  });
}
```

## Quick Location Presets (UI)

The UI now includes quick-access buttons to jump to major cities:

- **📍 NYC**: New York City (40.7128, -74.0060)
- **📍 London**: London, UK (51.5074, -0.1278)
- **📍 Tokyo**: Tokyo, Japan (35.6762, 139.6503)
- **🎯 GPS**: Reset to actual GPS location

## Technical Details

### What Happens During Recalibration

1. **State Updates**: Updates `userLocation` and `currentLocation` in store
2. **Marker Update**: Moves the blue dot marker to new coordinates using `marker.position = newLocation`
3. **Map Recentering** (optional): Calls `map.setCenter()` and `map.setZoom()`
4. **Info Window**: Existing "You are here" info window remains functional

### Marker Behavior

- The blue dot marker automatically updates its position
- No need to recreate the marker (efficient)
- Click interaction preserved after recalibration
- Smooth transition to new location

### Error Handling

```typescript
try {
  await recalibrateUserLocation(newLocation);
  console.log('✅ Location updated successfully');
} catch (error) {
  console.error('Failed to recalibrate:', error);
  // Displays error message in UI
}
```

## Use Cases

### 1. Testing Location-Based Features

```typescript
// Test nearby search in different cities
const testCities = [
  { name: 'Paris', coords: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Berlin', coords: { lat: 52.5200, lng: 13.4050 } },
  { name: 'Rome', coords: { lat: 41.9028, lng: 12.4964 } }
];

testCities.forEach(city => {
  recalibrateUserLocation(city.coords, true, 13);
  // Test features at this location
});
```

### 2. Virtual Location Simulation

```typescript
// Simulate a walking route
const walkingPath = [
  { lat: 40.7580, lng: -73.9855 }, // Times Square
  { lat: 40.7614, lng: -73.9776 }, // Midpoint
  { lat: 40.7648, lng: -73.9808 }  // Central Park
];

let step = 0;
const simulateWalking = setInterval(() => {
  if (step < walkingPath.length) {
    recalibrateUserLocation(walkingPath[step], false);
    step++;
  } else {
    clearInterval(simulateWalking);
  }
}, 2000); // Move every 2 seconds
```

### 3. Location History Playback

```typescript
// Replay a saved journey
const savedJourney = [
  { timestamp: '2025-10-17T10:00:00Z', lat: 48.8566, lng: 2.3522 },
  { timestamp: '2025-10-17T11:30:00Z', lat: 48.8606, lng: 2.3376 },
  { timestamp: '2025-10-17T14:00:00Z', lat: 48.8738, lng: 2.2950 }
];

savedJourney.forEach((point, index) => {
  setTimeout(() => {
    recalibrateUserLocation(
      { lat: point.lat, lng: point.lng },
      true,
      14
    );
  }, index * 3000); // 3 seconds between each point
});
```

### 4. Click-to-Set Location

```typescript
// Allow users to click the map to set their location
mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
  if (e.latLng) {
    const clickedLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    recalibrateUserLocation(clickedLocation, false);
  }
});
```

## API Reference

### Function Signature

```typescript
recalibrateUserLocation(
  newLocation: MapLocation,
  recenterMap?: boolean,
  zoomLevel?: number
): Promise<void>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `newLocation` | `MapLocation` | Required | New coordinates with `lat` and `lng` |
| `recenterMap` | `boolean` | `true` | Whether to recenter the map to new location |
| `zoomLevel` | `number` | `undefined` | Optional zoom level (1-21) |

### Returns

- `Promise<void>`: Resolves when recalibration is complete

### Side Effects

- Updates `userLocation` state
- Updates `currentLocation` in global store
- Moves blue dot marker
- Optionally recenters and zooms map
- Logs success/error to console

## Coordinates Reference

### Popular Cities

```typescript
const worldLocations = {
  // North America
  newYork: { lat: 40.7128, lng: -74.0060 },
  sanFrancisco: { lat: 37.7749, lng: -122.4194 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  
  // Europe
  london: { lat: 51.5074, lng: -0.1278 },
  paris: { lat: 48.8566, lng: 2.3522 },
  berlin: { lat: 52.5200, lng: 13.4050 },
  rome: { lat: 41.9028, lng: 12.4964 },
  
  // Asia
  tokyo: { lat: 35.6762, lng: 139.6503 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  hongKong: { lat: 22.3193, lng: 114.1694 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  
  // Oceania
  sydney: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  
  // South America
  saoPaulo: { lat: -23.5505, lng: -46.6333 },
  buenosAires: { lat: -34.6037, lng: -58.3816 }
};
```

## Best Practices

1. **Always validate coordinates** before recalibration:
   ```typescript
   const isValidCoordinate = (lat: number, lng: number) => {
     return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
   };
   ```

2. **Use appropriate zoom levels**:
   - City view: 10-13
   - Street view: 14-16
   - Building view: 17-19

3. **Provide user feedback**:
   ```typescript
   setLocationError(`Location updated to ${cityName}`);
   ```

4. **Handle errors gracefully**:
   ```typescript
   try {
     await recalibrateUserLocation(newLocation);
   } catch (error) {
     setLocationError('Failed to update location. Please try again.');
   }
   ```

## Limitations

- Requires map instance to be initialized
- Marker must be created before recalibration
- Cannot recalibrate during map loading
- Maximum zoom level is 21

## Future Enhancements

- [ ] Smooth animation between locations
- [ ] Location history tracking
- [ ] Custom location presets
- [ ] Geocoding integration (address to coordinates)
- [ ] Location sharing via URL parameters
- [ ] Offline coordinate caching

## Related Documentation

- [Google Maps JavaScript API - Map](https://developers.google.com/maps/documentation/javascript/reference/map)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
