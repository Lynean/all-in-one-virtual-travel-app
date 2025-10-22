/**
 * Google Places API (New) Service
 * Migrated from legacy Places API
 * Documentation: https://developers.google.com/maps/documentation/places/web-service/overview
 */

import { configService } from './configService';

let API_KEY: string | null = null;

const getApiKey = async (): Promise<string> => {
  if (!API_KEY) {
    API_KEY = await configService.getGoogleMapsApiKey();
  }
  return API_KEY;
};

const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationRestriction {
  circle?: {
    center: Location;
    radius: number;
  };
}

export interface SearchNearbyRequest {
  includedTypes?: string[];
  excludedTypes?: string[];
  maxResultCount?: number;
  locationRestriction?: LocationRestriction;
  rankPreference?: 'RANK_PREFERENCE_UNSPECIFIED' | 'DISTANCE' | 'POPULARITY';
  languageCode?: string;
}

export interface SearchTextRequest {
  textQuery: string;
  includedType?: string;
  maxResultCount?: number;
  locationBias?: LocationRestriction;
  languageCode?: string;
}

export interface Place {
  id: string;
  formattedAddress?: string;
  location?: Location;
  rating?: number;
  userRatingCount?: number;
  displayName?: {
    text: string;
    languageCode: string;
  };
  primaryType?: string;
  primaryTypeDisplayName?: {
    text: string;
    languageCode: string;
  };
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  priceLevel?: string;
  businessStatus?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions: Array<{
      displayName: string;
      uri: string;
      photoUri: string;
    }>;
  }>;
  viewport?: {
    low: Location;
    high: Location;
  };
}

export interface SearchNearbyResponse {
  places: Place[];
}

export interface SearchTextResponse {
  places: Place[];
}

/**
 * Search for places near a location
 * Replaces: PlacesService.nearbySearch()
 */
