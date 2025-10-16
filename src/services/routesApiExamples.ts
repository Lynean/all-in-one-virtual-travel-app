/**
 * Google Routes API Examples
 * 
 * This file demonstrates how to use the new Routes API
 * to replace the deprecated Directions API and Distance Matrix API
 */

import {
  computeRoutes,
  computeRouteMatrix,
  latLngToLocation,
  locationToLatLng,
  decodePolyline,
  convertTravelMode,
  TravelMode,
  RoutingPreference,
  Units,
  type ComputeRoutesRequest,
  type ComputeRouteMatrixRequest
} from './routesApi';

/**
 * Example 1: Simple Route Calculation
 * Replaces: DirectionsService.route()
 */
export const getSimpleRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  const request: ComputeRoutesRequest = {
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
    travelMode: TravelMode.DRIVE,
    routingPreference: RoutingPreference.TRAFFIC_AWARE,
    computeAlternativeRoutes: false
  };

  const response = await computeRoutes(request);
  
  if (response.routes && response.routes.length > 0) {
    const route = response.routes[0];
    console.log('Distance:', route.distanceMeters, 'meters');
    console.log('Duration:', route.duration);
    console.log('Description:', route.description);
    return route;
  }
  
  throw new Error('No routes found');
};

/**
 * Example 2: Route with Waypoints (Intermediates)
 * Replaces: DirectionsService.route() with waypoints
 */
export const getRouteWithWaypoints = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: { lat: number; lng: number }[]
) => {
  const request: ComputeRoutesRequest = {
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
    intermediates: waypoints.map(wp => ({
      location: {
        latLng: latLngToLocation(wp)
      }
    })),
    travelMode: TravelMode.DRIVE
  };

  return await computeRoutes(request);
};

/**
 * Example 3: Route with Modifiers (Avoid Tolls, Highways, Ferries)
 * Replaces: DirectionsService.route() with avoidTolls, avoidHighways, avoidFerries
 */
export const getRouteWithModifiers = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  avoidTolls: boolean = false,
  avoidHighways: boolean = false,
  avoidFerries: boolean = false
) => {
  const request: ComputeRoutesRequest = {
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
    travelMode: TravelMode.DRIVE,
    routeModifiers: {
      avoidTolls,
      avoidHighways,
      avoidFerries
    }
  };

  return await computeRoutes(request);
};

/**
 * Example 4: Get Alternative Routes
 * Replaces: DirectionsService.route() with provideRouteAlternatives
 */
export const getAlternativeRoutes = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  const request: ComputeRoutesRequest = {
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
    travelMode: TravelMode.DRIVE,
    computeAlternativeRoutes: true
  };

  const response = await computeRoutes(request);
  
  console.log(`Found ${response.routes.length} route(s)`);
  response.routes.forEach((route, index) => {
    console.log(`Route ${index + 1}:`);
    console.log('  Distance:', route.distanceMeters, 'meters');
    console.log('  Duration:', route.duration);
  });
  
  return response.routes;
};

/**
 * Example 5: Distance Matrix Calculation
 * Replaces: DistanceMatrixService.getDistanceMatrix()
 */
export const getDistanceMatrix = async (
  origins: { lat: number; lng: number }[],
  destinations: { lat: number; lng: number }[]
) => {
  const request: ComputeRouteMatrixRequest = {
    origins: origins.map(origin => ({
      location: {
        latLng: latLngToLocation(origin)
      }
    })),
    destinations: destinations.map(dest => ({
      location: {
        latLng: latLngToLocation(dest)
      }
    })),
    travelMode: TravelMode.DRIVE,
    routingPreference: RoutingPreference.TRAFFIC_AWARE
  };

  const response = await computeRouteMatrix(request);
  
  // Process the matrix
  response.data.forEach(element => {
    if (element.status?.code === 0) {
      console.log(
        `Origin ${element.originIndex} to Destination ${element.destinationIndex}:`
      );
      console.log('  Distance:', element.distanceMeters, 'meters');
      console.log('  Duration:', element.duration);
    }
  });
  
  return response;
};

