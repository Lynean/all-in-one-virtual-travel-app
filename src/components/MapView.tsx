import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation as NavigationIcon, Search, Loader, AlertCircle } from 'lucide-react';
import { initializeMap, getCurrentLocation, searchNearbyPlaces } from '../services/maps';
import { useStore } from '../store/useStore';

export const MapView: React.FC = () => {
  const [mapElement, setMapElement] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const { currentLocation, setCurrentLocation } = useStore();
  const initializationAttempted = useRef(false);

  // Use callback ref to ensure we get the element when it mounts
  const mapRefCallback = useCallback((node: HTMLDivElement | null) => {
    console.log('Map ref callback called with node:', node ? 'Element exists' : 'null');
    if (node) {
      setMapElement(node);
    }
  }, []);

  // Use useLayoutEffect to ensure DOM is ready before initialization
  useLayoutEffect(() => {
    if (!mapElement) {
      console.log('Map element not yet available');
      return;
    }

    if (initializationAttempted.current) {
      console.log('Map initialization already attempted');
      return;
    }

    initializationAttempted.current = true;

    const setupMap = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Starting map setup with element:', mapElement);

        let location = currentLocation;
        
        if (!location) {
          console.log('Getting current location...');
          try {
            location = await getCurrentLocation();
            setCurrentLocation(location);
            console.log('Location obtained:', location);
          } catch (locationError) {
            console.error('Location error:', locationError);
            location = { lat: 40.7128, lng: -74.0060 };
            console.log('Using default location (New York):', location);
          }
        }

        console.log('Initializing map with location:', location);
        const mapInstance = await initializeMap(mapElement, location);
        
        if (!mapInstance) {
          throw new Error('Map instance is null');
        }

        console.log('Map initialized successfully');
        setMap(mapInstance);

        console.log('Searching for nearby places...');
        const places = await searchNearbyPlaces(mapInstance, location, 'hospital');
        console.log('Places found:', places.length);
        setNearbyPlaces(places.slice(0, 5));

        places.slice(0, 5).forEach((place, index) => {
          if (place.geometry?.location) {
            console.log(`Adding marker ${index + 1}:`, place.name);
            new google.maps.Marker({
              position: place.geometry.location,
              map: mapInstance,
              title: place.name,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#764ba2',
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });
          }
        });

        console.log('Map setup complete');
      } catch (err) {
        console.error('Map setup error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load map. Please check your API key and internet connection.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    setupMap();
  }, [mapElement, currentLocation, setCurrentLocation]);

  const handleGetDirections = () => {
    if (currentLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}`;
      window.open(url, '_blank');
    }
  };

  const handleSearch = async () => {
    if (!map || !currentLocation || !searchQuery.trim()) return;

    try {
      setLoading(true);
      console.log('Searching for:', searchQuery);
      const places = await searchNearbyPlaces(map, currentLocation, searchQuery);
      console.log('Search results:', places.length);
      setNearbyPlaces(places.slice(0, 5));

      // Clear existing markers (except user location)
      // Add new markers
      places.slice(0, 5).forEach((place, index) => {
        if (place.geometry?.location) {
          new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#764ba2',
              fillOpacity: 0.8,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        }
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-neuro-map-card rounded-3xl p-6 shadow-neuro-map">
        <h2 className="text-2xl font-bold text-neuro-map-text mb-6">Explore Nearby</h2>
        
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neuro-map-textLight" strokeWidth={2.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search hospitals, shelters, police..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl shadow-neuro-inset bg-neuro-map-bg text-neuro-map-text placeholder-neuro-map-textLight focus:outline-none"
            aria-label="Search locations"
          />
        </div>

        <div className="rounded-2xl shadow-neuro-inset overflow-hidden mb-6" style={{ height: '300px' }}>
          {loading ? (
            <div className="w-full h-full bg-gradient-to-br from-neuro-map-bg to-neuro-map-card flex items-center justify-center">
              <div className="text-center">
                <Loader className="w-16 h-16 text-neuro-accent mx-auto mb-4 animate-spin" strokeWidth={2} />
                <p className="text-neuro-map-textLight font-medium">Loading map...</p>
                <p className="text-xs text-neuro-map-textLight mt-2">This may take a moment</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-full bg-gradient-to-br from-neuro-map-bg to-neuro-map-card flex items-center justify-center">
              <div className="text-center px-6">
                <AlertCircle className="w-16 h-16 text-neuro-emergency mx-auto mb-4" strokeWidth={2} />
                <p className="text-neuro-map-text font-medium mb-2">Map Unavailable</p>
                <p className="text-xs text-neuro-map-textLight mb-4">{error}</p>
                <div className="text-xs text-neuro-map-textLight bg-neuro-map-bg rounded-xl p-3 text-left">
                  <p className="font-semibold mb-2">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check if VITE_GOOGLE_MAPS_API_KEY is set in .env</li>
                    <li>Verify API key is valid at Google Cloud Console</li>
                    <li>Enable Maps JavaScript API in your project</li>
                    <li>Check browser console for detailed errors</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div ref={mapRefCallback} className="w-full h-full" />
          )}
        </div>

        <button 
          onClick={handleGetDirections}
          disabled={!currentLocation}
          className="w-full rounded-2xl shadow-neuro-map-sm hover:shadow-neuro-hover active:shadow-neuro-active py-4 text-neuro-map-text font-semibold flex items-center justify-center gap-2 mb-6 transition-all disabled:opacity-50"
        >
          <NavigationIcon className="w-5 h-5" strokeWidth={2.5} />
          Get Directions
        </button>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neuro-map-textLight uppercase tracking-wide">
            {nearbyPlaces.length > 0 ? 'Nearby Emergency Services' : 'Enable Location'}
          </h3>
          {nearbyPlaces.length > 0 ? (
            nearbyPlaces.map((place, index) => (
              <div key={`${place.place_id}-${index}`} className="bg-neuro-map-bg rounded-2xl shadow-neuro-map-sm p-4 flex items-center gap-4">
                <div className="rounded-xl shadow-neuro-map-sm p-3">
                  <MapPin className="w-5 h-5 text-neuro-accent" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neuro-map-text">{place.name}</h4>
                  <p className="text-sm text-neuro-map-textLight">{place.vicinity}</p>
                </div>
                {place.rating && (
                  <span className="text-sm text-neuro-map-textLight font-medium">
                    ⭐ {place.rating}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="bg-neuro-map-bg rounded-2xl shadow-neuro-map-sm p-4 flex items-center gap-4">
              <div className="rounded-xl shadow-neuro-map-sm p-3">
                <MapPin className="w-5 h-5 text-neuro-accent" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-neuro-map-text">Enable location access</h4>
                <p className="text-sm text-neuro-map-textLight">To see nearby emergency services</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
