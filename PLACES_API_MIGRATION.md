# Migration Guide: Legacy Places API → Places API (New)

This guide helps you migrate from the deprecated Google Maps Places API (legacy) to the new Places API.

## Overview

The new Places API provides:
- **Better performance** with REST API endpoints
- **More accurate place data** with enhanced details
- **Richer place information** including photos, opening hours, and reviews
- **Field masking** for optimized responses and cost control
- **New place types** and better categorization

## Quick Start

### Installation

The Places API (New) implementation is set up in:
- `src/services/placesApi.ts` - Core Places API service
- `src/services/placesApiExamples.ts` - Usage examples

### Basic Usage

```typescript
import { searchNearby, latLngToLocation } from './services/placesApi';

const response = await searchNearby({
  includedTypes: ['restaurant'],
  maxResultCount: 10,
  locationRestriction: {
    circle: {
      center: latLngToLocation({ lat: 37.7749, lng: -122.4194 }),
      radius: 2000
    }
  }
});

console.log(`Found ${response.places.length} restaurants`);
```

## API Migration Reference

### 1. Nearby Search

#### Old Code (Legacy)
```typescript
const service = new google.maps.places.PlacesService(map);

const request: google.maps.places.PlaceSearchRequest = {
  location: { lat: 37.7749, lng: -122.4194 },
  radius: 2000,
  type: 'restaurant'
};

service.nearbySearch(request, (results, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    console.log(results);
  }
});
```

#### New Code (Places API New)
```typescript
import { searchNearby, latLngToLocation } from './services/placesApi';

const response = await searchNearby({
  includedTypes: ['restaurant'],
  maxResultCount: 10,
  locationRestriction: {
    circle: {
      center: latLngToLocation({ lat: 37.7749, lng: -122.4194 }),
      radius: 2000
    }
  },
  rankPreference: 'POPULARITY'
});

const places = response.places;
```

### 2. Text Search

#### Old Code (Legacy)
```typescript
const service = new google.maps.places.PlacesService(map);

const request: google.maps.places.TextSearchRequest = {
  query: 'pizza near San Francisco',
  location: { lat: 37.7749, lng: -122.4194 },
  radius: 5000
};

service.textSearch(request, (results, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    console.log(results);
  }
});
```

#### New Code (Places API New)
```typescript
import { searchText, latLngToLocation } from './services/placesApi';

const response = await searchText({
  textQuery: 'pizza near San Francisco',
  maxResultCount: 20,
  locationBias: {
    circle: {
      center: latLngToLocation({ lat: 37.7749, lng: -122.4194 }),
      radius: 5000
    }
  }
});

const places = response.places;
```

### 3. Place Details

#### Old Code (Legacy)
```typescript
const service = new google.maps.places.PlacesService(map);

service.getDetails({ placeId: 'ChIJ...' }, (place, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    console.log(place.name);
    console.log(place.formatted_address);
  }
});
```

#### New Code (Places API New)
```typescript
import { getPlaceDetails } from './services/placesApi';

const place = await getPlaceDetails('ChIJ...');
console.log(place.displayName?.text);
console.log(place.formattedAddress);
console.log(place.rating);
console.log(place.websiteUri);
```

### 4. Place Photos

#### Old Code (Legacy)
```typescript
if (place.photos && place.photos.length > 0) {
  const photoUrl = place.photos[0].getUrl({ maxWidth: 400 });
  console.log(photoUrl);
}
```

#### New Code (Places API New)
```typescript
import { getPhotoUrl } from './services/placesApi';

if (place.photos && place.photos.length > 0) {
  const photoUrl = getPhotoUrl(place.photos[0].name, 400);
  console.log(photoUrl);
}
```

## Parameter Conversion Table

### Search Parameters

