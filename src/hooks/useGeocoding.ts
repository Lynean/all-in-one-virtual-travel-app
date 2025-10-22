import { useRef, useCallback } from 'react';
import { MapLocation } from '../utils/googleMaps';

interface UseGeocodingReturn {
  geocodeAddress: (address: string) => Promise<MapLocation | null>;
  parseCoordinateString: (coordStr: string) => MapLocation | null;
}

const GEOCODING_RATE_LIMIT = 200;

export const useGeocoding = (): UseGeocodingReturn => {
  const geocodeCache = useRef<Map<string, MapLocation>>(new Map());
  const pendingRequests = useRef<Set<string>>(new Set());
  const lastRequestTime = useRef<number>(0);

  const parseCoordinateString = useCallback((coordStr: string): MapLocation | null => {
    try {
      const parts = coordStr.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    } catch (e) {
      console.error('Failed to parse coordinates:', coordStr, e);
    }
    return null;
  }, []);

  const geocodeAddress = useCallback(async (address: string): Promise<MapLocation | null> => {
    const cacheKey = address.toLowerCase().trim();
    
    if (geocodeCache.current.has(cacheKey)) {
      return geocodeCache.current.get(cacheKey)!;
    }

    if (pendingRequests.current.has(cacheKey)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return geocodeCache.current.get(cacheKey) || null;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    if (timeSinceLastRequest < GEOCODING_RATE_LIMIT) {
      await new Promise(resolve => setTimeout(resolve, GEOCODING_RATE_LIMIT - timeSinceLastRequest));
    }

    try {
      pendingRequests.current.add(cacheKey);
      lastRequestTime.current = Date.now();

      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
      
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const mapLocation = { lat: location.lat(), lng: location.lng() };
        
        geocodeCache.current.set(cacheKey, mapLocation);
        return mapLocation;
      }
    } catch (e) {
      console.error('❌ Geocoding failed for:', address, e);
    } finally {
      pendingRequests.current.delete(cacheKey);
    }
    return null;
  }, []);

  return { geocodeAddress, parseCoordinateString };
};