export const searchNearby = async (
  request: SearchNearbyRequest
): Promise<SearchNearbyResponse> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${PLACES_API_BASE_URL}/places:searchNearby`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.primaryTypeDisplayName,places.nationalPhoneNumber,places.businessStatus,places.priceLevel,places.websiteUri,places.regularOpeningHours,places.photos,places.viewport'
        },
        body: JSON.stringify({
          includedTypes: request.includedTypes,
          excludedTypes: request.excludedTypes,
          maxResultCount: request.maxResultCount || 10,
          locationRestriction: request.locationRestriction,
          rankPreference: request.rankPreference || 'POPULARITY',
          languageCode: request.languageCode || 'en'
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Places API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching nearby places:', error);
    throw error;
  }
};

/**
 * Search for places by text query
 * Replaces: PlacesService.textSearch()
 */
export const searchText = async (
  request: SearchTextRequest
): Promise<SearchTextResponse> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${PLACES_API_BASE_URL}/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.primaryTypeDisplayName,places.nationalPhoneNumber,places.businessStatus,places.priceLevel,places.websiteUri,places.regularOpeningHours,places.photos,places.viewport'
        },
        body: JSON.stringify({
          textQuery: request.textQuery,
          includedType: request.includedType,
          maxResultCount: request.maxResultCount || 10,
          locationBias: request.locationBias,
          languageCode: request.languageCode || 'en'
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Places API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching places by text:', error);
    throw error;
  }
};

/**
 * Get a photo URL from a Place photo resource
 */
export const getPhotoUrl = async (
  photoName: string,
  maxWidth?: number,
  maxHeight?: number
): Promise<string> => {
  const apiKey = await getApiKey();
  const params = new URLSearchParams({
    key: apiKey
  });
  
  if (maxWidth) params.append('maxWidthPx', maxWidth.toString());
  if (maxHeight) params.append('maxHeightPx', maxHeight.toString());

  return `${PLACES_API_BASE_URL}/${photoName}/media?${params.toString()}`;
};

/**
 * Helper function to convert google.maps.LatLng to Location
 */
export const latLngToLocation = (latLng: { lat: number; lng: number }): Location => {
  return {
    latitude: latLng.lat,
    longitude: latLng.lng
  };
};

/**
 * Helper function to convert Location to google.maps.LatLng
 */
export const locationToLatLng = (location: Location): { lat: number; lng: number } => {
  return {
    lat: location.latitude,
    lng: location.longitude
  };
};

/**
 * Convert legacy place type to new API type
 * Reference: https://developers.google.com/maps/documentation/places/web-service/place-types
 */
export const convertLegacyPlaceType = (legacyType: string): string => {
  const typeMapping: Record<string, string> = {
    'accounting': 'accounting',
    'airport': 'airport',
    'amusement_park': 'amusement_park',
    'aquarium': 'aquarium',
    'art_gallery': 'art_gallery',
    'atm': 'atm',
    'bakery': 'bakery',
    'bank': 'bank',
    'bar': 'bar',
    'beauty_salon': 'beauty_salon',
    'bicycle_store': 'bicycle_store',
    'book_store': 'book_store',
    'bowling_alley': 'bowling_alley',
    'bus_station': 'bus_station',
    'cafe': 'cafe',
    'campground': 'campground',
    'car_dealer': 'car_dealer',
    'car_rental': 'car_rental',
    'car_repair': 'car_repair',
    'car_wash': 'car_wash',
    'casino': 'casino',
    'cemetery': 'cemetery',
    'church': 'church',
    'city_hall': 'city_hall',
    'clothing_store': 'clothing_store',
    'convenience_store': 'convenience_store',
    'courthouse': 'courthouse',
    'dentist': 'dentist',
    'department_store': 'department_store',
    'doctor': 'doctor',
    'drugstore': 'drugstore',
    'electrician': 'electrician',
    'electronics_store': 'electronics_store',
    'embassy': 'embassy',
    'fire_station': 'fire_station',
    'florist': 'florist',
    'funeral_home': 'funeral_home',
    'furniture_store': 'furniture_store',
    'gas_station': 'gas_station',
    'gym': 'gym',
    'hair_care': 'hair_care',
    'hardware_store': 'hardware_store',
    'hindu_temple': 'hindu_temple',
    'home_goods_store': 'home_goods_store',
    'hospital': 'hospital',
    'insurance_agency': 'insurance_agency',
    'jewelry_store': 'jewelry_store',
    'laundry': 'laundry',
    'lawyer': 'lawyer',
    'library': 'library',
    'light_rail_station': 'light_rail_station',
    'liquor_store': 'liquor_store',
    'local_government_office': 'local_government_office',
    'locksmith': 'locksmith',
    'lodging': 'lodging',
    'meal_delivery': 'meal_delivery',
    'meal_takeaway': 'meal_takeaway',
    'mosque': 'mosque',
    'movie_rental': 'movie_rental',
    'movie_theater': 'movie_theater',
    'moving_company': 'moving_company',
    'museum': 'museum',
    'night_club': 'night_club',
    'painter': 'painter',
    'park': 'park',
    'parking': 'parking',
    'pet_store': 'pet_store',
    'pharmacy': 'pharmacy',
    'physiotherapist': 'physiotherapist',
    'plumber': 'plumber',
    'police': 'police',
    'post_office': 'post_office',
    'primary_school': 'primary_school',
    'real_estate_agency': 'real_estate_agency',
    'restaurant': 'restaurant',
    'roofing_contractor': 'roofing_contractor',
    'rv_park': 'rv_park',
    'school': 'school',
    'secondary_school': 'secondary_school',
    'shoe_store': 'shoe_store',
    'shopping_mall': 'shopping_mall',
    'spa': 'spa',
    'stadium': 'stadium',
    'storage': 'storage',
    'store': 'store',
    'subway_station': 'subway_station',
    'supermarket': 'supermarket',
    'synagogue': 'synagogue',
    'taxi_stand': 'taxi_stand',
    'tourist_attraction': 'tourist_attraction',
    'train_station': 'train_station',
    'transit_station': 'transit_station',
    'travel_agency': 'travel_agency',
    'university': 'university',
    'veterinary_care': 'veterinary_care',
    'zoo': 'zoo'
  };

  return typeMapping[legacyType] || legacyType;
};

/**
 * Get place details by place ID
 * Note: This uses the Place Details API endpoint
 */
export const getPlaceDetails = async (placeId: string): Promise<Place> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(
      `${PLACES_API_BASE_URL}/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,types,primaryType,primaryTypeDisplayName,nationalPhoneNumber,internationalPhoneNumber,businessStatus,priceLevel,websiteUri,regularOpeningHours,photos,viewport'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Places API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting place details:', error);
    throw error;
  }
};
