// This file is deprecated - use src/services/maps.ts instead
// Keeping for backwards compatibility

import { Loader } from '@googlemaps/js-api-loader';

export interface GoogleMapsConfig {
  apiKey: string;
  libraries?: string[];
}

export interface MapLocation {
  lat: number;
  lng: number;
}

export interface MapMarker {
  position: MapLocation;
  title: string;
  icon?: string;
}

let loaderInstance: Loader | null = null;

export const loadGoogleMapsScript = async (config: GoogleMapsConfig): Promise<void> => {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: config.apiKey,
      version: 'weekly',
      libraries: config.libraries as any || ['places', 'geometry', 'marker']
    });
  }
  
  await loaderInstance.load();
};

export const createMap = (
  element: HTMLElement,
  center: MapLocation,
  zoom: number = 13,
  mapId?: string
): google.maps.Map => {
  const config: google.maps.MapOptions = {
    center,
    zoom,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
  };

  // Map ID is required for Advanced Markers
  if (mapId) {
    config.mapId = mapId;
  }

  return new google.maps.Map(element, config);
};

export const createMarker = async (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  title: string
): Promise<google.maps.Marker> => {
  // Use standard Marker instead of AdvancedMarkerElement to avoid React DOM conflicts
  const marker = new google.maps.Marker({
    map,
    position,
    title,
  });

  return marker;
};

export const createInfoWindow = (content: string): google.maps.InfoWindow => {
  return new google.maps.InfoWindow({
    content,
  });
};

/**
 * @deprecated Use Routes API instead: import { computeRoutes } from '../services/routesApi'
 * This function is kept for backwards compatibility but should not be used in new code.
 */
export const calculateRoute = async (
  directionsService: google.maps.DirectionsService,
  origin: MapLocation,
  destination: MapLocation,
  travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
): Promise<google.maps.DirectionsResult> => {
  console.warn('calculateRoute is deprecated. Please use Routes API from ../services/routesApi');
  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin,
        destination,
        travelMode,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      }
    );
  });
};

/**
 * @deprecated Use Places API (New) instead: import { searchNearby } from '../services/placesApi'
 * This function uses the legacy Places API and should not be used in new code.
 */
export const searchNearbyPlaces = async (
  service: google.maps.places.PlacesService,
  location: MapLocation,
  radius: number,
  type: string
): Promise<google.maps.places.PlaceResult[]> => {
  console.warn('searchNearbyPlaces is deprecated. Please use Places API (New) from ../services/placesApi');
  return new Promise((resolve, reject) => {
    const request: google.maps.places.PlaceSearchRequest = {
      location,
      radius,
      type,
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results);
      } else {
        reject(new Error(`Places search failed: ${status}`));
      }
    });
  });
};
