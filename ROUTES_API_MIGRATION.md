# Migration Guide: Directions API → Routes API

This guide helps you migrate from the deprecated Google Maps Directions API and Distance Matrix API to the new Routes API.

## Overview

The Routes API is the next generation routing service that provides:
- **Better performance** with REST API endpoints
- **More accurate traffic predictions**
- **Enhanced route customization**
- **Structured response format**

## Quick Start

### Installation

The Routes API implementation is already set up in:
- `src/services/routesApi.ts` - Core Routes API service
- `src/services/routesApiExamples.ts` - Usage examples

### Basic Usage

```typescript
import { computeRoutes, latLngToLocation } from './services/routesApi';

const response = await computeRoutes({
  origin: {
    location: {
      latLng: latLngToLocation({ lat: 37.419734, lng: -122.0827784 })
    }
  },
  destination: {
    location: {
      latLng: latLngToLocation({ lat: 37.417670, lng: -122.079595 })
    }
  },
  travelMode: 'DRIVE'
});

const route = response.routes[0];
console.log('Distance:', route.distanceMeters);
console.log('Duration:', route.duration);
```

## API Migration Reference

### 1. Directions API → computeRoutes

#### Old Code (Deprecated)
```typescript
const directionsService = new google.maps.DirectionsService();

directionsService.route({
  origin: { lat: 37.419734, lng: -122.0827784 },
  destination: { lat: 37.417670, lng: -122.079595 },
  travelMode: google.maps.TravelMode.DRIVING
}, (result, status) => {
  if (status === google.maps.DirectionsStatus.OK) {
    console.log(result);
  }
});
```

#### New Code (Routes API)
```typescript
import { computeRoutes, latLngToLocation } from './services/routesApi';

const response = await computeRoutes({
  origin: {
    location: {
      latLng: latLngToLocation({ lat: 37.419734, lng: -122.0827784 })
    }
  },
  destination: {
    location: {
      latLng: latLngToLocation({ lat: 37.417670, lng: -122.079595 })
    }
  },
  travelMode: 'DRIVE'
});

const route = response.routes[0];
```

### 2. Distance Matrix API → computeRouteMatrix

#### Old Code (Deprecated)
```typescript
const service = new google.maps.DistanceMatrixService();

service.getDistanceMatrix({
  origins: [{ lat: 40.7128, lng: -74.0060 }],
  destinations: [{ lat: 34.0522, lng: -118.2437 }],
  travelMode: google.maps.TravelMode.DRIVING
}, (response, status) => {
  if (status === 'OK') {
    console.log(response.rows[0].elements[0]);
  }
});
```

#### New Code (Routes API)
```typescript
import { computeRouteMatrix, latLngToLocation } from './services/routesApi';

const response = await computeRouteMatrix({
  origins: [{
    location: {
      latLng: latLngToLocation({ lat: 40.7128, lng: -74.0060 })
    }
  }],
  destinations: [{
    location: {
      latLng: latLngToLocation({ lat: 34.0522, lng: -118.2437 })
    }
  }],
  travelMode: 'DRIVE'
});

const element = response.data[0];
console.log('Distance:', element.distanceMeters);
console.log('Duration:', element.duration);
```

## Parameter Conversion Table

### Travel Modes

| Old API | Routes API |
|---------|-----------|
| `google.maps.TravelMode.DRIVING` | `TravelMode.DRIVE` |
| `google.maps.TravelMode.WALKING` | `TravelMode.WALK` |
| `google.maps.TravelMode.BICYCLING` | `TravelMode.BICYCLE` |
| `google.maps.TravelMode.TRANSIT` | `TravelMode.TRANSIT` |
| N/A | `TravelMode.TWO_WHEELER` (new) |

### Route Options

| Old API | Routes API |
|---------|-----------|
| `avoidTolls` | `routeModifiers.avoidTolls` |
| `avoidHighways` | `routeModifiers.avoidHighways` |
| `avoidFerries` | `routeModifiers.avoidFerries` |
| `provideRouteAlternatives` | `computeAlternativeRoutes` |
| `waypoints` | `intermediates` |
| `optimizeWaypoints` | Not supported (use route optimization API) |
| `drivingOptions.departureTime` | `departureTime` |
| `unitSystem` | `units` (METRIC or IMPERIAL) |

### Response Fields

