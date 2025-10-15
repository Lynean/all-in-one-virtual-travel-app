import { Loader } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

console.log('Google Maps API Key:', API_KEY ? 'Found' : 'Missing');

if (!API_KEY || API_KEY === 'undefined') {
  console.error('Google Maps API key not found. Please add VITE_GOOGLE_MAPS_API_KEY to .env file');
}

let loader: Loader | null = null;

if (API_KEY && API_KEY !== 'undefined') {
  try {
    loader = new Loader({
      apiKey: API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });
    console.log('Google Maps Loader initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Maps Loader:', error);
  }
}

export async function initializeMap(
  element: HTMLElement,
  center: { lat: number; lng: number }
): Promise<google.maps.Map | null> {
  console.log('Initializing map with center:', center);
  
  if (!loader) {
    console.error('Google Maps loader not initialized - API key missing');
    throw new Error('Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.');
  }

  try {
    console.log('Loading Google Maps API...');
    await loader.load();
    console.log('Google Maps API loaded successfully');

    const map = new google.maps.Map(element, {
      center,
      zoom: 13,
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#e0e5ec' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#667eea' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#ffffff' }],
        },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    console.log('Map instance created successfully');

    new google.maps.Marker({
      position: center,
      map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#667eea',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    });

    console.log('User location marker added');

    return map;
  } catch (error) {
    console.error('Error initializing map:', error);
    if (error instanceof Error) {
      throw new Error(`Map initialization failed: ${error.message}`);
    }
    throw new Error('Map initialization failed with unknown error');
  }
}

export async function searchNearbyPlaces(
  map: google.maps.Map,
  location: { lat: number; lng: number },
  type: string
): Promise<google.maps.places.PlaceResult[]> {
  if (!loader) {
    console.error('Cannot search places - loader not initialized');
    return [];
  }

  try {
    await loader.load();

    const service = new google.maps.places.PlacesService(map);

    return new Promise((resolve, reject) => {
      service.nearbySearch(
        {
          location,
          radius: 5000,
          type,
        },
        (results, status) => {
          console.log('Places search status:', status);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.log('Found places:', results.length);
            resolve(results);
          } else {
            console.error('Places search failed:', status);
            resolve([]);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported by browser');
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    console.log('Requesting geolocation...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Geolocation success:', position.coords);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable location access.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'));
            break;
          default:
            reject(new Error('An unknown error occurred while getting location.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}
