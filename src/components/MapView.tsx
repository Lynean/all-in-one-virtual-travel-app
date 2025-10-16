import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, MapPin, Loader2, Bot } from 'lucide-react';
import { loadGoogleMapsScript, createMap, createMarker, createInfoWindow, MapLocation } from '../utils/googleMaps';
import { hybridRouter } from '../services/hybridRouter';
import { useStore } from '../store/useStore';
import { computeRoutes, latLngToLocation, decodePolyline, TravelMode } from '../services/routesApi';
import { searchNearby, convertLegacyPlaceType, latLngToLocation as placesLatLngToLocation, locationToLatLng } from '../services/placesApi';

export const MapView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsPolylineRef = useRef<google.maps.Polyline | null>(null);

  const { 
    destination, 
    currentLocation, 
    setCurrentLocation,
    locationConfirmed,
    setMapInstance 
  } = useStore();

  // Step 1: Load Google Maps Script
  useEffect(() => {
    const loadScript = async () => {
      console.log('🗺️ Loading Google Maps script...');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      console.log('API Key present:', !!apiKey);
      
      if (!apiKey || apiKey === 'undefined') {
        const errorMsg = 'Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.';
        console.error('❌', errorMsg);
        setMapError(errorMsg);
        setIsMapLoading(false);
        return;
      }

      try {
        await loadGoogleMapsScript({ apiKey, libraries: ['places', 'geometry', 'marker'] });
        console.log('✅ Google Maps script loaded');
        setIsScriptLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load Google Maps:', error);
        setMapError(`Failed to load Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsMapLoading(false);
      }
    };

    loadScript();
  }, []);

  // Step 2: Create Map Instance when both script and ref are ready
  useEffect(() => {
    console.log('📍 Map creation effect triggered', {
      isScriptLoaded,
      hasMapRef: !!mapRef.current,
      hasMapInstance: !!mapInstanceRef.current
    });

    if (!isScriptLoaded) {
      console.log('⏳ Waiting for script to load...');
      return;
    }

    if (!mapRef.current) {
      console.log('⏳ Waiting for map ref...');
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          console.log('🔄 Retrying map creation...');
          setIsScriptLoaded(prev => prev); // Trigger re-render
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    if (mapInstanceRef.current) {
      console.log('ℹ️ Map instance already exists');
      return;
    }

    console.log('🗺️ Creating map instance...');
    
    try {
      const defaultCenter = { lat: 40.7128, lng: -74.0060 };
      const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
      
      console.log('Map ID:', mapId || 'not set');
      
      mapInstanceRef.current = createMap(mapRef.current, defaultCenter, 13, mapId);
      setMapInstance(mapInstanceRef.current);
      setIsMapLoading(false);
      console.log('✅ Map instance created and stored');
    } catch (error) {
      console.error('❌ Failed to create map:', error);
      setMapError(`Failed to create map: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsMapLoading(false);
    }
  }, [isScriptLoaded, setMapInstance]);

  // Helper function to create a blue dot marker for user location
  const createUserLocationMarker = async (map: google.maps.Map, location: MapLocation) => {
    try {
      // Create a blue dot SVG icon
      const blueDotIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
        scale: 10,
      };

      // Create the marker using AdvancedMarkerElement with a custom HTML element
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
  };

  // Function to recalibrate user location to new coordinates
  const recalibrateUserLocation = async (newLocation: MapLocation, recenterMap: boolean = true, zoomLevel?: number) => {
    try {
      setUserLocation(newLocation);
      setCurrentLocation(newLocation);

      if (mapInstanceRef.current) {
        // Update existing marker position or create new one
        if (userMarkerRef.current) {
          // Update existing marker position
          userMarkerRef.current.position = newLocation;
        } else {
          // Create new marker if it doesn't exist
          userMarkerRef.current = await createUserLocationMarker(mapInstanceRef.current, newLocation);
        }

        // Optionally recenter the map to the new location
        if (recenterMap) {
          mapInstanceRef.current.setCenter(newLocation);
          if (zoomLevel) {
            mapInstanceRef.current.setZoom(zoomLevel);
          }
        }

        console.log('✅ User location recalibrated to:', newLocation);
      }
    } catch (error) {
      console.error('Failed to recalibrate user location:', error);
      setLocationError('Failed to update location');
    }
  };

  useEffect(() => {
    if (navigator.geolocation && !isMapLoading) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setCurrentLocation(location);

          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(location);
            mapInstanceRef.current.setZoom(15);

            if (userMarkerRef.current) {
              userMarkerRef.current.map = null;
            }

            try {
              userMarkerRef.current = await createUserLocationMarker(mapInstanceRef.current, location);
            } catch (error) {
              console.error('Failed to create user marker:', error);
            }
          }
        },
        (error) => {
          setLocationError('Unable to get your location. Please enable location services.');
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [isMapLoading, setCurrentLocation]);

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setIsProcessing(true);
    setLocationError('');

    try {
      const response = await hybridRouter.routeQuery(
        searchQuery,
        destination,
        currentLocation,
        locationConfirmed
      );

      // Handle map actions from AI
      if (response.mapActions && response.mapActions.length > 0) {
        for (const action of response.mapActions) {
          await handleMapAction(action);
        }
      }

      // Show AI response
      if (response.message) {
        setLocationError(response.message);
      }
    } catch (error) {
      console.error('AI search error:', error);
      setLocationError('Failed to process your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMapAction = async (action: any) => {
    if (!mapInstanceRef.current) return;

    switch (action.type) {
      case 'search':
        if (action.data.query) {
          await performSearch(action.data.query);
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
        if (action.data.origin && action.data.destination) {
          await showDirections(action.data.origin, action.data.destination, action.data.travelMode);
        }
        break;
    }
  };

  const showDirections = async (
    origin: MapLocation,
    destination: MapLocation,
    travelMode: string = 'DRIVE'
  ) => {
    if (!mapInstanceRef.current) return;

    try {
      setIsProcessing(true);

      // Clear existing directions polyline
      if (directionsPolylineRef.current) {
        directionsPolylineRef.current.setMap(null);
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];

      // Call Routes API
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

      const route = response.routes[0];

      // Decode and display the polyline
      if (route.polyline.encodedPolyline) {
        const path = decodePolyline(route.polyline.encodedPolyline);
        
        directionsPolylineRef.current = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#4F46E5',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map: mapInstanceRef.current
        });

        // Fit map to route bounds
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        mapInstanceRef.current.fitBounds(bounds);
      }

      // Add markers for origin and destination
      const originMarker = await createMarker(mapInstanceRef.current, origin, 'Origin');
      const destMarker = await createMarker(mapInstanceRef.current, destination, 'Destination');
      
      markersRef.current.push(originMarker, destMarker);

      // Show route info
      const distance = route.localizedValues?.distance?.text || `${(route.distanceMeters / 1000).toFixed(1)} km`;
      const duration = route.localizedValues?.duration?.text || route.duration;
      
      setLocationError(`Route found: ${distance}, ${duration}`);
    } catch (error) {
      console.error('Error showing directions:', error);
      setLocationError('Failed to get directions. Please try again.');
    } finally {
      setIsProcessing(false);
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

        markersRef.current.forEach(marker => marker.map = null);
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

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    await performSearch(searchQuery);
  };

  const handleNearbySearch = async (type: string) => {
    if (!mapInstanceRef.current || !userLocation) {
      setLocationError('Please enable location services to search nearby places.');
      return;
    }

    setIsProcessing(true);

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];

      // Use new Places API
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
        console.log(`Found ${response.places.length} places`);

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

  return (
    <div className="space-y-6">
      <div className="neuro-element p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neuro-text">Explore Map</h2>
          {isProcessing && (
            <div className="flex items-center gap-2 text-neuro-accent">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for places..."
            className="flex-1 neuro-input px-4 py-3 text-neuro-text placeholder-neuro-textLight"
            disabled={isProcessing}
          />
          <button
            onClick={handleSearch}
            className="neuro-button px-6 py-3 bg-gradient-to-br from-neuro-accent to-neuro-accentLight"
            aria-label="Search"
            disabled={isProcessing}
          >
            <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        <button
          onClick={handleAISearch}
          className="w-full neuro-button p-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white font-medium flex items-center justify-center gap-2 mb-6"
          disabled={isProcessing}
        >
          <Bot className="w-5 h-5" strokeWidth={2.5} />
          Ask AI to Search
        </button>

        {locationError && (
          <div className={`neuro-element-sm p-4 mb-6 ${
            locationError.includes('Failed') || locationError.includes('Unable') 
              ? 'bg-red-50' 
              : 'bg-blue-50'
          }`}>
            <p className={`text-sm ${
              locationError.includes('Failed') || locationError.includes('Unable')
                ? 'text-red-600'
                : 'text-blue-600'
            }`}>
              {locationError}
            </p>
          </div>
        )}

        {userLocation && (
          <div className="neuro-element-sm p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Navigation className="w-5 h-5 text-neuro-accent" strokeWidth={2.5} />
              <div className="flex-1">
                <p className="text-sm text-neuro-textLight">Your Location</p>
                <p className="text-sm font-semibold text-neuro-text">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            </div>
            
            {/* Quick location presets */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => recalibrateUserLocation({ lat: 40.7128, lng: -74.0060 }, true, 13)}
                className="text-xs neuro-button px-3 py-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                title="Recalibrate to New York"
              >
                📍 NYC
              </button>
              <button
                onClick={() => recalibrateUserLocation({ lat: 51.5074, lng: -0.1278 }, true, 13)}
                className="text-xs neuro-button px-3 py-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                title="Recalibrate to London"
              >
                📍 London
              </button>
              <button
                onClick={() => recalibrateUserLocation({ lat: 35.6762, lng: 139.6503 }, true, 13)}
                className="text-xs neuro-button px-3 py-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                title="Recalibrate to Tokyo"
              >
                📍 Tokyo
              </button>
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        recalibrateUserLocation(
                          { lat: position.coords.latitude, lng: position.coords.longitude },
                          true,
                          15
                        );
                      },
                      (error) => {
                        console.error('Geolocation error:', error);
                        setLocationError('Unable to get current GPS location');
                      }
                    );
                  }
                }}
                className="text-xs neuro-button px-3 py-1.5 bg-gradient-to-br from-green-500 to-green-600 text-white"
                title="Reset to current GPS location"
              >
                🎯 GPS
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="neuro-element p-6 relative">
        <div 
          ref={mapRef} 
          className="w-full h-[500px] rounded-2xl overflow-hidden"
          style={{ minHeight: '500px' }}
        />
        
        {/* Loading Overlay */}
        {isMapLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-neuro-accent/10 to-neuro-accentLight/10 rounded-2xl flex items-center justify-center m-6">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-neuro-accent mx-auto mb-4 animate-spin" strokeWidth={1.5} />
              <p className="text-neuro-textLight font-medium">Loading Google Maps...</p>
              <p className="text-sm text-neuro-textLight mt-2">Initializing interactive map</p>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center p-6 m-6">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-red-500 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-red-600 font-semibold mb-2">Map Loading Error</p>
              <p className="text-sm text-red-500">{mapError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="neuro-element p-6">
          <h3 className="text-lg font-semibold text-neuro-text mb-4">Nearby Places</h3>
          <div className="space-y-3">
            {['restaurant', 'lodging', 'tourist_attraction', 'shopping_mall'].map((type, index) => (
              <button
                key={type}
                onClick={() => handleNearbySearch(type)}
                className="w-full neuro-button p-3 text-left text-neuro-text hover:scale-105 transition-transform"
                disabled={isProcessing}
              >
                {['Restaurants', 'Hotels', 'Attractions', 'Shopping'][index]}
              </button>
            ))}
          </div>
        </div>

        <div className="neuro-element p-6">
          <h3 className="text-lg font-semibold text-neuro-text mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                if (userLocation && mapInstanceRef.current) {
                  mapInstanceRef.current.setCenter(userLocation);
                  mapInstanceRef.current.setZoom(15);
                }
              }}
              className="w-full neuro-button p-3 text-left text-neuro-text hover:scale-105 transition-transform"
              disabled={isProcessing}
            >
              Center on My Location
            </button>
            <button
              onClick={() => {
                markersRef.current.forEach(marker => marker.map = null);
                markersRef.current = [];
                if (directionsPolylineRef.current) {
                  directionsPolylineRef.current.setMap(null);
                }
              }}
              className="w-full neuro-button p-3 text-left text-neuro-text hover:scale-105 transition-transform"
              disabled={isProcessing}
            >
              Clear Markers & Directions
            </button>
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setMapTypeId(
                    mapInstanceRef.current.getMapTypeId() === 'roadmap' ? 'satellite' : 'roadmap'
                  );
                }
              }}
              className="w-full neuro-button p-3 text-left text-neuro-text hover:scale-105 transition-transform"
              disabled={isProcessing}
            >
              Toggle Map Type
            </button>
            <button
              onClick={async () => {
                if (userLocation) {
                  // Example: Show directions to a nearby point (slightly offset from current location)
                  const destLocation = {
                    lat: userLocation.lat + 0.01,
                    lng: userLocation.lng + 0.01
                  };
                  await showDirections(userLocation, destLocation);
                } else {
                  setLocationError('Please enable location services to get directions.');
                }
              }}
              className="w-full neuro-button p-3 text-left text-neuro-text hover:scale-105 transition-transform"
              disabled={isProcessing || !userLocation}
            >
              Get Directions (Routes API)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
