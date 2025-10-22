import { useState, useCallback } from 'react';
import { MapLocation } from '../utils/googleMaps';
import { searchNearby, searchText, convertLegacyPlaceType, latLngToLocation as placesLatLngToLocation, locationToLatLng } from '../services/placesApi';
import { calculateDistance } from '../utils/coordinateHelpers';

interface UsePlacesSearchOptions {
  mapInstance: google.maps.Map | null;
  onMarkersCreated?: (count: number) => void;
}

interface UsePlacesSearchReturn {
  isSearching: boolean;
  searchError: string | null;
  performNearbySearch: (query: string, location: MapLocation, radius?: number, filters?: SearchFilters) => Promise<any[]>;
  performTextSearch: (textQuery: string, options?: TextSearchOptions) => Promise<any[]>;
}

interface SearchFilters {
  priceLevel?: string;
  minRating?: number;
  openNow?: boolean;
}

interface TextSearchOptions {
  locationBias?: any;
  priceLevels?: string[];
  minRating?: number;
  openNow?: boolean;
  includedType?: string;
  needsGeocode?: boolean;
  geocodeLocation?: string;
  radius?: number;
}

export const usePlacesSearch = (
  options: UsePlacesSearchOptions
): UsePlacesSearchReturn => {
  const { mapInstance, onMarkersCreated } = options;
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const performNearbySearch = useCallback(async (
    query: string,
    location: MapLocation,
    radius: number = 5000,
    filters?: SearchFilters
  ): Promise<any[]> => {
    if (!mapInstance) {
      throw new Error('Map instance not available');
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      // Determine if query is a category or specific place
      const pureCategoryKeywords = [
        'restaurant', 'hotel', 'cafe', 'coffee', 'bar', 'pub',
        'attraction', 'museum', 'park', 'hospital', 'pharmacy',
        'gas station', 'bank', 'atm', 'mall', 'supermarket',
        'gym', 'spa', 'airport', 'train station', 'bus station'
      ];

      const isPureCategory = pureCategoryKeywords.some(keyword => 
        normalizedQuery === keyword || normalizedQuery === keyword + 's'
      );

      let response;

      if (!isPureCategory) {
        // Text search for specific places
        response = await searchText({
          textQuery: query,
          locationBias: {
            circle: {
              center: placesLatLngToLocation(location),
              radius
            }
          },
          maxResultCount: 20
        });
      } else {
        // Nearby search for categories
        const placeType = convertLegacyPlaceType(normalizedQuery.replace(/s$/, ''));
        
        response = await searchNearby({
          locationRestriction: {
            circle: {
              center: placesLatLngToLocation(location),
              radius
            }
          },
          includedTypes: [placeType],
          maxResultCount: 20
        });
      }

      if (!response.places || response.places.length === 0) {
        setSearchError(`No ${query} found nearby.`);
        return [];
      }

      // Apply client-side filters
      let filteredPlaces = response.places;

      if (filters?.priceLevel) {
        const priceLevelMap: Record<string, string[]> = {
          'FREE': ['FREE'],
          'INEXPENSIVE': ['FREE', 'INEXPENSIVE'],
          'MODERATE': ['FREE', 'INEXPENSIVE', 'MODERATE'],
          'EXPENSIVE': ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE'],
          'VERY_EXPENSIVE': ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE']
        };
        const allowedLevels = priceLevelMap[filters.priceLevel] || [];
        filteredPlaces = filteredPlaces.filter(place => 
          !place.priceLevel || allowedLevels.includes(place.priceLevel)
        );
      }

      if (filters?.minRating) {
        filteredPlaces = filteredPlaces.filter(place => 
          place.rating && place.rating >= filters.minRating!
        );
      }

      if (filters?.openNow) {
        filteredPlaces = filteredPlaces.filter(place => 
          place.regularOpeningHours?.openNow === true
        );
      }

      if (filteredPlaces.length === 0) {
        setSearchError(`Found ${response.places.length} places, but none matched your filters.`);
        return [];
      }

      // Center map on search location
      mapInstance.setCenter(location);
      mapInstance.setZoom(14);

      if (onMarkersCreated) {
        onMarkersCreated(filteredPlaces.length);
      }

      return filteredPlaces;
    } catch (error) {
      console.error('Nearby search error:', error);
      setSearchError('Failed to search nearby places. Please try again.');
      throw error;
    } finally {
      setIsSearching(false);
    }
  }, [mapInstance, onMarkersCreated]);

  const performTextSearch = useCallback(async (
    textQuery: string,
    options?: TextSearchOptions
  ): Promise<any[]> => {
    if (!mapInstance) {
      throw new Error('Map instance not available');
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const request: any = {
        textQuery,
        maxResultCount: 20
      };

      if (options?.locationBias) {
        request.locationRestriction = options.locationBias;
      }

      if (options?.priceLevels && options.priceLevels.length > 0) {
        request.priceLevels = options.priceLevels;
      }

      if (options?.minRating !== undefined) {
        request.minRating = options.minRating;
      }

      if (options?.openNow !== undefined) {
        request.openNow = options.openNow;
      }

      if (options?.includedType) {
        request.includedType = options.includedType;
      }

      const response = await searchText(request);

      if (!response.places || response.places.length === 0) {
        setSearchError(`No results found for "${textQuery}".`);
        return [];
      }

      // Client-side radius filtering if needed
      let filteredPlaces = response.places;
      
      if (options?.locationBias?.circle?.center && options?.radius) {
        const searchCenter = {
          lat: options.locationBias.circle.center.latitude,
          lng: options.locationBias.circle.center.longitude
        };
        
        filteredPlaces = response.places.filter(place => {
          if (!place.location) return false;
          
          const placeLocation = locationToLatLng(place.location);
          const distance = calculateDistance(searchCenter, placeLocation);
          return distance <= options.radius!;
        });
      }

      if (filteredPlaces.length === 0) {
        setSearchError(`No results found within search area for "${textQuery}".`);
        return [];
      }

      // Center map
      if (filteredPlaces[0]?.location) {
        const firstLocation = locationToLatLng(filteredPlaces[0].location);
        mapInstance.setCenter(firstLocation);
        mapInstance.setZoom(14);
      }

      if (onMarkersCreated) {
        onMarkersCreated(filteredPlaces.length);
      }

      return filteredPlaces;
    } catch (error) {
      console.error('Text search error:', error);
      setSearchError('Failed to search places. Please try again.');
      throw error;
    } finally {
      setIsSearching(false);
    }
  }, [mapInstance, onMarkersCreated]);

  return {
    isSearching,
    searchError,
    performNearbySearch,
    performTextSearch
  };
};
