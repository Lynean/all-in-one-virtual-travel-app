/**
 * Google Places API (New) Examples
 * 
 * This file demonstrates how to use the new Places API
 * to replace the legacy Places API
 */

import {
  searchNearby,
  searchText,
  getPlaceDetails,
  getPhotoUrl,
  latLngToLocation,
  locationToLatLng,
  convertLegacyPlaceType,
  type SearchNearbyRequest,
  type SearchTextRequest,
  type Place
} from './placesApi';

/**
 * Example 1: Search for nearby restaurants
 * Replaces: PlacesService.nearbySearch()
 */
export const searchNearbyRestaurants = async (
  center: { lat: number; lng: number },
  radiusMeters: number = 2000
) => {
  const request: SearchNearbyRequest = {
    includedTypes: ['restaurant'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: latLngToLocation(center),
        radius: radiusMeters
      }
    },
    rankPreference: 'DISTANCE'  // or 'POPULARITY'
  };

  const response = await searchNearby(request);
  
  console.log(`Found ${response.places.length} restaurants`);
  response.places.forEach(place => {
    console.log(`- ${place.displayName?.text}`);
    console.log(`  Address: ${place.formattedAddress}`);
    console.log(`  Rating: ${place.rating} (${place.userRatingCount} reviews)`);
  });
  
  return response.places;
};

/**
 * Example 2: Search for multiple place types nearby
 * Replaces: Multiple PlacesService.nearbySearch() calls
 */
export const searchNearbyMultipleTypes = async (
  center: { lat: number; lng: number },
  types: string[],
  radiusMeters: number = 2000
) => {
  const request: SearchNearbyRequest = {
    includedTypes: types.map(convertLegacyPlaceType),
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: latLngToLocation(center),
        radius: radiusMeters
      }
    }
  };

  const response = await searchNearby(request);
  return response.places;
};

/**
 * Example 3: Search for places with exclusions
 * New feature: Exclude certain types
 */
export const searchWithExclusions = async (
  center: { lat: number; lng: number },
  includedTypes: string[],
  excludedTypes: string[]
) => {
  const request: SearchNearbyRequest = {
    includedTypes,
    excludedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: latLngToLocation(center),
        radius: 2000
      }
    }
  };

  return await searchNearby(request);
};

/**
 * Example 4: Text search for places
 * Replaces: PlacesService.textSearch()
 */
export const searchPlacesByText = async (
  query: string,
  center?: { lat: number; lng: number },
  radiusMeters: number = 5000
) => {
  const request: SearchTextRequest = {
    textQuery: query,
    maxResultCount: 20
  };

  // Add location bias if center is provided
  if (center) {
    request.locationBias = {
      circle: {
        center: latLngToLocation(center),
        radius: radiusMeters
      }
    };
  }

  const response = await searchText(request);
  
  console.log(`Found ${response.places.length} places for "${query}"`);
  return response.places;
};

/**
 * Example 5: Search with specific place type filter
 * Replaces: PlacesService.textSearch() with type parameter
 */
export const searchTextWithType = async (
  query: string,
  placeType: string,
  center?: { lat: number; lng: number }
) => {
  const request: SearchTextRequest = {
    textQuery: query,
    includedType: convertLegacyPlaceType(placeType),
    maxResultCount: 20
  };

  if (center) {
    request.locationBias = {
      circle: {
        center: latLngToLocation(center),
        radius: 5000
      }
    };
  }

  const response = await searchText(request);
  return response.places;
};

/**
 * Example 6: Get detailed information about a place
 * Replaces: PlacesService.getDetails()
 */
export const getDetailedPlaceInfo = async (placeId: string) => {
  const place = await getPlaceDetails(placeId);
  
  console.log('Place Details:');
  console.log('  Name:', place.displayName?.text);
  console.log('  Address:', place.formattedAddress);
  console.log('  Phone:', place.nationalPhoneNumber);
  console.log('  Website:', place.websiteUri);
  console.log('  Rating:', place.rating);
  console.log('  Price Level:', place.priceLevel);
  console.log('  Open Now:', place.regularOpeningHours?.openNow);
  
  return place;
};

/**
 * Example 7: Get place photos
 * Replaces: PlaceResult.photos[].getUrl()
 */
export const getPlacePhotos = (place: Place, maxWidth: number = 400) => {
  if (!place.photos || place.photos.length === 0) {
    return [];
  }

  return place.photos.map(photo => ({
    url: getPhotoUrl(photo.name, maxWidth),
    width: photo.widthPx,
    height: photo.heightPx,
    attributions: photo.authorAttributions
  }));
};