| Legacy API | Places API (New) | Notes |
|-----------|------------------|-------|
| `location` | `locationRestriction.circle.center` | Now uses `Location` type with latitude/longitude |
| `radius` | `locationRestriction.circle.radius` | Same value in meters |
| `type` | `includedTypes[]` | Now accepts array of types |
| `keyword` | Part of `textQuery` | Use in text search |
| `name` | Part of `textQuery` | Use in text search |
| N/A | `excludedTypes[]` | **New**: Exclude certain place types |
| N/A | `rankPreference` | **New**: 'DISTANCE' or 'POPULARITY' |
| N/A | `maxResultCount` | Replaces implicit pagination |

### Response Fields

| Legacy API | Places API (New) | Notes |
|-----------|------------------|-------|
| `place.name` | `place.displayName.text` | Now includes language code |
| `place.formatted_address` | `place.formattedAddress` | Same format |
| `place.geometry.location` | `place.location` | Returns `Location` with latitude/longitude |
| `place.rating` | `place.rating` | Same |
| `place.user_ratings_total` | `place.userRatingCount` | Same value |
| `place.price_level` | `place.priceLevel` | Now string: 'PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', etc. |
| `place.opening_hours` | `place.regularOpeningHours` | Enhanced structure |
| `place.photos` | `place.photos` | Different structure, use `getPhotoUrl()` |
| `place.types` | `place.types` | Same array of types |
| N/A | `place.primaryType` | **New**: Main category of place |
| N/A | `place.businessStatus` | **New**: 'OPERATIONAL', 'CLOSED_TEMPORARILY', etc. |
| N/A | `place.websiteUri` | **New**: Official website |

## Place Types Conversion

Most place types remain the same, but some have changed:

| Legacy Type | New Type | Notes |
|------------|----------|-------|
| `lodging` | `lodging` | Same |
| `restaurant` | `restaurant` | Same |
| `cafe` | `cafe` | Same |
| `tourist_attraction` | `tourist_attraction` | Same |
| `shopping_mall` | `shopping_mall` | Same |

Use the `convertLegacyPlaceType()` helper function for automatic conversion.

## New Features

### 1. Rank Preference
```typescript
rankPreference: 'DISTANCE'  // or 'POPULARITY'
```

### 2. Exclude Types
```typescript
excludedTypes: ['bar', 'night_club']
```

### 3. Enhanced Opening Hours
```typescript
place.regularOpeningHours.openNow
place.regularOpeningHours.weekdayDescriptions
place.regularOpeningHours.periods
```

### 4. Business Status
```typescript
place.businessStatus  // 'OPERATIONAL', 'CLOSED_TEMPORARILY', etc.
```

### 5. Primary Type
```typescript
place.primaryType  // Main category
place.primaryTypeDisplayName.text  // Localized name
```

## Field Masks

The new API uses field masks to control which data is returned. This optimizes performance and cost:

```typescript
// Default fields requested:
'places.id,places.displayName,places.formattedAddress,places.location,
places.rating,places.userRatingCount,places.types,places.primaryType'
```

To add more fields, modify the `X-Goog-FieldMask` header in `placesApi.ts`.

## Error Handling

The new API uses standard HTTP status codes:

```typescript
try {
  const response = await searchNearby(request);
  // Process response
} catch (error) {
  console.error('Places API error:', error);
  // Handle error (404 = not found, 400 = invalid request, etc.)
}
```

## Cost Optimization

### Use Field Masks
Only request the fields you need:
```typescript
// Cheaper: Only basic fields
'places.id,places.displayName,places.location'

// More expensive: All fields including photos
'places.*'
```

### Limit Result Count
```typescript
maxResultCount: 10  // Instead of default 20
```

### Cache Results
Cache place data to avoid repeated API calls for the same places.

## Testing

### 1. Test Nearby Search
```typescript
import { searchNearbyRestaurants } from './services/placesApiExamples';

const places = await searchNearbyRestaurants(
  { lat: 37.7749, lng: -122.4194 },
  2000
);
console.log('Found places:', places);
```

