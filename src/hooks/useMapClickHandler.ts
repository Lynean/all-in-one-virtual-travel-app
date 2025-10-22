import { useEffect } from 'react';
import { reverseGeocode } from '../services/geocoding';

interface UseMapClickHandlerProps {
  mapInstance: google.maps.Map | null;
  onMapClick: (location: google.maps.LatLngLiteral, address: string) => Promise<void>;
}

export const useMapClickHandler = ({ mapInstance, onMapClick }: UseMapClickHandlerProps) => {
  useEffect(() => {
    if (!mapInstance) return;

    const clickListener = mapInstance.addListener('click', async (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };

      try {
        const result = await reverseGeocode(location.lat, location.lng);
        const address = result?.formattedAddress || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        await onMapClick(location, address);
      } catch (error) {
        console.error('Error handling map click:', error);
        await onMapClick(location, `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [mapInstance, onMapClick]);
};