/**
 * Example 6: Display Route on Map
 * Shows how to render the route polyline on Google Maps
 */
export const displayRouteOnMap = async (
  map: google.maps.Map,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  const request: ComputeRoutesRequest = {
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
    travelMode: TravelMode.DRIVE
  };

  const response = await computeRoutes(request);
  
  if (response.routes && response.routes.length > 0) {
    const route = response.routes[0];
    
    // Decode the encoded polyline
    if (route.polyline.encodedPolyline) {
      const path = decodePolyline(route.polyline.encodedPolyline);
      
      // Create and display the polyline
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#4F46E5',
        strokeOpacity: 0.8,
        strokeWeight: 5,
        map
      });
      
      // Fit map to route bounds
      if (route.viewport) {
        const bounds = new google.maps.LatLngBounds(
          locationToLatLng(route.viewport.low),
          locationToLatLng(route.viewport.high)
        );
        map.fitBounds(bounds);
      }
      
      return polyline;
    }
  }
  
  throw new Error('No route found');
};

/**
 * Example 7: Different Travel Modes
 * Shows how to get routes for walking, biking, driving, etc.
 */
export const getRoutesByTravelMode = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  const modes = [
    TravelMode.DRIVE,
    TravelMode.WALK,
    TravelMode.BICYCLE,
    TravelMode.TWO_WHEELER,
    TravelMode.TRANSIT
  ];
  
  const results = await Promise.allSettled(
    modes.map(async mode => {
      const request: ComputeRoutesRequest = {
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
        travelMode: mode
      };
      
      const response = await computeRoutes(request);
      return {
        mode,
        route: response.routes[0]
      };
    })
  );
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`${modes[index]}:`);
      console.log('  Distance:', result.value.route.distanceMeters, 'meters');
      console.log('  Duration:', result.value.route.duration);
    } else {
      console.log(`${modes[index]}: Failed -`, result.reason);
    }
  });
  
  return results;
};

/**
 * Example 8: Route with Departure Time (for traffic-aware routing)
 */
export const getRouteWithDepartureTime = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  departureTime: Date
) => {
  const request: ComputeRoutesRequest = {
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
    travelMode: TravelMode.DRIVE,
    routingPreference: RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
    departureTime: departureTime.toISOString()
  };

  const response = await computeRoutes(request);
  
  if (response.routes && response.routes.length > 0) {
    const route = response.routes[0];
    console.log('With traffic:');
    console.log('  Duration:', route.duration);
    console.log('  Static duration:', route.legs[0]?.staticDuration);
    return route;
  }
  
  throw new Error('No route found');
};

/**
 * Migration Helper: Convert old DirectionsRequest to new Routes API format
 */
export const migrateDirectionsRequest = (
  oldRequest: google.maps.DirectionsRequest
): ComputeRoutesRequest => {
  return {
    origin: {
      location: typeof oldRequest.origin === 'string'
        ? undefined
        : { latLng: latLngToLocation(oldRequest.origin as { lat: number; lng: number }) },
      address: typeof oldRequest.origin === 'string' ? oldRequest.origin : undefined
    },
    destination: {
      location: typeof oldRequest.destination === 'string'
        ? undefined
        : { latLng: latLngToLocation(oldRequest.destination as { lat: number; lng: number }) },
      address: typeof oldRequest.destination === 'string' ? oldRequest.destination : undefined
    },
    travelMode: convertTravelMode(oldRequest.travelMode || google.maps.TravelMode.DRIVING),
    routeModifiers: {
      avoidTolls: oldRequest.avoidTolls,
      avoidHighways: oldRequest.avoidHighways,
      avoidFerries: oldRequest.avoidFerries
    },
    computeAlternativeRoutes: oldRequest.provideRouteAlternatives
  };
};
