/**
 * Google Routes API Service
 * Migrated from Directions API and Distance Matrix API
 * Documentation: https://developers.google.com/maps/documentation/routes
 */

import { configService } from './configService';

let API_KEY: string | null = null;

const getApiKey = async (): Promise<string> => {
  if (!API_KEY) {
    API_KEY = await configService.getGoogleMapsApiKey();
  }
  return API_KEY;
};

const ROUTES_API_BASE_URL = 'https://routes.googleapis.com';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Waypoint {
  location?: {
    latLng: Location;
  };
  address?: string;
}

export enum TravelMode {
  DRIVE = 'DRIVE',
  BICYCLE = 'BICYCLE',
  WALK = 'WALK',
  TWO_WHEELER = 'TWO_WHEELER',
  TRANSIT = 'TRANSIT'
}

export enum RoutingPreference {
  TRAFFIC_UNAWARE = 'TRAFFIC_UNAWARE',
  TRAFFIC_AWARE = 'TRAFFIC_AWARE',
  TRAFFIC_AWARE_OPTIMAL = 'TRAFFIC_AWARE_OPTIMAL'
}

export enum Units {
  METRIC = 'METRIC',
  IMPERIAL = 'IMPERIAL'
}

export enum TransitMode {
  BUS = 'BUS',
  SUBWAY = 'SUBWAY',
  TRAIN = 'TRAIN',
  LIGHT_RAIL = 'LIGHT_RAIL',
  RAIL = 'RAIL'
}

export enum TransitRoutingPreference {
  LESS_WALKING = 'LESS_WALKING',
  FEWER_TRANSFERS = 'FEWER_TRANSFERS'
}

export interface TransitPreferences {
  allowedTravelModes?: TransitMode[];
  routingPreference?: TransitRoutingPreference;
}

export interface ComputeRoutesRequest {
  origin: Waypoint;
  destination: Waypoint;
  intermediates?: Waypoint[];
  travelMode?: TravelMode;
  routingPreference?: RoutingPreference;
  polylineQuality?: 'HIGH_QUALITY' | 'OVERVIEW';
  polylineEncoding?: 'ENCODED_POLYLINE' | 'GEO_JSON_LINESTRING';
  departureTime?: string;
  arrivalTime?: string;
  computeAlternativeRoutes?: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
  };
  transitPreferences?: TransitPreferences;
  languageCode?: string;
  units?: Units;
}

export interface ComputeRouteMatrixRequest {
  origins: Waypoint[];
  destinations: Waypoint[];
  travelMode?: TravelMode;
  routingPreference?: RoutingPreference;
}

export interface Route {
  legs: RouteLeg[];
  distanceMeters: number;
  duration: string;
  polyline: {
    encodedPolyline?: string;
    geoJsonLinestring?: any;
  };
  description?: string;
  warnings?: string[];
  viewport?: {
    low: Location;
    high: Location;
  };
  travelAdvisory?: any;
  localizedValues?: {
    distance: { text: string };
    duration: { text: string };
    staticDuration: { text: string };
  };
}

export interface RouteLeg {
  distanceMeters: number;
  duration: string;
  staticDuration: string;
  polyline: {
    encodedPolyline?: string;
    geoJsonLinestring?: any;
  };
  startLocation: {
    latLng: Location;
  };
  endLocation: {
    latLng: Location;
  };
  steps: RouteStep[];
  localizedValues?: {
    distance: { text: string };
    duration: { text: string };
    staticDuration: { text: string };
  };
}

export interface RouteStep {
  distanceMeters: number;
  staticDuration: string;
  polyline: {
    encodedPolyline?: string;
    geoJsonLinestring?: any;
  };
  startLocation: {
    latLng: Location;
  };
  endLocation: {
    latLng: Location;
  };
  navigationInstruction?: {
    maneuver: string;
    instructions: string;
  };
  localizedValues?: {
    distance: { text: string };
    staticDuration: { text: string };
  };
}

export interface ComputeRoutesResponse {
  routes: Route[];
}

export interface RouteMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  status?: {
    code: number;
    message?: string;
  };
  condition?: string;
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
  travelAdvisory?: any;
  localizedValues?: {
    distance: { text: string };
    duration: { text: string };
    staticDuration: { text: string };
  };
}

export interface ComputeRouteMatrixResponse {
  data: RouteMatrixElement[];
}

/**
 * Compute routes between origin and destination
 * Replaces DirectionsService.route()
 */
