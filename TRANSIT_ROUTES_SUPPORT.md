# Transit Routes Support - Routes API Implementation

## Overview
Implemented full support for public transit directions using the Google Routes API (New). Transit routes use buses, subways, trains, and other public transportation options.

## Changes Made

### 1. Added Transit-Specific Types (`routesApi.ts`)

```typescript
// Transit travel modes (for transit preferences)
export enum TransitMode {
  BUS = 'BUS',
  SUBWAY = 'SUBWAY',
  TRAIN = 'TRAIN',
  LIGHT_RAIL = 'LIGHT_RAIL',
  RAIL = 'RAIL'
}

// Transit routing preferences (replaces routingPreference for TRANSIT)
export enum TransitRoutingPreference {
  LESS_WALKING = 'LESS_WALKING',
  FEWER_TRANSFERS = 'FEWER_TRANSFERS'
}

// Transit preferences interface
export interface TransitPreferences {
  allowedTravelModes?: TransitMode[];
  routingPreference?: TransitRoutingPreference;
}
```

### 2. Updated Request Interface

```typescript
export interface ComputeRoutesRequest {
  // ... existing fields ...
  arrivalTime?: string;              // NEW: For transit scheduling
  transitPreferences?: TransitPreferences;  // NEW: Transit-specific options
}
```

### 3. Updated `computeRoutes` Function

**Key improvements:**
- ✅ **Conditional parameter handling** based on travel mode
- ✅ **Proper transit preferences** support
- ✅ **Arrival/departure time** support for transit
- ✅ **Extended field mask** to include transit details
- ✅ **Removed unsupported parameters** for transit mode

**Logic:**
```typescript
if (travelMode === TravelMode.TRANSIT) {
  // Use transitPreferences (not routingPreference)
  // Support arrivalTime or departureTime
  // No intermediates or routeModifiers
} else {
  // Use routingPreference
  // Support intermediates and routeModifiers
  // Only departureTime
}
```

## Transit Route Differences from Other Routes

| Feature | Non-Transit Modes | Transit Mode |
|---------|-------------------|--------------|
| **Routing Preference** | `TRAFFIC_AWARE`, `TRAFFIC_UNAWARE` | ❌ Not supported |
| **Transit Preferences** | ❌ Not supported | ✅ `LESS_WALKING`, `FEWER_TRANSFERS` |
| **Intermediate Waypoints** | ✅ Supported | ❌ Not supported |
| **Route Modifiers** | ✅ Avoid tolls/highways/ferries | ❌ Not supported |
| **Timing** | `departureTime` only | ✅ `arrivalTime` OR `departureTime` |
| **Transit Details** | N/A | ✅ Stop details, headsign, transit line, vehicle type |
| **Eco-Friendly Routes** | ✅ Supported | ❌ Not supported |

## API Request Examples

### Basic Transit Route
```typescript
await computeRoutes({
  origin: { address: "JFK Airport, NY" },
  destination: { address: "Times Square, NY" },
  travelMode: TravelMode.TRANSIT
});
```

### Transit Route with Preferences
```typescript
await computeRoutes({
  origin: { address: "Airport, Lisbon" },
  destination: { address: "Basilica of Estrela, Lisbon" },
  travelMode: TravelMode.TRANSIT,
  transitPreferences: {
    routingPreference: TransitRoutingPreference.LESS_WALKING,
    allowedTravelModes: [TransitMode.TRAIN, TransitMode.SUBWAY]
  },
  departureTime: "2025-10-21T10:00:00Z",
  computeAlternativeRoutes: true
});
```

### Transit Route with Arrival Time
```typescript
await computeRoutes({
  origin: { address: "Home" },
  destination: { address: "Office" },
  travelMode: TravelMode.TRANSIT,
  arrivalTime: "2025-10-21T09:00:00Z",  // Arrive by 9 AM
  transitPreferences: {
    routingPreference: TransitRoutingPreference.FEWER_TRANSFERS
  }
});
```

## Response Fields (Transit-Specific)

### Transit Details in Response
When `travelMode: TRANSIT`, the response includes:

```typescript
routes.legs.steps.transitDetails: {
  stopDetails: {
    departureStop: { name, location },
    arrivalStop: { name, location },
    departureTime: "2025-10-21T10:32:10Z",
    arrivalTime: "2025-10-21T10:49:42Z"
  },
  headsign: "Downtown",
  transitLine: {
    agencies: [{ name, phoneNumber, uri }],
    name: "Red Line",
    nameShort: "R",
    color: "#FF0000",
    vehicle: {
      type: "SUBWAY",
      name: { text: "Metro" },
      iconUri: "..."
    }
  },
  stopCount: 11
}
```

### Transit Fare (if available)
```typescript
routes.travelAdvisory.transitFare: {
  currencyCode: "USD",
  units: "5",
  nanos: 500000000  // $5.50
}
```

## Time Constraints for Transit

Transit schedules are subject to availability:

| Time Range | Description |
|------------|-------------|
| **Past** | Up to 7 days before now |
| **Future** | Up to 100 days after now |
| **Default** | Current time if not specified |

**Note:** Transit schedules change frequently. No guarantee for consistent results far in advance.

## Field Mask for Transit

The implementation automatically includes transit-specific fields when `travelMode: TRANSIT`:

```
routes.duration
routes.distanceMeters
routes.polyline.encodedPolyline
routes.legs
routes.viewport
routes.localizedValues
routes.description
routes.legs.steps.transitDetails        ← Transit-specific
routes.travelAdvisory.transitFare       ← Transit-specific
```

## Error Handling

Common transit-related errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "Routing preference cannot be set for TRANSIT" | Used `routingPreference` with TRANSIT | ✅ Fixed - now uses `transitPreferences` |
| "Invalid intermediate waypoints" | Used intermediates with TRANSIT | ✅ Fixed - intermediates excluded for TRANSIT |
| "Invalid route modifiers" | Used avoid tolls/highways with TRANSIT | ✅ Fixed - routeModifiers excluded for TRANSIT |

## Frontend Integration

The frontend (`MapView.tsx`) automatically uses the correct travel mode:

```typescript
await showDirections(origin, destination, 'TRANSIT');
```

The Routes API handler now:
1. Detects `TRANSIT` mode
2. Uses `transitPreferences` instead of `routingPreference`
3. Includes transit details in field mask
4. Excludes unsupported parameters

## Testing

Test transit routes with these queries:
- ✅ "Show me transit directions from JFK Airport to Times Square"
- ✅ "How do I get from home to work by public transport?"
- ✅ "Transit route from Airport to downtown with less walking"
- ✅ "Bus and subway directions avoiding trains"

## Documentation References

- [Transit Routes - Google Routes API](https://developers.google.com/maps/documentation/routes/transit-route)
- [Transit Preferences](https://developers.google.com/maps/documentation/routes/transit-route#transit-fields)
- [Transit Response Details](https://developers.google.com/maps/documentation/routes/transit-route#review-transit-responses)

## Related Files

- `src/services/routesApi.ts` - Routes API service with transit support
- `src/components/MapView.tsx` - Frontend map component
- `backend/services/agent_service.py` - Backend agent for route queries

---

**Status**: ✅ Fully Implemented
**Version**: 1.0
**Last Updated**: 2025-10-20
