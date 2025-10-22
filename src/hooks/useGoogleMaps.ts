import { useState, useEffect, useRef } from 'react';
import { loadGoogleMapsScript, createMap, MapLocation } from '../utils/googleMaps';
import { configService } from '../services/configService';

interface UseGoogleMapsOptions {
  defaultCenter?: MapLocation;
  defaultZoom?: number;
}

interface UseGoogleMapsReturn {
  mapRef: React.RefObject<HTMLDivElement>;
  mapInstance: google.maps.Map | null;
  isLoading: boolean;
  error: string;
  isScriptLoaded: boolean;
}

export const useGoogleMaps = (
  options: UseGoogleMapsOptions = {}
): UseGoogleMapsReturn => {
  const { defaultCenter = { lat: 40.7128, lng: -74.0060 }, defaultZoom = 13 } = options;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Step 1: Load Google Maps Script
  useEffect(() => {
    const loadScript = async () => {
      try {
        const apiKey = await configService.getGoogleMapsApiKey();

        if (!apiKey || apiKey === 'undefined') {
          const errorMsg = 'Google Maps API key not configured. Please configure it in the admin panel or add VITE_GOOGLE_MAPS_API_KEY to your .env file.';
          console.error('❌', errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          return;
        }

        await loadGoogleMapsScript({ 
          apiKey, 
          libraries: ['places', 'geometry', 'marker'] 
        });

        setIsScriptLoaded(true);
      } catch (err) {
        console.error('❌ Failed to load Google Maps:', err);
        setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadScript();
  }, []);

  // Step 2: Create Map Instance
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    const initializeMap = async () => {
      try {
        const mapId = await configService.getGoogleMapsMapId().catch(() => undefined);

        mapInstanceRef.current = createMap(
          mapRef.current!, 
          defaultCenter, 
          defaultZoom, 
          mapId
        );
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Failed to create map:', err);
        setError(`Failed to create map: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [isScriptLoaded, defaultCenter, defaultZoom]);

  return {
    mapRef,
    mapInstance: mapInstanceRef.current,
    isLoading,
    error,
    isScriptLoaded
  };
};