export const computeRoutes = async (
  request: ComputeRoutesRequest
): Promise<ComputeRoutesResponse> => {
  try {
    const apiKey = await getApiKey();
    console.log('🔑 API Key exists:', !!apiKey, 'Length:', apiKey?.length);
    const travelMode = request.travelMode || TravelMode.TRANSIT;
    
    // Validate origin and destination distance (max 1000km)
    if (request.origin.location?.latLng && request.destination.location?.latLng) {
      const originLat = request.origin.location.latLng.latitude;
      const originLng = request.origin.location.latLng.longitude;
      const destLat = request.destination.location.latLng.latitude;
      const destLng = request.destination.location.latLng.longitude;
      
      const distanceKm = calculateDistance(originLat, originLng, destLat, destLng);
      console.log(`📏 Distance between origin and destination: ${distanceKm.toFixed(2)} km`);
      
      if (distanceKm > 1000) {
        const errorMessage = `Sorry, we cannot provide routes for distances over 1000km. The distance between your origin and destination is ${distanceKm.toFixed(0)} km. Please choose locations closer together.`;
        console.error('❌ Distance exceeds 1000km limit:', errorMessage);
        throw new Error(errorMessage);
      }
    }
    
    // Build request body
    const requestBody: any = {
      origin: request.origin,
      destination: request.destination,
      travelMode: travelMode,
      polylineQuality: request.polylineQuality || 'HIGH_QUALITY',
      polylineEncoding: request.polylineEncoding || 'ENCODED_POLYLINE',
      computeAlternativeRoutes: true, // Always compute alternative routes
      languageCode: request.languageCode || 'en-US',
      units: request.units || Units.METRIC
    };
    
    // Handle transit-specific parameters
    if (travelMode === TravelMode.TRANSIT) {
      // Transit supports transitPreferences instead of routingPreference
      if (request.transitPreferences) {
        requestBody.transitPreferences = request.transitPreferences;
      }
      
      // Transit supports arrivalTime or departureTime (but not both)
      if (request.arrivalTime) {
        requestBody.arrivalTime = request.arrivalTime;
      } else if (request.departureTime) {
        requestBody.departureTime = request.departureTime;
      }
      
      // Transit does NOT support intermediates or routeModifiers
      // (those are only for non-transit modes)
    } else {
      // Non-transit modes
      requestBody.intermediates = request.intermediates;
      requestBody.departureTime = request.departureTime;
      requestBody.routeModifiers = request.routeModifiers;
      requestBody.routingPreference = request.routingPreference || RoutingPreference.TRAFFIC_AWARE;
    }
    
    // Build field mask - include transit details for transit mode
    // Build field mask based on travel mode
    let fieldMask = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.viewport,routes.localizedValues,routes.description,routes.staticDuration';
    
    if (travelMode === TravelMode.TRANSIT) {
      // Add comprehensive transit-specific fields
      fieldMask += ',routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';
      fieldMask += ',routes.legs.steps.polyline,routes.legs.steps.startLocation,routes.legs.steps.endLocation';
      fieldMask += ',routes.legs.steps.travelMode,routes.legs.steps.navigationInstruction';
      fieldMask += ',routes.legs.steps.localizedValues';
      fieldMask += ',routes.legs.steps.transitDetails.stopDetails';
      fieldMask += ',routes.legs.steps.transitDetails.localizedValues';
      fieldMask += ',routes.legs.steps.transitDetails.headsign';
      fieldMask += ',routes.legs.steps.transitDetails.transitLine';
      fieldMask += ',routes.legs.steps.transitDetails.stopCount';
      fieldMask += ',routes.travelAdvisory.transitFare';
    }
    
    console.log('🗺️ Routes API Request:', {
      travelMode,
      fieldMask,
      requestBody
    });
    
    const response = await fetch(
      `${ROUTES_API_BASE_URL}/directions/v2:computeRoutes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log('🗺️ Routes API HTTP Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🗺️ Routes API Error Response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`Routes API HTTP ${response.status}: ${errorText}`);
      }
      throw new Error(`Routes API error: ${errorData.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log('🗺️ Routes API Response:', responseData);
    
    // Check if response has routes
    if (!responseData.routes || responseData.routes.length === 0) {
      console.warn('⚠️ Routes API returned empty routes array');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error computing routes:', error);
    throw error;
  }
};

/**
 * Compute route matrix (distance and duration between multiple origins and destinations)
 * Replaces DistanceMatrixService.getDistanceMatrix()
 */
export const computeRouteMatrix = async (
  request: ComputeRouteMatrixRequest
): Promise<ComputeRouteMatrixResponse> => {
  try {
    const apiKey = await getApiKey();
    const travelMode = request.travelMode || TravelMode.TRANSIT;
    
    // Build request body
    const requestBody: any = {
      origins: request.origins,
      destinations: request.destinations,
      travelMode: travelMode
    };
    
    // Only add routingPreference for non-TRANSIT modes
    if (travelMode !== TravelMode.TRANSIT) {
      requestBody.routingPreference = request.routingPreference || RoutingPreference.TRAFFIC_AWARE;
    }
    
    const response = await fetch(
      `${ROUTES_API_BASE_URL}/distanceMatrix/v2:computeRouteMatrix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition,localizedValues'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Route Matrix API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error computing route matrix:', error);
    throw error;
  }
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
 * Helper function to decode polyline for rendering on Google Maps
 */
export const decodePolyline = (encodedPolyline: string): google.maps.LatLng[] => {
  const poly: google.maps.LatLng[] = [];
  let index = 0;
  const len = encodedPolyline.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encodedPolyline.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encodedPolyline.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push(
      new google.maps.LatLng(lat / 1e5, lng / 1e5)
    );
  }

  return poly;
};

/**
 * Convert travel mode from old API to new API
 */
export const convertTravelMode = (oldMode: google.maps.TravelMode): TravelMode => {
  switch (oldMode) {
    case google.maps.TravelMode.DRIVING:
      return TravelMode.DRIVE;
    case google.maps.TravelMode.BICYCLING:
      return TravelMode.BICYCLE;
    case google.maps.TravelMode.WALKING:
      return TravelMode.WALK;
    case google.maps.TravelMode.TRANSIT:
      return TravelMode.TRANSIT;
    default:
      return TravelMode.TRANSIT;
  }
};
