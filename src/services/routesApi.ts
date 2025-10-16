/**
 * Google Routes API Service
 * Migrated from Directions API and Distance Matrix API
 * Documentation: https://developers.google.com/maps/documentation/routes
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ROUTES_API_BASE_URL = 'https://routes.googleapis.com';

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

export interface ComputeRoutesRequest {
  origin: Waypoint;
  destination: Waypoint;
  intermediates?: Waypoint[];
  travelMode?: TravelMode;
  routingPreference?: RoutingPreference;
  polylineQuality?: 'HIGH_QUALITY' | 'OVERVIEW';
  polylineEncoding?: 'ENCODED_POLYLINE' | 'GEO_JSON_LINESTRING';
  departureTime?: string;
  computeAlternativeRoutes?: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
  };
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
    const response = await fetch(
      `${ROUTES_API_BASE_URL}/directions/v2:computeRoutes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.viewport,routes.localizedValues,routes.description'
        },
        body: JSON.stringify({
          origin: request.origin,
          destination: request.destination,
          intermediates: request.intermediates,
          travelMode: request.travelMode || TravelMode.DRIVE,
          routingPreference: request.routingPreference || RoutingPreference.TRAFFIC_AWARE,
          polylineQuality: request.polylineQuality || 'HIGH_QUALITY',
          polylineEncoding: request.polylineEncoding || 'ENCODED_POLYLINE',
          departureTime: request.departureTime,
          computeAlternativeRoutes: request.computeAlternativeRoutes || false,
          routeModifiers: request.routeModifiers,
          languageCode: request.languageCode || 'en-US',
          units: request.units || Units.METRIC
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Routes API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(
      `${ROUTES_API_BASE_URL}/distanceMatrix/v2:computeRouteMatrix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition,localizedValues'
        },
        body: JSON.stringify({
          origins: request.origins,
          destinations: request.destinations,
          travelMode: request.travelMode || TravelMode.DRIVE,
          routingPreference: request.routingPreference || RoutingPreference.TRAFFIC_AWARE
        })
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
      return TravelMode.DRIVE;
  }
};
