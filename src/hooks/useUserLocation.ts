import { useState, useEffect, useRef, useCallback } from 'react';
import { MapLocation } from '../utils/googleMaps';
import { createInfoWindow } from '../utils/googleMaps';

interface UseUserLocationOptions {
  mapInstance: google.maps.Map | null;
  autoTrack?: boolean;
}

interface UseUserLocationReturn {
  userLocation: MapLocation | null;
  userMarker: google.maps.marker.AdvancedMarkerElement | null;
  locationError: string;
  recalibrateLocation: (location: MapLocation, recenter?: boolean, zoom?: number) => Promise<void>;
  getCurrentLocation: () => void;
}

export const useUserLocation = (
  options: UseUserLocationOptions
): UseUserLocationReturn => {
  const { mapInstance, autoTrack = true } = options;
  
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [locationError, setLocationError] = useState('');
  
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Create user location marker (blue dot)
  const createUserLocationMarker = useCallback(async (
    map: google.maps.Map, 
    location: MapLocation
  ) => {
    try {
      const markerContent = document.createElement('div');
      markerContent.style.width = '20px';
      markerContent.style.height = '20px';
      markerContent.style.borderRadius = '50%';
      markerContent.style.backgroundColor = '#4285F4';
      markerContent.style.border = '3px solid #FFFFFF';
      markerContent.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      markerContent.style.cursor = 'pointer';

      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      
      const marker = new AdvancedMarkerElement({
        map,
        position: location,
        content: markerContent,
        title: 'Your Location'
      });

      const infoWindow = createInfoWindow('<strong>You are here</strong>');
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    } catch (error) {
      console.error('Failed to create user location marker:', error);
      throw error;
    }
  }, []);

  // Recalibrate user location
  const recalibrateLocation = useCallback(async (
    newLocation: MapLocation, 
    recenter: boolean = true, 
    zoom?: number
  ) => {
    if (!mapInstance) return;

    try {
      setUserLocation(newLocation);

      // Update or create marker
      if (userMarkerRef.current) {
        userMarkerRef.current.position = newLocation;
      } else {
        userMarkerRef.current = await createUserLocationMarker(mapInstance, newLocation);
      }

      // Optionally recenter map
      if (recenter) {
        mapInstance.setCenter(newLocation);
        if (zoom) {
          mapInstance.setZoom(zoom);
        }
      }
    } catch (error) {
      console.error('Failed to recalibrate user location:', error);
      setLocationError('Failed to update location');
    }
  }, [mapInstance, createUserLocationMarker]);

  // Get current GPS location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        await recalibrateLocation(location, true, 15);
      },
      (error) => {
        setLocationError('Unable to get your location. Please enable location services.');
        console.error('Geolocation error:', error);
      }
    );
  }, [recalibrateLocation]);

  // Auto-track location on mount
  useEffect(() => {
    if (autoTrack && mapInstance) {
      getCurrentLocation();
    }
  }, [autoTrack, mapInstance, getCurrentLocation]);

  return {
    userLocation,
    userMarker: userMarkerRef.current,
    locationError,
    recalibrateLocation,
    getCurrentLocation
  };
};
