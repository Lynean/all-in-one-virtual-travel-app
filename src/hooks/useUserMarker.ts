import { useRef, useCallback } from 'react';
import { MapLocation } from '../utils/googleMaps';

interface UseUserMarkerReturn {
  userMarker: google.maps.marker.AdvancedMarkerElement | null;
  createUserMarker: (map: google.maps.Map, location: MapLocation) => Promise<void>;
  updateUserMarker: (location: MapLocation, recenter?: boolean, zoom?: number) => void;
  clearUserMarker: () => void;
}

export const useUserMarker = (mapInstance: google.maps.Map | null): UseUserMarkerReturn => {
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const createUserMarker = useCallback(async (map: google.maps.Map, location: MapLocation) => {
    try {
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-user-marker';
      markerElement.innerHTML = `
        <div style="position: relative; width: 48px; height: 48px;">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 0 0 8px rgba(59, 130, 246, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse-user 2s ease-in-out infinite;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 72px;
            height: 72px;
            border: 2px solid rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            animation: ripple-user 2s ease-out infinite;
          "></div>
        </div>
      `;

      if (!document.getElementById('user-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'user-marker-styles';
        style.textContent = `
          @keyframes pulse-user {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
          }
          @keyframes ripple-user {
            0% { 
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% { 
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: location,
        content: markerElement,
        title: 'Your Location'
      });

      const infoWindow = new google.maps.InfoWindow({
        content: '<div style="padding: 8px; font-weight: 600;">📍 You are here</div>'
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      userMarkerRef.current = marker;
    } catch (error) {
      console.error('Failed to create custom user marker:', error);
      throw error;
    }
  }, []);

  const updateUserMarker = useCallback((location: MapLocation, recenter = true, zoom?: number) => {
    if (!mapInstance) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.position = location;
    }

    if (recenter) {
      mapInstance.setCenter(location);
      if (zoom) {
        mapInstance.setZoom(zoom);
      }
    }
  }, [mapInstance]);

  const clearUserMarker = useCallback(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
      userMarkerRef.current = null;
    }
  }, []);

  return {
    userMarker: userMarkerRef.current,
    createUserMarker,
    updateUserMarker,
    clearUserMarker
  };
};