/**
 * Example 8: Search and display on map
 * Complete example showing integration with Google Maps
 */
export const searchAndDisplayOnMap = async (
  map: google.maps.Map,
  center: { lat: number; lng: number },
  placeType: string
) => {
  // Search for places
  const response = await searchNearby({
    includedTypes: [convertLegacyPlaceType(placeType)],
    maxResultCount: 10,
    locationRestriction: {
      circle: {
        center: latLngToLocation(center),
        radius: 2000
      }
    },
    rankPreference: 'POPULARITY'
  });

  // Create markers for each place
  const markers: google.maps.Marker[] = [];
  
  response.places.forEach(place => {
    if (!place.location) return;

    const position = locationToLatLng(place.location);
    
    const marker = new google.maps.Marker({
      position,
      map,
      title: place.displayName?.text,
      animation: google.maps.Animation.DROP
    });

    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600;">${place.displayName?.text}</h3>
          ${place.formattedAddress ? `<p style="margin: 4px 0; font-size: 12px;">${place.formattedAddress}</p>` : ''}
          ${place.rating ? `<p style="margin: 4px 0; font-size: 12px;">⭐ ${place.rating} (${place.userRatingCount} reviews)</p>` : ''}
          ${place.priceLevel ? `<p style="margin: 4px 0; font-size: 12px;">💰 ${place.priceLevel}</p>` : ''}
          ${place.businessStatus === 'OPERATIONAL' ? '<p style="margin: 4px 0; font-size: 12px; color: green;">✅ Open</p>' : ''}
          ${place.websiteUri ? `<p style="margin: 4px 0;"><a href="${place.websiteUri}" target="_blank" style="font-size: 12px;">Visit Website</a></p>` : ''}
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  });

  // Fit map bounds to show all markers
  if (markers.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(marker => {
      const position = marker.getPosition();
      if (position) bounds.extend(position);
    });
    map.fitBounds(bounds);
  }

  return { places: response.places, markers };
};

/**
 * Example 9: Filter places by rating
 * New feature: Client-side filtering after API response
 */
export const searchHighRatedPlaces = async (
  center: { lat: number; lng: number },
  placeType: string,
  minRating: number = 4.0
) => {
  const response = await searchNearby({
    includedTypes: [convertLegacyPlaceType(placeType)],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: latLngToLocation(center),
        radius: 2000
      }
    }
  });

  // Filter by rating
  const highRatedPlaces = response.places.filter(
    place => place.rating && place.rating >= minRating
  );

  console.log(`Found ${highRatedPlaces.length} places with rating >= ${minRating}`);
  return highRatedPlaces;
};

/**
 * Example 10: Get opening hours information
 * Replaces: PlaceResult.opening_hours
 */
export const checkIfPlaceIsOpen = async (placeId: string) => {
  const place = await getPlaceDetails(placeId);
  
  if (!place.regularOpeningHours) {
    return { isOpen: null, message: 'Opening hours not available' };
  }

  const isOpen = place.regularOpeningHours.openNow;
  const weekdayHours = place.regularOpeningHours.weekdayDescriptions;

  return {
    isOpen,
    message: isOpen ? 'Currently open' : 'Currently closed',
    weekdayHours
  };
};

/**
 * Migration Helper: Convert legacy request to new API format
 */
export const migrateLegacyNearbySearch = (
  legacyRequest: {
    location: { lat: number; lng: number };
    radius: number;
    type?: string;
    keyword?: string;
  }
): SearchNearbyRequest => {
  const newRequest: SearchNearbyRequest = {
    locationRestriction: {
      circle: {
        center: latLngToLocation(legacyRequest.location),
        radius: legacyRequest.radius
      }
    },
    maxResultCount: 20
  };

  if (legacyRequest.type) {
    newRequest.includedTypes = [convertLegacyPlaceType(legacyRequest.type)];
  }

  return newRequest;
};

/**
 * Migration Helper: Convert legacy text search to new API format
 */
export const migrateLegacyTextSearch = (
  legacyRequest: {
    query: string;
    location?: { lat: number; lng: number };
    radius?: number;
    type?: string;
  }
): SearchTextRequest => {
  const newRequest: SearchTextRequest = {
    textQuery: legacyRequest.query,
    maxResultCount: 20
  };

  if (legacyRequest.location) {
    newRequest.locationBias = {
      circle: {
        center: latLngToLocation(legacyRequest.location),
        radius: legacyRequest.radius || 5000
      }
    };
  }

  if (legacyRequest.type) {
    newRequest.includedType = convertLegacyPlaceType(legacyRequest.type);
  }

  return newRequest;
};