### 2. Test Text Search
```typescript
import { searchPlacesByText } from './services/placesApiExamples';

const places = await searchPlacesByText(
  'best coffee shops',
  { lat: 37.7749, lng: -122.4194 }
);
```

### 3. Test Place Details
```typescript
import { getDetailedPlaceInfo } from './services/placesApiExamples';

const place = await getDetailedPlaceInfo('ChIJ...');
```

## Google Cloud Console Setup

### Enable Places API (New)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Library"
4. Search for "Places API (New)"
5. Click "Enable"

### (Optional) Disable Legacy API
Once fully migrated and tested:
1. Navigate to "APIs & Services" > "Enabled APIs"
2. Find "Places API" (legacy)
3. Click "Disable"

## Migration Checklist

- [x] Created Places API (New) service (`placesApi.ts`)
- [x] Created usage examples (`placesApiExamples.ts`)
- [x] Updated MapView component to use new API
- [x] Updated maps service to use new API
- [x] Added deprecation warnings to legacy code
- [x] Created migration documentation
- [ ] Enable Places API (New) in Google Cloud Console
- [ ] Test all place search features
- [ ] Update any remaining PlacesService usage
- [ ] Monitor API usage and costs
- [ ] Disable legacy Places API (after 100% migration)

## Common Issues

### Issue: "Places API (New) not enabled"
**Solution:** Enable it in [Google Cloud Console](https://console.cloud.google.com/apis/library/places.googleapis.com)

### Issue: "Invalid field mask"
**Solution:** Check the `X-Goog-FieldMask` header includes only valid fields

### Issue: "No places found"
**Solution:** 
- Verify coordinates are correct
- Check radius isn't too small
- Verify place types are valid
- Use text search as fallback

### Issue: "PERMISSION_DENIED"
**Solution:** 
- Ensure API key has Places API (New) enabled
- Check API key restrictions
- Verify billing is enabled

## API Endpoints

The new Places API uses REST endpoints:

- **Search Nearby**: `POST https://places.googleapis.com/v1/places:searchNearby`
- **Search Text**: `POST https://places.googleapis.com/v1/places:searchText`
- **Place Details**: `GET https://places.googleapis.com/v1/places/{placeId}`
- **Place Photos**: `GET https://places.googleapis.com/v1/{photoName}/media`

## Pricing

Places API (New) pricing (as of 2024):
- **Nearby Search**: $32.00 per 1,000 requests (Basic)
- **Text Search**: $32.00 per 1,000 requests (Basic)
- **Place Details**: Varies by fields requested
- **Place Photos**: $7.00 per 1,000 requests

💡 Use field masks to control costs - only request the data you need!

## Support & Resources

### Documentation
- 📖 [PLACES_API_MIGRATION.md](./PLACES_API_MIGRATION.md) - This guide
- 💡 [placesApiExamples.ts](./src/services/placesApiExamples.ts) - Code examples
- 🔧 [placesApi.ts](./src/services/placesApi.ts) - API implementation

### External Links
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Migration Overview](https://developers.google.com/maps/documentation/places/web-service/legacy/migrate-overview)
- [Place Types](https://developers.google.com/maps/documentation/places/web-service/place-types)
- [Field Masks](https://developers.google.com/maps/documentation/places/web-service/choose-fields)

### Need Help?
1. Check examples in `placesApiExamples.ts`
2. Review error messages in console
3. Verify API key has Places API (New) enabled
4. Check Google Cloud Console for quota/billing issues

## Next Steps

1. **Enable Places API (New)** in Google Cloud Console
2. **Test the implementation** by clicking "Nearby Places" buttons
3. **Update remaining code** if you have PlacesService elsewhere
4. **Monitor performance** and API usage
5. **Optimize field masks** to reduce costs

---

✨ **Migration completed successfully!** The new Places API is ready to use.
