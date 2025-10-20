import { Loader } from '@googlemaps/js-api-loader';
import { configService } from './configService';
import {
  computeRoutes,
  decodePolyline,
  latLngToLocation,
  locationToLatLng,
  convertTravelMode,
  type ComputeRoutesRequest,
  type Route,
  TravelMode as RoutesTravelMode
} from './routesApi';
import {
  searchText as placesSearchText,
  latLngToLocation as placesLatLngToLocation,
  locationToLatLng as placesLocationToLatLng,
  type SearchTextRequest,
  type Place
} from './placesApi';

let loaderInstance: Loader | null = null;
let isLoaded = false;

export interface Location {
  lat: number;
  lng: number;
}

export const getGoogleMapsLoader = async (): Promise<Loader> => {
  if (!loaderInstance) {
    const apiKey = await configService.getGoogleMapsApiKey();
    loaderInstance = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });
  }
  return loaderInstance;
};

export const loadGoogleMaps = async (): Promise<void> => {
  if (isLoaded) {
    return;
  }

  const loader = await getGoogleMapsLoader();
  await loader.load();
  isLoaded = true;
};

export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = 'Failed to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

export const initializeMap = async (
  element: HTMLElement,
  center: Location
): Promise<google.maps.Map | null> => {
  try {
    await loadGoogleMaps();

    const map = new google.maps.Map(element, {
      center,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    // Add marker for current location
    new google.maps.Marker({
      position: center,
      map,
      title: 'Your Location',
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4F46E5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      }
    });

    return map;
  } catch (error) {
    console.error('Error initializing map:', error);
    throw error;
  }
};

export const searchPlaces = async (
  map: google.maps.Map,
  query: string,
  location: Location
): Promise<Place[]> => {
  try {
    await loadGoogleMaps();

    // Use new Places API
    const request: SearchTextRequest = {
      textQuery: query,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: placesLatLngToLocation(location),
          radius: 5000
        }
      }
    };

    const response = await placesSearchText(request);
    return response.places || [];
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
};

export const addMarkers = (
  map: google.maps.Map,
  places: Place[]
): google.maps.Marker[] => {
  const markers: google.maps.Marker[] = [];

  places.forEach((place) => {
    if (!place.location) return;

    const position = placesLocationToLatLng(place.location);

    const marker = new google.maps.Marker({
      position,
      map,
      title: place.displayName?.text || 'Unknown',
      animation: google.maps.Animation.DROP,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; max-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${place.displayName?.text || 'Unknown'}</h3>
          ${place.formattedAddress ? `<p style="margin: 0; font-size: 12px; color: #666;">${place.formattedAddress}</p>` : ''}
          ${place.rating ? `<p style="margin: 4px 0 0 0; font-size: 12px;">⭐ ${place.rating} (${place.userRatingCount || 0} reviews)</p>` : ''}
          ${place.priceLevel ? `<p style="margin: 4px 0 0 0; font-size: 12px;">💰 ${place.priceLevel}</p>` : ''}
        </div>
      `,
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  });

  return markers;
};

export const clearMarkers = (markers: google.maps.Marker[]): void => {
  markers.forEach((marker) => marker.setMap(null));
};

export const getDirections = async (
  origin: Location,
  destination: Location,
  travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
): Promise<Route> => {
  try {
    await loadGoogleMaps();

    // Convert to Routes API format
    const request: ComputeRoutesRequest = {
      origin: {
        location: {
          latLng: latLngToLocation(origin)
        }
      },
      destination: {
        location: {
          latLng: latLngToLocation(destination)
        }
      },
      travelMode: convertTravelMode(travelMode),
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      }
    };

    const response = await computeRoutes(request);
    
    if (!response.routes || response.routes.length === 0) {
      throw new Error('No routes found');
    }

    return response.routes[0];
  } catch (error) {
    console.error('Error getting directions:', error);
    throw error;
  }
};

export const displayDirections = (
  map: google.maps.Map,
  route: Route
): google.maps.Polyline => {
  // Decode the polyline and create a path
  const path = route.polyline.encodedPolyline 
    ? decodePolyline(route.polyline.encodedPolyline)
    : [];

  const polyline = new google.maps.Polyline({
    map,
    path,
    strokeColor: '#4F46E5',
    strokeWeight: 5,
    strokeOpacity: 0.8,
  });

  // Fit map to route bounds if viewport is available
  if (route.viewport) {
    const bounds = new google.maps.LatLngBounds(
      locationToLatLng(route.viewport.low),
      locationToLatLng(route.viewport.high)
    );
    map.fitBounds(bounds);
  }

  return polyline;
};
