import React, { useEffect, useRef, useState } from 'react';
import { Loader as GoogleMapsLoader } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Search, AlertCircle, Loader } from 'lucide-react';
import { useStore } from '../store/useStore';

export const MapView: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentLocation, setCurrentLocation } = useStore();

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    // Add a small delay to ensure the component is fully mounted
    const initTimeout = setTimeout(() => {
      console.log('MapView: Starting map initialization');
      console.log('API Key present:', !!API_KEY);
      console.log('MapRef current:', !!mapRef.current);
      
      if (!API_KEY) {
        console.error('MapView: No API key found');
        setMapError('Google Maps API key not found. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
        setIsLoading(false);
        return;
      }

      if (!mapRef.current) {
        console.error('MapView: Map container not ready');
        setMapError('Map container not ready. Please try refreshing the page.');
        setIsLoading(false);
        return;
      }

      // Set a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        console.error('MapView: Loading timeout reached');
        if (isLoading) {
          setMapError('Map loading timed out. Please check your internet connection and API key permissions.');
          setIsLoading(false);
        }
      }, 10000); // 10 second timeout

      console.log('MapView: Creating Google Maps loader');
      const loader = new GoogleMapsLoader({
        apiKey: API_KEY,
        version: 'weekly',
        libraries: ['places'],
      });

      console.log('MapView: Starting loader.load()');
      loader
        .load()
        .then(() => {
          console.log('MapView: Google Maps API loaded successfully');
          clearTimeout(loadingTimeout);
          
          if (mapRef.current) {
            console.log('MapView: Creating map instance');
            const mapInstance = new google.maps.Map(mapRef.current, {
              center: { lat: 40.7128, lng: -74.006 },
              zoom: 13,
              styles: [
                {
                  featureType: 'all',
                  elementType: 'geometry',
                  stylers: [{ saturation: 100 }],
                },
              ],
            });
            setMap(mapInstance);
            setIsLoading(false);
            console.log('MapView: Map created successfully');
          } else {
            console.error('MapView: Map container ref became null after API load');
            setMapError('Map container lost during initialization');
            setIsLoading(false);
          }
        })
        .catch((error) => {
          console.error('MapView: Error loading Google Maps:', error);
          clearTimeout(loadingTimeout);
          setMapError(`Failed to load Google Maps: ${error.message || 'Unknown error'}. Please check your API key and ensure the Maps JavaScript API is enabled.`);
          setIsLoading(false);
        });

      // Cleanup timeout on unmount
      return () => {
        clearTimeout(loadingTimeout);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(initTimeout);
    };
  }, [API_KEY]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(pos);
          
          if (map) {
            map.setCenter(pos);
            map.setZoom(15);
            
            if (userMarker) {
              userMarker.setMap(null);
            }
            
            const marker = new google.maps.Marker({
              position: pos,
              map: map,
              title: 'Your Location',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#00F0FF',
                fillOpacity: 1,
                strokeColor: '#000000',
                strokeWeight: 3,
              },
            });
            setUserMarker(marker);
          }
        },
        () => {
          alert('Error: The Geolocation service failed.');
        }
      );
    } else {
      alert('Error: Your browser doesn\'t support geolocation.');
    }
  };

  const handleSearch = () => {
    if (!map || !searchQuery) return;

    const service = new google.maps.places.PlacesService(map);
    const request = {
      query: searchQuery,
      fields: ['name', 'geometry'],
    };

    service.findPlaceFromQuery(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
        const place = results[0];
        if (place.geometry && place.geometry.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(15);
          
          new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#FF005C',
              fillOpacity: 1,
              strokeColor: '#000000',
              strokeWeight: 3,
            },
          });
        }
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="bg-white neo-border neo-shadow-lg overflow-hidden">
        <div className="bg-[#FF005C] p-4 neo-border border-t-0 border-l-0 border-r-0">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold uppercase text-white flex-1">Interactive Map</h2>
            {!API_KEY && (
              <div className="bg-[#FFD700] neo-border p-2">
                <AlertCircle className="w-5 h-5" strokeWidth={3} />
              </div>
            )}
          </div>
          
          {!mapError && (
            <>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 flex">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search location..."
                    className="flex-1 px-4 py-3 neo-border border-r-0 bg-white text-black font-mono focus:outline-none"
                    disabled={!map}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!map}
                    className="bg-[#00F0FF] neo-border px-6 py-3 font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
                <button
                  onClick={handleGetLocation}
                  disabled={!map}
                  className="bg-[#FFD700] neo-border px-6 py-3 font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Navigation className="w-5 h-5" strokeWidth={3} />
                  <span className="hidden sm:inline">MY LOCATION</span>
                </button>
              </div>

              <div className="bg-white neo-border p-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" strokeWidth={3} />
                <span className="font-mono text-sm">
                  {currentLocation
                    ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                    : 'Location not set'}
                </span>
              </div>
            </>
          )}
        </div>

        {mapError ? (
          <div className="w-full h-[500px] neo-border border-t-0 bg-[#FFD700] flex items-center justify-center p-8">
            <div className="bg-white neo-border p-6 max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-8 h-8 text-[#FF005C]" strokeWidth={3} />
                <h3 className="font-bold uppercase text-lg">Map Configuration Required</h3>
              </div>
              <p className="font-mono text-sm mb-4">{mapError}</p>
              <div className="bg-[#00F0FF] neo-border p-4">
                <p className="font-mono text-xs font-bold mb-2">SETUP INSTRUCTIONS:</p>
                <ol className="font-mono text-xs space-y-1 list-decimal list-inside">
                  <li>Get a free API key from Google Cloud Console</li>
                  <li>Enable Maps JavaScript API</li>
                  <li>Add to .env file: VITE_GOOGLE_MAPS_API_KEY=your_key</li>
                  <li>Restart the dev server</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-[500px] neo-border border-t-0">
            {isLoading && (
              <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader className="w-12 h-12 animate-spin mx-auto mb-4" strokeWidth={3} />
                  <p className="font-mono font-bold uppercase">Loading Map...</p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>
        )}

        <div className="bg-[#00F0FF] p-4 neo-border border-b-0 border-l-0 border-r-0">
          <p className="font-mono text-sm font-bold uppercase">
            💡 TIP: Use search to find destinations or click "My Location" to see where you are
          </p>
        </div>
      </div>
    </div>
  );
};
