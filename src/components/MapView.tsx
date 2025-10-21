import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Loader2, Map as MapIcon, Zap, Globe, Compass, Bus, Train, Coffee, Hotel, ShoppingBag, Camera, X, ChevronRight } from 'lucide-react';
import { loadGoogleMapsScript, createMap, createMarker, createInfoWindow, MapLocation } from '../utils/googleMaps';
import { hybridRouter } from '../services/hybridRouter';
import { useStore } from '../store/useStore';
import { computeRoutes, latLngToLocation, decodePolyline, TravelMode } from '../services/routesApi';
import { searchNearby, searchText, convertLegacyPlaceType, latLngToLocation as placesLatLngToLocation, locationToLatLng } from '../services/placesApi';
import { configService } from '../services/configService';

export const MapView: React.FC = () => {
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [transitInstructions, setTransitInstructions] = useState<any>(null);
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  
  // Use a ref callback to create the map container outside React's control
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const directionsPolylinesRef = useRef<google.maps.Polyline[]>([]);
  
  const geocodeCache = useRef<Map<string, MapLocation>>(new Map());
  const pendingGeocodeRequests = useRef<Set<string>>(new Set());
  const lastGeocodingTime = useRef<number>(0);
  const GEOCODING_RATE_LIMIT = 200;

  const { 
    destination, 
    currentLocation, 
    setCurrentLocation,
    locationConfirmed,
    setMapInstance 
  } = useStore();

  const calculateDistance = (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number => {
    const R = 6371e3;
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Cleanup function for all map elements
  const cleanupMapElements = () => {
    try {
      // Clean up polylines
      directionsPolylinesRef.current.forEach(polyline => {
        polyline?.setMap?.(null);
      });
      directionsPolylinesRef.current = [];

      // Clean up markers
      markersRef.current.forEach(marker => {
        marker?.setMap?.(null);
      });
      markersRef.current = [];

      // Clean up user marker
      if (userMarkerRef.current) {
        userMarkerRef.current?.setMap?.(null);
        userMarkerRef.current = null;
      }

      // Clear map instance - let Google Maps handle DOM cleanup
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  };

  // Load Google Maps Script
  useEffect(() => {
    const loadScript = async () => {
      try {
        const apiKey = await configService.getGoogleMapsApiKey();

        if (!apiKey || apiKey === 'undefined') {
          const errorMsg = 'Google Maps API key not configured. Please configure it in the admin panel or add VITE_GOOGLE_MAPS_API_KEY to your .env file.';
          console.error('❌', errorMsg);
          setMapError(errorMsg);
          setIsMapLoading(false);
          return;
        }

        await loadGoogleMapsScript({ apiKey, libraries: ['places', 'geometry'] });
        setIsScriptLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load Google Maps:', error);
        setMapError(`Failed to load Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsMapLoading(false);
      }
    };

    loadScript();
  }, []);

  // Initialize Map - using ref callback pattern
  useEffect(() => {
    if (!isScriptLoaded || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    let isMounted = true;

    const initializeMap = async () => {
      try {
        if (!isMounted) return;

        const defaultCenter = { lat: 40.7128, lng: -74.0060 };
        
        const mapId = await configService.getGoogleMapsMapId().catch(() => undefined);

        if (!isMounted) return;

        // Create map instance
        mapInstanceRef.current = createMap(mapContainerRef.current!, defaultCenter, 13, mapId);
        setMapInstance(mapInstanceRef.current);
        setIsMapLoading(false);
      } catch (error) {
        if (isMounted) {
          console.error('❌ Failed to create map:', error);
          setMapError(`Failed to create map: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsMapLoading(false);
        }
      }
    };

    initializeMap();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      // Clean up immediately, before React tries to remove the DOM
      cleanupMapElements();
    };
  }, [isScriptLoaded, setMapInstance]);

  const createUserLocationMarker = async (map: google.maps.Map, location: MapLocation) => {
    try {
      // Use regular createMarker - no custom DOM, no React conflicts
      const marker = await createMarker(map, location, 'Your Location');

      const infoWindow = createInfoWindow('<strong>You are here</strong>');
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    } catch (error) {
      console.error('Failed to create user location marker:', error);
      throw error;
    }
  };

  const recalibrateUserLocation = async (newLocation: MapLocation, recenterMap: boolean = true, zoomLevel?: number) => {
    try {
      setUserLocation(newLocation);
      setCurrentLocation(newLocation);

      if (mapInstanceRef.current) {
        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(newLocation);
        } else {
          userMarkerRef.current = await createUserLocationMarker(mapInstanceRef.current, newLocation);
        }

        if (recenterMap) {
          mapInstanceRef.current.setCenter(newLocation);
          if (zoomLevel) {
            mapInstanceRef.current.setZoom(zoomLevel);
          }
        }
      }
    } catch (error) {
      console.error('Failed to recalibrate user location:', error);
      setLocationError('Failed to update location');
    }
  };

  // Get User Location
  useEffect(() => {
    if (!navigator.geolocation || isMapLoading) return;

    let isMounted = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Check if component is still mounted and visible
        if (!isMounted || !mapContainerRef.current) return;

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setCurrentLocation(location);

        if (mapInstanceRef.current && isMounted) {
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(15);

          if (userMarkerRef.current) {
            userMarkerRef.current.setMap(null);
          }

          try {
            if (isMounted) {
              userMarkerRef.current = await createUserLocationMarker(mapInstanceRef.current, location);
            }
          } catch (error) {
            console.error('Failed to create user marker:', error);
          }
        }
      },
      (error) => {
        if (isMounted) {
          setLocationError('Unable to get your location. Please enable location services.');
          console.error('Geolocation error:', error);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [isMapLoading, setCurrentLocation]);

  const handleMapAction = async (action: any) => {
    if (!mapInstanceRef.current) return;

    switch (action.type) {
      case 'search':
        if (action.data.textQuery) {
          await performTextSearch(
            action.data.textQuery,
            action.data.locationBias,
            action.data.priceLevels,
            action.data.minRating,
            action.data.openNow,
            action.data.includedType,
            action.data.needsGeocode,
            action.data.geocodeLocation,
            action.data.radius
          );
        } else if (action.data.query) {
          if (action.data.latitude && action.data.longitude) {
            await performNearbySearch(
              action.data.query,
              { lat: action.data.latitude, lng: action.data.longitude },
              action.data.radius,
              action.data.priceLevel,
              action.data.minRating,
              action.data.openNow
            );
          } else {
            await performSearch(action.data.query);
          }
        }
        break;
      case 'marker':
        if (action.data.location) {
          addMarker(action.data.location, action.data.label);
        }
        break;
      case 'zoom':
        if (action.data.zoom) {
          mapInstanceRef.current.setZoom(action.data.zoom);
        }
        break;
      case 'directions':
      case 'route':
        if (action.data.origin && action.data.destination) {
          await showDirectionsFromAgent(
            action.data.origin, 
            action.data.destination, 
            action.data.travelMode || action.data.travel_mode || 'TRANSIT'
          );
        }
        break;
    }
  };

  const parseCoordinateString = (coordStr: string): MapLocation | null => {
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
  };

  const geocodeAddress = async (address: string): Promise<MapLocation | null> => {
    const cacheKey = address.toLowerCase().trim();
    if (geocodeCache.current.has(cacheKey)) {
      return geocodeCache.current.get(cacheKey)!;
    }

    if (pendingGeocodeRequests.current.has(cacheKey)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return geocodeCache.current.get(cacheKey) || null;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodingTime.current;
    if (timeSinceLastRequest < GEOCODING_RATE_LIMIT) {
      const waitTime = GEOCODING_RATE_LIMIT - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      pendingGeocodeRequests.current.add(cacheKey);
      lastGeocodingTime.current = Date.now();

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
      pendingGeocodeRequests.current.delete(cacheKey);
    }
    return null;
  };

  const showDirectionsFromAgent = async (
    origin: string | MapLocation,
    destination: string | MapLocation,
    travelMode: string = 'TRANSIT'
  ) => {
    if (!mapInstanceRef.current) {
      console.error('❌ Map instance not available');
      return;
    }

    try {
      setIsProcessing(true);

      let originLocation: MapLocation | null = null;
      if (typeof origin === 'string') {
        originLocation = parseCoordinateString(origin);
        if (!originLocation) {
          originLocation = await geocodeAddress(origin);
        }
      } else {
        originLocation = origin;
      }

      let destLocation: MapLocation | null = null;
      if (typeof destination === 'string') {
        destLocation = parseCoordinateString(destination);
        if (!destLocation) {
          destLocation = await geocodeAddress(destination);
        }
      } else {
        destLocation = destination;
      }

      if (!originLocation || !destLocation) {
        setLocationError('Could not determine route locations. Please try again.');
        return;
      }

      await showDirections(originLocation, destLocation, travelMode);
    } catch (error) {
      console.error('Error processing directions:', error);
      setLocationError('Failed to process directions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const drawColoredRouteSegments = (route: any) => {
    // Clean up existing polylines
    directionsPolylinesRef.current.forEach(polyline => {
      try {
        polyline.setMap(null);
      } catch (e) {
        // Ignore
      }
    });
    directionsPolylinesRef.current = [];

    if (!route.legs || route.legs.length === 0 || !mapInstanceRef.current) return;

    const bounds = new google.maps.LatLngBounds();
    
    route.legs.forEach((leg: any) => {
      if (!leg.steps) return;
      
      leg.steps.forEach((step: any) => {
        if (!step.polyline?.encodedPolyline) return;
        
        const path = decodePolyline(step.polyline.encodedPolyline);
        let strokeColor = '#666666';
        let strokeWeight = 5;
        let zIndex = 1;
        
        if (step.travelMode === 'WALK') {
          strokeColor = '#888888';
          strokeWeight = 3;
          zIndex = 0;
        } else if (step.transitDetails) {
          strokeColor = step.transitDetails.transitLine?.color || '#4F46E5';
          strokeWeight = 6;
          zIndex = 2;
        }
        
        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor,
          strokeOpacity: step.travelMode === 'WALK' ? 0.6 : 0.9,
          strokeWeight,
          map: mapInstanceRef.current,
          zIndex,
          ...(step.travelMode === 'WALK' && {
            icons: [{
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 3
              },
              offset: '0',
              repeat: '15px'
            }]
          })
        });
        
        directionsPolylinesRef.current.push(polyline);
        path.forEach(point => bounds.extend(point));
      });
    });
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  const showDirections = async (
    origin: MapLocation,
    destination: MapLocation,
    travelMode: string = 'TRANSIT'
  ) => {
    if (!mapInstanceRef.current) return;

    try {
      setIsProcessing(true);

      // Clean up existing elements
      directionsPolylinesRef.current.forEach(polyline => {
        polyline?.setMap?.(null);
      });
      directionsPolylinesRef.current = [];

      markersRef.current.forEach(marker => {
        marker?.setMap?.(null);
      });
      markersRef.current = [];

      const response = await computeRoutes({
        origin: {
          location: {
            latLng: latLngToLocation(origin)
          }
        },
        destination: {
          location: {
            latLng: latLngToLocation(destination)
          }
        },
        travelMode: travelMode as TravelMode,
        computeAlternativeRoutes: false
      });

      if (!response.routes || response.routes.length === 0) {
        setLocationError('No route found between these locations.');
        return;
      }

      setAllRoutes(response.routes);
      setSelectedRouteIndex(0);
      
      const route = response.routes[0];

      if (travelMode === 'TRANSIT') {
        drawColoredRouteSegments(route);
      } else if (route.polyline.encodedPolyline) {
        const path = decodePolyline(route.polyline.encodedPolyline);
        
        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#4F46E5',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map: mapInstanceRef.current
        });
        
        directionsPolylinesRef.current.push(polyline);

        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        mapInstanceRef.current.fitBounds(bounds);
      }

      const originMarker = await createMarker(mapInstanceRef.current, origin, 'Origin');
      const destMarker = await createMarker(mapInstanceRef.current, destination, 'Destination');
      
      markersRef.current.push(originMarker, destMarker);

      const distance = route.localizedValues?.distance?.text || `${(route.distanceMeters / 1000).toFixed(1)} km`;
      const duration = route.localizedValues?.duration?.text || route.duration;
      
      if (travelMode === 'TRANSIT' && route.legs && route.legs.length > 0) {
        const leg = route.legs[0];
        const transitSteps: any[] = [];

        if (leg.steps) {
          leg.steps.forEach((step: any, index: number) => {
            if (step.transitDetails) {
              transitSteps.push({
                type: 'transit',
                index: index + 1,
                transitDetails: step.transitDetails,
                distance: step.localizedValues?.distance?.text || `${(step.distanceMeters / 1000).toFixed(1)} km`,
                duration: step.localizedValues?.staticDuration?.text || step.staticDuration
              });
            } else if (step.travelMode === 'WALK') {
              transitSteps.push({
                type: 'walk',
                index: index + 1,
                distance: step.localizedValues?.distance?.text || `${(step.distanceMeters / 1000).toFixed(1)} km`,
                duration: step.localizedValues?.staticDuration?.text || step.staticDuration,
                instruction: step.navigationInstruction?.instructions || 'Walk'
              });
            }
          });
        }

        const transitData = {
          steps: transitSteps,
          totalDistance: distance,
          totalDuration: duration,
          fare: route.travelAdvisory?.transitFare
        };

        setTransitInstructions(transitData);
        setLocationError(`Transit route found: ${distance}, ${duration}`);
      } else {
        setTransitInstructions(null);
        setLocationError(`Route found: ${distance}, ${duration}`);
      }
    } catch (error) {
      console.error('Error showing directions:', error);
      setLocationError('Failed to get directions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const switchToRoute = (routeIndex: number) => {
    if (!allRoutes || routeIndex >= allRoutes.length) return;
    
    setSelectedRouteIndex(routeIndex);
    const route = allRoutes[routeIndex];
    
    drawColoredRouteSegments(route);
    
    const distance = route.localizedValues?.distance?.text || `${(route.distanceMeters / 1000).toFixed(1)} km`;
    const duration = route.localizedValues?.duration?.text || route.duration;
    
    if (route.legs && route.legs.length > 0) {
      const leg = route.legs[0];
      const transitSteps: any[] = [];
      
      if (leg.steps) {
        leg.steps.forEach((step: any, index: number) => {
          if (step.transitDetails) {
            transitSteps.push({
              type: 'transit',
              index: index + 1,
              transitDetails: step.transitDetails,
              distance: step.localizedValues?.distance?.text || `${(step.distanceMeters / 1000).toFixed(1)} km`,
              duration: step.localizedValues?.staticDuration?.text || step.staticDuration
            });
          } else if (step.travelMode === 'WALK') {
            transitSteps.push({
              type: 'walk',
              index: index + 1,
              distance: step.localizedValues?.distance?.text || `${(step.distanceMeters / 1000).toFixed(1)} km`,
              duration: step.localizedValues?.staticDuration?.text || step.staticDuration,
              instruction: step.navigationInstruction?.instructions || 'Walk'
            });
          }
        });
      }
      
      const transitData = {
        steps: transitSteps,
        totalDistance: distance,
        totalDuration: duration,
        fare: route.travelAdvisory?.transitFare
      };
      
      setTransitInstructions(transitData);
      setLocationError(`Route ${routeIndex + 1}: ${distance}, ${duration}`);
    }
  };

  const performSearch = async (query: string) => {
    if (!mapInstanceRef.current) return;

    const geocoder = new google.maps.Geocoder();
    
    try {
      const result = await geocoder.geocode({ address: query });
      
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const position = { lat: location.lat(), lng: location.lng() };

        mapInstanceRef.current.setCenter(position);
        mapInstanceRef.current.setZoom(15);

        markersRef.current.forEach(marker => {
          marker?.setMap?.(null);
        });
        markersRef.current = [];

        createMarker(mapInstanceRef.current, position, query).then(marker => {
          const infoWindow = createInfoWindow(
            `<div style="padding: 8px;">
              <strong>${result.results[0].formatted_address}</strong>
            </div>`
          );

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current!, marker);
          });

          markersRef.current.push(marker);
          infoWindow.open(mapInstanceRef.current, marker);
        }).catch(error => {
          console.error('Failed to create marker:', error);
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setLocationError('Could not find location. Please try a different search.');
    }
  };

  const performNearbySearch = async (
    query: string, 
    location: MapLocation, 
    radius: number = 5000,
    priceLevel?: string,
    minRating?: number,
    openNow?: boolean
  ) => {
    if (!mapInstanceRef.current) return;

    try {
      setIsProcessing(true);

      markersRef.current.forEach(marker => {
        marker?.setMap?.(null);
      });
      markersRef.current = [];

      let normalizedQuery = query.toLowerCase().trim();
      
      const specificPlaceIndicators = [
        /^[A-Z]/,
        /\b(on|at|near|street|road|avenue|lane|drive|blvd|boulevard)\b/i,
        /\d+/,
        query.split(' ').length >= 3,
      ];
      
      const looksLikeSpecificPlace = specificPlaceIndicators.some(indicator => 
        typeof indicator === 'boolean' ? indicator : indicator.test(query)
      );

      const pureCategoryKeywords = [
        'restaurant', 'hotel', 'cafe', 'coffee', 'bar', 'pub',
        'attraction', 'museum', 'park', 'hospital', 'pharmacy',
        'gas station', 'bank', 'atm', 'mall', 'supermarket',
        'gym', 'spa', 'airport', 'train station', 'bus station'
      ];

      const isPureCategory = pureCategoryKeywords.some(keyword => 
        normalizedQuery === keyword || normalizedQuery === keyword + 's'
      );

      const isCategory = isPureCategory && !looksLikeSpecificPlace;

      let response;

      if (!isCategory) {
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
        if (normalizedQuery.endsWith('s')) {
          normalizedQuery = normalizedQuery.slice(0, -1);
        }
        
        const queryMap: Record<string, string> = {
          'restaurant': 'restaurant',
          'hotel': 'lodging',
          'coffee shop': 'cafe',
          'cafe': 'cafe',
          'bar': 'bar',
          'attraction': 'tourist_attraction',
          'museum': 'museum',
          'park': 'park',
          'hospital': 'hospital',
          'pharmacy': 'pharmacy',
          'gas station': 'gas_station',
          'bank': 'bank',
          'atm': 'atm',
          'shopping mall': 'shopping_mall',
          'supermarket': 'supermarket',
          'gym': 'gym',
          'spa': 'spa',
          'airport': 'airport',
          'train station': 'train_station',
          'bus station': 'bus_station',
          'food': 'restaurant',
        };

        const placeType = queryMap[normalizedQuery] || convertLegacyPlaceType(normalizedQuery);

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
        setLocationError(`No ${query} found nearby.`);
        return;
      }

      let filteredPlaces = response.places;

      if (priceLevel) {
        const priceLevelMap: Record<string, string[]> = {
          'FREE': ['FREE'],
          'INEXPENSIVE': ['FREE', 'INEXPENSIVE'],
          'MODERATE': ['FREE', 'INEXPENSIVE', 'MODERATE'],
          'EXPENSIVE': ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE'],
          'VERY_EXPENSIVE': ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE']
        };
        const allowedLevels = priceLevelMap[priceLevel] || [];
        filteredPlaces = filteredPlaces.filter(place => 
          !place.priceLevel || allowedLevels.includes(place.priceLevel)
        );
      }

      if (minRating) {
        filteredPlaces = filteredPlaces.filter(place => 
          place.rating && place.rating >= minRating
        );
      }

      if (openNow) {
        filteredPlaces = filteredPlaces.filter(place => 
          place.regularOpeningHours?.openNow === true
        );
      }

      if (filteredPlaces.length === 0) {
        setLocationError(`Found ${response.places.length} places, but none matched your filters (price, rating, or open now).`);
        return;
      }

      mapInstanceRef.current.setCenter(location);
      mapInstanceRef.current.setZoom(14);

      let markersCreated = 0;
      for (const place of filteredPlaces) {
        if (place.location) {
          const placeLocation = locationToLatLng(place.location);
          const marker = await createMarker(
            mapInstanceRef.current,
            placeLocation,
            place.displayName?.text || 'Place'
          );

          const infoContent = `
            <div style="padding: 8px; max-width: 200px;">
              <strong>${place.displayName?.text || 'Place'}</strong><br/>
              ${place.formattedAddress || ''}<br/>
              ${place.rating ? `⭐ ${place.rating}` : ''}
            </div>
          `;
          const infoWindow = createInfoWindow(infoContent);

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current!, marker);
          });

          markersRef.current.push(marker);
          markersCreated++;
        }
      }

      setLocationError(`Found ${markersCreated} ${query} nearby.`);
    } catch (error) {
      console.error('Nearby search error:', error);
      setLocationError('Failed to search nearby places. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const performTextSearch = async (
    textQuery: string,
    locationBias?: any,
    priceLevels?: string[],
    minRating?: number,
    openNow?: boolean,
    includedType?: string,
    needsGeocode?: boolean,
    geocodeLocation?: string,
    radius?: number
  ) => {
    if (!mapInstanceRef.current) return;

    try {
      setIsProcessing(true);

      markersRef.current.forEach(marker => {
        marker?.setMap?.(null);
      });
      markersRef.current = [];

      let finalLocationBias = locationBias;
      let searchCenter: { lat: number; lng: number } | null = null;
      let searchRadius = radius || 5000;
      
      if (needsGeocode && geocodeLocation) {
        const geocodedLocation = await geocodeAddress(geocodeLocation);
        
        if (geocodedLocation) {
          searchCenter = geocodedLocation;
          searchRadius = radius || 5000;
          
          finalLocationBias = {
            circle: {
              center: {
                latitude: geocodedLocation.lat,
                longitude: geocodedLocation.lng
              },
              radius: searchRadius
            }
          };
        }
      } else if (locationBias?.circle?.center) {
        searchCenter = {
          lat: locationBias.circle.center.latitude,
          lng: locationBias.circle.center.longitude
        };
        searchRadius = locationBias.circle.radius || 5000;
      }

      const request: any = {
        textQuery,
        maxResultCount: 20
      };

      if (finalLocationBias) {
        request.locationRestriction = finalLocationBias;
      }

      if (priceLevels && priceLevels.length > 0) {
        request.priceLevels = priceLevels;
      }

      if (minRating !== undefined) {
        request.minRating = minRating;
      }

      if (openNow !== undefined) {
        request.openNow = openNow;
      }

      if (includedType) {
        request.includedType = includedType;
      }

      const response = await searchText(request);

      if (!response.places || response.places.length === 0) {
        setLocationError(`No results found for "${textQuery}".`);
        return;
      }

      let filteredPlaces = response.places;
      if (searchCenter && searchRadius) {
        filteredPlaces = response.places.filter(place => {
          if (!place.location) return false;
          
          const placeLocation = locationToLatLng(place.location);
          const distance = calculateDistance(searchCenter!, placeLocation);
          const isWithinRadius = distance <= searchRadius;
          
          return isWithinRadius;
        });
      }

      if (filteredPlaces.length === 0) {
        setLocationError(`No results found within ${searchRadius}m for "${textQuery}".`);
        return;
      }

      if (searchCenter) {
        mapInstanceRef.current.setCenter(searchCenter);
        mapInstanceRef.current.setZoom(14);
      } else if (filteredPlaces[0]?.location) {
        const firstLocation = locationToLatLng(filteredPlaces[0].location);
        mapInstanceRef.current.setCenter(firstLocation);
        mapInstanceRef.current.setZoom(14);
      }

      let markersCreated = 0;
      for (const place of filteredPlaces) {
        if (place.location) {
          const placeLocation = locationToLatLng(place.location);
          const marker = await createMarker(
            mapInstanceRef.current,
            placeLocation,
            place.displayName?.text || 'Place'
          );

          const infoContent = `
            <div style="padding: 8px; max-width: 200px;">
              <strong>${place.displayName?.text || 'Place'}</strong><br/>
              ${place.formattedAddress || ''}<br/>
              ${place.rating ? `⭐ ${place.rating}` : ''}
              ${place.priceLevel ? `<br/>💰 ${place.priceLevel.replace('PRICE_LEVEL_', '')}` : ''}
            </div>
          `;
          const infoWindow = createInfoWindow(infoContent);

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current!, marker);
          });

          markersRef.current.push(marker);
          markersCreated++;
        }
      }

      setLocationError(`✅ Found ${markersCreated} places for "${textQuery}".`);
    } catch (error) {
      console.error('Text search error:', error);
      setLocationError('Failed to search places. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addMarker = async (location: { lat: number; lng: number }, label?: string) => {
    if (!mapInstanceRef.current) return;

    try {
      const marker = await createMarker(mapInstanceRef.current, location, label || 'Location');

      const infoWindow = createInfoWindow(
        `<div style="padding: 8px;">
          <strong>${label || 'Location'}</strong>
        </div>`
      );

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
    } catch (error) {
      console.error('Failed to create marker:', error);
    }
  };

  const handleNearbySearch = async (type: string) => {
    if (!mapInstanceRef.current || !userLocation) {
      setLocationError('Please enable location services to search nearby places.');
      return;
    }

    setIsProcessing(true);

    try {
      markersRef.current.forEach(marker => {
        marker?.setMap?.(null);
      });
      markersRef.current = [];

      const response = await searchNearby({
        includedTypes: [convertLegacyPlaceType(type.toLowerCase())],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: placesLatLngToLocation(userLocation),
            radius: 2000
          }
        },
        rankPreference: 'POPULARITY'
      });

      if (response.places && response.places.length > 0) {
        const markerPromises = response.places.map(async (place) => {
          if (place.location && mapInstanceRef.current) {
            const position = locationToLatLng(place.location);

            try {
              const marker = await createMarker(
                mapInstanceRef.current, 
                position, 
                place.displayName?.text || 'Unknown'
              );

              const infoWindow = createInfoWindow(
                `<div style="padding: 8px;">
                  <strong>${place.displayName?.text || 'Unknown'}</strong><br/>
                  ${place.formattedAddress || ''}<br/>
                  ${place.rating ? `⭐ ${place.rating} (${place.userRatingCount || 0} reviews)` : ''}
                  ${place.priceLevel ? `<br/>💰 ${place.priceLevel}` : ''}
                  ${place.businessStatus === 'OPERATIONAL' ? '<br/>✅ Open' : ''}
                </div>`
              );

              marker.addListener('click', () => {
                infoWindow.open(mapInstanceRef.current!, marker);
              });

              markersRef.current.push(marker);
            } catch (error) {
              console.error('Failed to create marker:', error);
            }
          }
        });

        await Promise.all(markerPromises);
        setLocationError(`Found ${response.places.length} ${type}(s) nearby`);
      } else {
        setLocationError(`No ${type}s found nearby`);
      }
    } catch (error) {
      console.error('Error searching nearby places:', error);
      setLocationError('Failed to search nearby places. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const nearbyPlaces = [
    { type: 'restaurant', label: 'Restaurants', icon: Coffee, color: 'from-orange-500 to-red-600' },
    { type: 'lodging', label: 'Hotels', icon: Hotel, color: 'from-blue-500 to-indigo-600' },
    { type: 'tourist_attraction', label: 'Attractions', icon: Camera, color: 'from-purple-500 to-pink-600' },
    { type: 'shopping_mall', label: 'Shopping', icon: ShoppingBag, color: 'from-green-500 to-emerald-600' },
  ];

  // Ref callback to create map container
  const setMapContainerRef = (element: HTMLDivElement | null) => {
    if (element && !mapContainerRef.current) {
      mapContainerRef.current = element;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
              <Globe className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Interactive Map</h2>
              <p className="text-sm text-gray-500 mt-1">Explore and navigate with AI guidance</p>
            </div>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" strokeWidth={2.5} />
              <span className="text-sm font-medium text-blue-600">Processing...</span>
            </div>
          )}
        </div>

        {locationError && (
          <div className={`rounded-2xl p-4 ${
            locationError.includes('Failed') || locationError.includes('Unable') 
              ? 'bg-red-50 border border-red-200' 
              : locationError.includes('✅')
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm font-medium ${
              locationError.includes('Failed') || locationError.includes('Unable')
                ? 'text-red-700'
                : locationError.includes('✅')
                ? 'text-green-700'
                : 'text-blue-700'
            }`}>
              {locationError}
            </p>
          </div>
        )}
      </div>

      {userLocation && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Navigation className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Your Location</h3>
              <p className="text-sm text-gray-500">Current position</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Latitude</p>
              <p className="text-sm font-mono text-gray-900">{userLocation.lat.toFixed(6)}°</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Longitude</p>
              <p className="text-sm font-mono text-gray-900">{userLocation.lng.toFixed(6)}°</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {isMapLoading && (
          <div className="w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50" style={{ height: '600px' }}>
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-gray-900 font-bold text-xl mb-2">Loading Map</h3>
              <p className="text-gray-600 text-sm">Initializing your location...</p>
            </div>
          </div>
        )}
        {/* Map container - NO React children inside, Google Maps manages this DOM */}
        <div
          ref={setMapContainerRef}
          className="w-full"
          style={{ height: '600px', display: isMapLoading ? 'none' : 'block' }}
        />
      </div>

      {transitInstructions && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <Navigation className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Transit Directions</h3>
              <p className="text-sm text-gray-500">{transitInstructions.totalDistance} • {transitInstructions.totalDuration}</p>
            </div>
          </div>

          <div className="space-y-3">
            {transitInstructions.steps.map((step: any, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                {step.type === 'transit' ? (
                  <>
                    <div className="p-2 bg-blue-500 rounded-lg">
                      {step.transitDetails.transitLine?.vehicle?.type === 'BUS' ? (
                        <Bus className="w-5 h-5 text-white" />
                      ) : (
                        <Train className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {step.transitDetails.transitLine?.name || 'Transit'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {step.transitDetails.stopDetails?.departureStop?.name} → {step.transitDetails.stopDetails?.arrivalStop?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {step.distance} • {step.duration}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-gray-400 rounded-lg">
                      <Navigation className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Walk</p>
                      <p className="text-sm text-gray-600">{step.instruction}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {step.distance} • {step.duration}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {transitInstructions.fare && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm font-semibold text-green-900">
                Estimated Fare: {transitInstructions.fare.text}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
            <Compass className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Explore Nearby</h3>
            <p className="text-sm text-gray-500">Quick access to popular places</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {nearbyPlaces.map((place) => {
            const Icon = place.icon;
            return (
              <button
                key={place.type}
                onClick={() => handleNearbySearch(place.type)}
                disabled={!userLocation || isProcessing}
                className={`group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br ${place.color} text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                <p className="text-sm font-semibold">{place.label}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
