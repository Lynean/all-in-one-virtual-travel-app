import { useCallback } from 'react';
import { MapLocation } from '../utils/googleMaps';
import { searchNearby, searchText, convertLegacyPlaceType, latLngToLocation, locationToLatLng } from '../services/placesApi';

interface UseSearchOptions {
  mapInstance: google.maps.Map | null;
  userLocation: MapLocation | null;
  onMarkersCreated: (count: number, query: string) => void;
  onError: (message: string) => void;
  createMarker: (location: MapLocation, label: string, infoContent: string) => Promise<void>;
}

interface UseSearchReturn {
  performTextSearch: (query: string) => Promise<void>;
  performNearbySearch: (query: string, location: MapLocation, radius?: number, filters?: SearchFilters) => Promise<void>;
}

interface SearchFilters {
  priceLevels?: string[];
  minRating?: number;
  openNow?: boolean;
  includedType?: string;
}

const filterPlaces = (places: any[], filters?: SearchFilters) => {
  let filtered = places;

  if (filters?.priceLevels && filters.priceLevels.length > 0) {
    filtered = filtered.filter(place => 
      !place.priceLevel || filters.priceLevels!.includes(place.priceLevel)
    );
  }

  if (filters?.minRating) {
    filtered = filtered.filter(place => 
      place.rating && place.rating >= filters.minRating!
    );
  }

  if (filters?.openNow) {
    filtered = filtered.filter(place => 
      place.regularOpeningHours?.openNow === true
    );
  }

  return filtered;
};

export const useSearch = (options: UseSearchOptions): UseSearchReturn => {
  const { mapInstance, userLocation, onMarkersCreated, onError, createMarker } = options;

  const performTextSearch = useCallback(async (query: string) => {
    if (!mapInstance) return;

    try {
      const response = await searchText({
        textQuery: query,
        maxResultCount: 20
      });

      if (!response.places || response.places.length === 0) {
        onError(`No results found for "${query}".`);
        return;
      }

      const firstLocation = locationToLatLng(response.places[0].location);
      mapInstance.setCenter(firstLocation);
      mapInstance.setZoom(14);

      let markersCreated = 0;
      for (const place of response.places) {
        if (place.location) {
          const placeLocation = locationToLatLng(place.location);
          const infoContent = `
            <div style="padding: 8px; max-width: 200px;">
              <strong style="font-size: 14px; color: #111827;">${place.displayName?.text || 'Place'}</strong><br/>
              <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">${place.formattedAddress || ''}</p>
              ${place.rating ? `<p style="font-size: 12px; color: #f59e0b; margin: 4px 0;">⭐ ${place.rating}</p>` : ''}
              ${place.priceLevel ? `<p style="font-size: 12px; color: #10b981; margin: 4px 0;">💰 ${place.priceLevel.replace('PRICE_LEVEL_', '')}</p>` : ''}
            </div>
          `;
          await createMarker(placeLocation, place.displayName?.text || 'Place', infoContent);
          markersCreated++;
        }
      }

      onMarkersCreated(markersCreated, query);
    } catch (error) {
      console.error('Text search error:', error);
      onError('Failed to search places. Please try again.');
    }
  }, [mapInstance, onMarkersCreated, onError, createMarker]);

  const performNearbySearch = useCallback(async (
    query: string,
    location: MapLocation,
    radius = 5000,
    filters?: SearchFilters
  ) => {
    if (!mapInstance) return;

    try {
      const normalizedQuery = query.toLowerCase().trim().replace(/s$/, '');
      const placeType = convertLegacyPlaceType(normalizedQuery);

      const response = await searchNearby({
        locationRestriction: {
          circle: {
            center: latLngToLocation(location),
            radius
          }
        },
        includedTypes: [placeType],
        maxResultCount: 20
      });

      if (!response.places || response.places.length === 0) {
        onError(`No ${query} found nearby.`);
        return;
      }

      const filteredPlaces = filterPlaces(response.places, filters);

      if (filteredPlaces.length === 0) {
        onError(`Found ${response.places.length} places, but none matched your filters.`);
        return;
      }

      mapInstance.setCenter(location);
      mapInstance.setZoom(14);

      let markersCreated = 0;
      for (const place of filteredPlaces) {
        if (place.location) {
          const placeLocation = locationToLatLng(place.location);
          const infoContent = `
            <div style="padding: 8px; max-width: 200px;">
              <strong style="font-size: 14px; color: #111827;">${place.displayName?.text || 'Place'}</strong><br/>
              <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">${place.formattedAddress || ''}</p>
              ${place.rating ? `<p style="font-size: 12px; color: #f59e0b; margin: 4px 0;">⭐ ${place.rating}</p>` : ''}
            </div>
          `;
          await createMarker(placeLocation, place.displayName?.text || 'Place', infoContent);
          markersCreated++;
        }
      }

      onMarkersCreated(markersCreated, query);
    } catch (error) {
      console.error('Nearby search error:', error);
      onError('Failed to search nearby places. Please try again.');
    }
  }, [mapInstance, onMarkersCreated, onError, createMarker]);

  return { performTextSearch, performNearbySearch };
};
