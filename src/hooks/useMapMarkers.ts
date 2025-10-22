import { useState, useCallback, useRef, useEffect } from 'react';
import { MapLocation } from '../utils/googleMaps';
import { reverseGeocode } from '../services/geocoding';

interface UseMapMarkersOptions {
  mapInstance: google.maps.Map | null;
  userLocation: MapLocation | null;
  originLocation: { lat: number; lng: number; address: string } | null;
  onSetOrigin: (location: MapLocation, address: string) => void;
}

interface UseMapMarkersReturn {
  markers: google.maps.Marker[];
  addMarker: (location: MapLocation, label: string, infoContent: string, address?: string) => Promise<void>;
  clearMarkers: () => void;
  showInfoWindowAtLocation: (location: MapLocation, content: string) => Promise<void>;
  originMarker: google.maps.Marker | null;
  updateOriginMarker: (location: MapLocation | null) => void;
}

export const useMapMarkers = (options: UseMapMarkersOptions): UseMapMarkersReturn => {
  const { mapInstance, userLocation, originLocation, onSetOrigin } = options;
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const [originMarker, setOriginMarker] = useState<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const clearMarkers = useCallback(() => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, [markers]);

  const updateOriginMarker = useCallback((location: MapLocation | null) => {
    if (!mapInstance) return;

    console.log('🔄 updateOriginMarker called with:', location);
    console.log('🔄 Current originMarkerRef:', originMarkerRef.current);

    // CRITICAL: Always remove existing origin marker first
    if (originMarkerRef.current) {
      console.log('🗑️ Removing existing origin marker');
      originMarkerRef.current.setMap(null);
      originMarkerRef.current = null;
      setOriginMarker(null);
    }

    // Create new origin marker if location provided
    if (location) {
      console.log('✨ Creating new origin marker at:', location);
      const marker = new google.maps.Marker({
        position: location,
        map: mapInstance,
        title: 'Origin Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#8B5CF6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        zIndex: 1000,
      });

      originMarkerRef.current = marker;
      setOriginMarker(marker);
      console.log('✅ Origin marker created and set');
    }
  }, [mapInstance]);

  // CRITICAL: Sync origin marker with originLocation changes
  useEffect(() => {
    console.log('🔄 Origin location changed:', originLocation);
    if (originLocation) {
      updateOriginMarker({ lat: originLocation.lat, lng: originLocation.lng });
    } else {
      updateOriginMarker(null);
    }
  }, [originLocation, updateOriginMarker]);

  const showInfoWindowAtLocation = useCallback(async (location: MapLocation, content: string): Promise<void> => {
    if (!mapInstance) return;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow({
        pixelOffset: new google.maps.Size(0, -40)
      });
    }

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.setPosition(location);
    infoWindowRef.current.open(mapInstance);
  }, [mapInstance]);

  const addMarker = useCallback(async (
    location: MapLocation,
    label: string,
    infoContent: string,
    address?: string
  ): Promise<void> => {
    if (!mapInstance) return;

    const marker = new google.maps.Marker({
      position: location,
      map: mapInstance,
      title: label,
      animation: google.maps.Animation.DROP,
    });

    // Get addresses using Geocoding API
    const destinationAddress = address || await getAddressFromGeocoding(location);
    const originAddress = originLocation?.address || (userLocation ? await getAddressFromGeocoding(userLocation) : null);

    // Create info window with navigation button and set origin button
    const infoWindow = new google.maps.InfoWindow({
      content: createInfoWindowContent(
        infoContent, 
        location, 
        destinationAddress, 
        originAddress,
        onSetOrigin
      ),
      pixelOffset: new google.maps.Size(0, -40)
    });

    marker.addListener('click', () => {
      // Close any existing info windows
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      infoWindow.open(mapInstance, marker);
    });

    setMarkers(prev => [...prev, marker]);
  }, [mapInstance, userLocation, originLocation, onSetOrigin]);

  return {
    markers,
    addMarker,
    clearMarkers,
    showInfoWindowAtLocation,
    originMarker,
    updateOriginMarker
  };
};

async function getAddressFromGeocoding(location: MapLocation): Promise<string> {
  try {
    const result = await reverseGeocode(location.lat, location.lng);
    if (result?.formattedAddress) {
      return result.formattedAddress;
    }
  } catch (error) {
    console.error('Geocoding API error:', error);
  }
  // Fallback to coordinates if geocoding fails
  return `${location.lat},${location.lng}`;
}

function createInfoWindowContent(
  baseContent: string,
  destinationLocation: MapLocation,
  destinationAddress: string,
  originAddress: string | null,
  onSetOrigin: (location: MapLocation, address: string) => void
): string {
  // Set Origin button
  const setOriginButton = `
    <div style="margin-top: 12px;">
      <button 
        onclick="window.setOriginLocationFromSearch(${destinationLocation.lat}, ${destinationLocation.lng}, '${destinationAddress.replace(/'/g, "\\'")}')"
        style="display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 10px 16px; background: #8B5CF6; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3); transition: all 0.2s ease; margin-bottom: 8px;"
        onmouseover="this.style.background='#7C3AED'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)'"
        onmouseout="this.style.background='#8B5CF6'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(139, 92, 246, 0.3)'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        Set as Origin
      </button>
    </div>
  `;

  // Expose the callback to window object
  (window as any).setOriginLocationFromSearch = (lat: number, lng: number, address: string) => {
    onSetOrigin({ lat, lng }, address);
  };

  if (!originAddress) {
    return baseContent + setOriginButton;
  }

  // Format: /maps/dir/origin/destination/@lat,lng
  // Replace spaces with + for URL encoding
  const formatAddress = (addr: string) => addr.replace(/\s+/g, '+');
  
  const formattedOrigin = formatAddress(originAddress);
  const formattedDestination = formatAddress(destinationAddress);
  const coordinates = `@${destinationLocation.lat},${destinationLocation.lng}`;

  const baseUrl = `https://www.google.com/maps/dir/${formattedOrigin}/${formattedDestination}/${coordinates}`;

  // Google Maps icon SVG
  const googleMapsIcon = `
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
      <path d="M24 4C17.37 4 12 9.37 12 16c0 10.5 12 24 12 24s12-13.5 12-24c0-6.63-5.37-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#EA4335"/>
      <circle cx="24" cy="16" r="4" fill="#FFFFFF"/>
      <path d="M24 12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#4285F4"/>
    </svg>
  `;

  const navigationButton = `
    <div style="margin-top: 0;">
      <a 
        href="${baseUrl}"
        target="_blank"
        rel="noopener noreferrer"
        style="display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px 20px; background: #4285F4; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3); text-decoration: none; transition: all 0.2s ease;"
        onmouseover="this.style.background='#3367D6'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(66, 133, 244, 0.4)'"
        onmouseout="this.style.background='#4285F4'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(66, 133, 244, 0.3)'"
      >
        ${googleMapsIcon}
        Get Directions
      </a>
    </div>
  `;

  return baseContent + setOriginButton + navigationButton;
}