| Old API | Routes API |
|---------|-----------|
| `routes[0].legs[0].distance.value` | `routes[0].distanceMeters` |
| `routes[0].legs[0].duration.value` | `routes[0].duration` (in seconds with "s" suffix) |
| `routes[0].legs[0].duration.text` | `routes[0].localizedValues.duration.text` |
| `routes[0].overview_polyline` | `routes[0].polyline.encodedPolyline` |
| `routes[0].bounds` | `routes[0].viewport` |

## Features Comparison

### New Features in Routes API

✅ **Traffic-aware routing preferences**
```typescript
routingPreference: RoutingPreference.TRAFFIC_AWARE_OPTIMAL
```

✅ **High-quality polylines**
```typescript
polylineQuality: 'HIGH_QUALITY'
```

✅ **Localized values**
```typescript
route.localizedValues.distance.text  // "1.5 km"
route.localizedValues.duration.text  // "5 mins"
```

✅ **Route descriptions**
```typescript
route.description  // Human-readable route description
```

### Removed Features

❌ **Transit routing** - Limited support (use Transit API instead)
❌ **Waypoint optimization** - Use Route Optimization API
❌ **Region biasing** - Use language and region codes instead

## Display Routes on Map

### Old Code
```typescript
const directionsRenderer = new google.maps.DirectionsRenderer({
  map: mapInstance,
  directions: directionsResult
});
```

### New Code
```typescript
import { decodePolyline } from './services/routesApi';

const path = decodePolyline(route.polyline.encodedPolyline);

const polyline = new google.maps.Polyline({
  path,
  map: mapInstance,
  strokeColor: '#4F46E5',
  strokeWeight: 5,
  strokeOpacity: 0.8
});

// Fit map to route bounds
if (route.viewport) {
  const bounds = new google.maps.LatLngBounds(
    locationToLatLng(route.viewport.low),
    locationToLatLng(route.viewport.high)
  );
  map.fitBounds(bounds);
}
```

## Error Handling

Routes API uses standard HTTP status codes:

```typescript
try {
  const response = await computeRoutes(request);
  // Process response
} catch (error) {
  console.error('Routes API error:', error);
  // Handle error (404 = no route found, 400 = invalid request, etc.)
}
```

## Performance Optimization

### Use Field Masks
The Routes API uses field masks to request only needed data:

```typescript
// In routesApi.ts, the X-Goog-FieldMask header controls returned fields
'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline'
```

### Caching
Consider caching route results for frequently requested origins/destinations.

## Testing

Test your Routes API integration:

1. **Simple Route Test**
```typescript
import { getSimpleRoute } from './services/routesApiExamples';

const route = await getSimpleRoute(
  { lat: 40.7128, lng: -74.0060 },  // NYC
  { lat: 34.0522, lng: -118.2437 }  // LA
);
console.log('Route found:', route);
```

2. **Display on Map**
```typescript
import { displayRouteOnMap } from './services/routesApiExamples';

const polyline = await displayRouteOnMap(
  mapInstance,
  origin,
  destination
);
```

3. **Distance Matrix Test**
```typescript
import { getDistanceMatrix } from './services/routesApiExamples';

const matrix = await getDistanceMatrix(
  [origin1, origin2],
  [dest1, dest2]
);
```

## API Key Requirements

The Routes API uses the same Google Maps API key, but ensure you have:

1. **Routes API enabled** in Google Cloud Console
2. **Directions API** can be disabled once migration is complete
3. **Distance Matrix API** can be disabled once migration is complete

## Common Issues

### Issue: "Routes API not enabled"
**Solution:** Enable Routes API in Google Cloud Console:
https://console.cloud.google.com/apis/library/routes.googleapis.com

### Issue: "Invalid field mask"
**Solution:** Check the `X-Goog-FieldMask` header includes only valid fields

### Issue: "No routes found"
**Solution:** Verify origin and destination coordinates are valid and routable

## Further Reading

- [Routes API Documentation](https://developers.google.com/maps/documentation/routes)
- [Migration Guide](https://developers.google.com/maps/documentation/routes/migrate-routes)
- [Routes API Reference](https://developers.google.com/maps/documentation/routes/reference/rest)
- [Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Compute Route Matrix](https://developers.google.com/maps/documentation/routes/route_matrix)

## Support

For issues with the migration:
1. Check the examples in `src/services/routesApiExamples.ts`
2. Review error messages in browser console
3. Verify API key has Routes API enabled
4. Check [Google Maps Platform Status](https://status.cloud.google.com/)
