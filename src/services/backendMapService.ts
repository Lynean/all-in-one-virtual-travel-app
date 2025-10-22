/**
 * Backend Map Service
 * Calls backend API endpoints that handle Google Maps API calls server-side
 * Frontend displays results but doesn't need API keys
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface PlaceResult {
  id: string;
  name: string;
  formatted_address: string;
  location: Location;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  price_level?: string;
  business_status?: string;
  photos: string[];
}

export interface PlaceSearchRequest {
  query: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  included_types?: string[];
  min_rating?: number;
  open_now?: boolean;
}

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteRequest {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  waypoints?: RouteWaypoint[];
  travel_mode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT' | 'TWO_WHEELER';
  avoid?: string[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  start_location: { latitude: number; longitude: number };
  end_location: { latitude: number; longitude: number };
}

export interface RouteLeg {
  start_address: string;
  end_address: string;
  distance: number;
  duration: number;
  steps: RouteStep[];
}

export interface RouteResult {
  legs: RouteLeg[];
  polyline: string;
  distance: number;
  duration: number;
  travel_mode: string;
}

/**
 * Backend Map Service - All Google Maps API calls go through backend
 */
class BackendMapService {
  /**
   * Search for places (backend calls Google Places API)
   */
  async searchPlaces(request: PlaceSearchRequest): Promise<PlaceResult[]> {
    try {
      const response = await axios.post<{ results: PlaceResult[]; count: number }>(
        `${API_BASE_URL}/api/maps/places/search`,
        request
      );
      
      return response.data.results;
    } catch (error) {
      console.error('Backend place search failed:', error);
      throw error;
    }
  }

  /**
   * Search for nearby places (backend calls Google Places API)
   */
  async searchNearby(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    types?: string[]
  ): Promise<PlaceResult[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(),
      });

      if (types && types.length > 0) {
        params.append('types', types.join(','));
      }

      const response = await axios.get<{ results: PlaceResult[]; count: number }>(
        `${API_BASE_URL}/api/maps/places/nearby?${params.toString()}`
      );

      return response.data.results;
    } catch (error) {
      console.error('Backend nearby search failed:', error);
      throw error;
    }
  }

  /**
   * Get place details (backend calls Google Places API)
   */
  async getPlaceDetails(placeId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/maps/places/${placeId}`
      );

      return response.data;
    } catch (error) {
      console.error('Backend place details failed:', error);
      throw error;
    }
  }

  /**
   * Compute routes (backend calls Google Routes API)
   */
  async computeRoutes(request: RouteRequest): Promise<RouteResult> {
    try {
      const response = await axios.post<RouteResult>(
        `${API_BASE_URL}/api/maps/routes/compute`,
        request
      );

      return response.data;
    } catch (error) {
      console.error('Backend route compute failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const backendMapService = new BackendMapService();
