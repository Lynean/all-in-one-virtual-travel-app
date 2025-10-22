export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface LoadScriptOptions {
  apiKey: string;
  libraries?: string[];
}

let isScriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = async (options: LoadScriptOptions): Promise<void> => {
  if (isScriptLoaded) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window object not available'));
      return;
    }

    if (window.google?.maps) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    const libraries = options.libraries?.join(',') || 'places,geometry,marker';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${options.apiKey}&libraries=${libraries}&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isScriptLoaded = true;
      resolve();
    };

    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export const createMap = (
  element: HTMLElement,
  center: MapLocation,
  zoom: number = 15,
  mapId?: string
): google.maps.Map => {
  const mapOptions: google.maps.MapOptions = {
    center,
    zoom,
    mapId,
    // CRITICAL: Enable single-finger gestures on mobile
    gestureHandling: 'greedy', // Allows single-finger pan and zoom
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true,
    // Mobile-optimized controls
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    },
    fullscreenControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  };

  return new google.maps.Map(element, mapOptions);
};

export const createMarker = (
  map: google.maps.Map,
  position: MapLocation,
  title?: string,
  icon?: string | google.maps.Icon | google.maps.Symbol
): google.maps.Marker => {
  return new google.maps.Marker({
    map,
    position,
    title,
    icon,
    animation: google.maps.Animation.DROP,
    // Optimize for touch interactions
    optimized: true,
    clickable: true
  });
};

export const createInfoWindow = (
  content: string | HTMLElement
): google.maps.InfoWindow => {
  return new google.maps.InfoWindow({
    content,
    // Mobile-optimized info window
    maxWidth: 300,
    pixelOffset: new google.maps.Size(0, -30)
  });
};

export const addMarkerClickListener = (
  marker: google.maps.Marker,
  callback: () => void
): google.maps.MapsEventListener => {
  return marker.addListener('click', callback);
};

export const addMapClickListener = (
  map: google.maps.Map,
  callback: (event: google.maps.MapMouseEvent) => void
): google.maps.MapsEventListener => {
  return map.addListener('click', callback);
};

export const clearMarkers = (markers: google.maps.Marker[]): void => {
  markers.forEach(marker => marker.setMap(null));
};

export const fitBounds = (
  map: google.maps.Map,
  locations: MapLocation[]
): void => {
  if (locations.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  locations.forEach(location => {
    bounds.extend(location);
  });

  map.fitBounds(bounds);
};

export const calculateDistance = (
  from: MapLocation,
  to: MapLocation
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};
