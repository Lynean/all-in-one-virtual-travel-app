import { useState, useRef, useCallback } from 'react';
import { MapLocation } from '../utils/googleMaps';
import { computeRoutes, latLngToLocation, decodePolyline, TravelMode } from '../services/routesApi';

interface UseDirectionsOptions {
  mapInstance: google.maps.Map | null;
}

interface TransitInstructions {
  steps: any[];
  totalDistance: string;
  totalDuration: string;
  fare?: any;
}

interface UseDirectionsReturn {
  transitInstructions: TransitInstructions | null;
  allRoutes: any[];
  selectedRouteIndex: number;
  isProcessing: boolean;
  showDirections: (origin: MapLocation, destination: MapLocation, travelMode?: string) => Promise<void>;
  switchToRoute: (routeIndex: number) => void;
  clearDirections: () => void;
}

export const useDirections = (
  options: UseDirectionsOptions
): UseDirectionsReturn => {
  const { mapInstance } = options;
  
  const [transitInstructions, setTransitInstructions] = useState<TransitInstructions | null>(null);
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Draw colored route segments for transit
  const drawColoredRouteSegments = useCallback((route: any) => {
    if (!mapInstance) return;

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    if (!route.legs || route.legs.length === 0) return;

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
          map: mapInstance,
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
        
        polylinesRef.current.push(polyline);
        path.forEach(point => bounds.extend(point));
      });
    });
    
    mapInstance.fitBounds(bounds);
  }, [mapInstance]);

  // Process transit steps
  const processTransitSteps = useCallback((leg: any) => {
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

    return transitSteps;
  }, []);

  const showDirections = useCallback(async (
    origin: MapLocation,
    destination: MapLocation,
    travelMode: string = 'TRANSIT'
  ) => {
    if (!mapInstance) return;

    try {
      setIsProcessing(true);

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
        computeAlternativeRoutes: true
      });

      if (!response.routes || response.routes.length === 0) {
        throw new Error('No route found between these locations.');
      }

      setAllRoutes(response.routes);
      setSelectedRouteIndex(0);
      
      const route = response.routes[0];

      // Draw route
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
          map: mapInstance
        });
        
        polylinesRef.current.push(polyline);

        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        mapInstance.fitBounds(bounds);
      }

      // Process transit instructions
      if (travelMode === 'TRANSIT' && route.legs && route.legs.length > 0) {
        const leg = route.legs[0];
        const transitSteps = processTransitSteps(leg);

        const distance = route.localizedValues?.distance?.text || `${(route.distanceMeters / 1000).toFixed(1)} km`;
        const duration = route.localizedValues?.duration?.text || route.duration;

        setTransitInstructions({
          steps: transitSteps,
          totalDistance: distance,
          totalDuration: duration,
          fare: route.travelAdvisory?.transitFare
        });
      } else {
        setTransitInstructions(null);
      }
    } catch (error) {
      console.error('Error showing directions:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [mapInstance, drawColoredRouteSegments, processTransitSteps]);

  const switchToRoute = useCallback((routeIndex: number) => {
    if (!allRoutes || routeIndex >= allRoutes.length) return;
    
    setSelectedRouteIndex(routeIndex);
    const route = allRoutes[routeIndex];
    
    drawColoredRouteSegments(route);
    
    if (route.legs && route.legs.length > 0) {
      const leg = route.legs[0];
      const transitSteps = processTransitSteps(leg);
      
      const distance = route.localizedValues?.distance?.text || `${(route.distanceMeters / 1000).toFixed(1)} km`;
      const duration = route.localizedValues?.duration?.text || route.duration;
      
      setTransitInstructions({
        steps: transitSteps,
        totalDistance: distance,
        totalDuration: duration,
        fare: route.travelAdvisory?.transitFare
      });
    }
  }, [allRoutes, drawColoredRouteSegments, processTransitSteps]);

  const clearDirections = useCallback(() => {
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
    setTransitInstructions(null);
    setAllRoutes([]);
    setSelectedRouteIndex(0);
  }, []);

  return {
    transitInstructions,
    allRoutes,
    selectedRouteIndex,
    isProcessing,
    showDirections,
    switchToRoute,
    clearDirections
  };
};
