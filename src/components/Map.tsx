import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { initializeMap, getCurrentLocation } from '../services/maps';
import { reverseGeocode } from '../services/geocoding';
import { useStore } from '../store/useStore';

export const Map: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { 
    currentLocation, 
    setCurrentLocation, 
    setMapInstance,
    currentLocationName,
    setCurrentLocationName
  } = useStore();

  useEffect(() => {
    const setupMap = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Getting current location...');
        const location = await getCurrentLocation();
        console.log('Location obtained:', location);
        
        setCurrentLocation(location);

        // Get location name via reverse geocoding
        console.log('Reverse geocoding location...');
        const locationName = await reverseGeocode(location.lat, location.lng);
        if (locationName) {
          console.log('Location name:', locationName.formattedAddress);
          setCurrentLocationName(locationName.formattedAddress);
        }

        if (mapRef.current) {
          console.log('Initializing map...');
          const map = await initializeMap(mapRef.current, location);
          console.log('Map initialized successfully');
          
          if (map) {
            setMapInstance(map);
          }
        }
      } catch (err) {
        console.error('Map setup error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load map';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    setupMap();
  }, [setCurrentLocation, setMapInstance, setCurrentLocationName]);

  const handleRecenter = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      // Update location name
      const locationName = await reverseGeocode(location.lat, location.lng);
      if (locationName) {
        setCurrentLocationName(locationName.formattedAddress);
      }

      if (mapRef.current) {
        const map = await initializeMap(mapRef.current, location);
        if (map) {
          setMapInstance(map);
        }
      }
    } catch (err) {
      console.error('Recenter error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-neuro-ai-card rounded-3xl p-6 shadow-neuro-ai">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neuro-ai-text flex items-center gap-2">
            <MapPin className="w-6 h-6 text-neuro-accent" strokeWidth={2.5} />
            Interactive Map
          </h2>
          <button
            onClick={handleRecenter}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-neuro-ai-sm hover:shadow-neuro-hover active:shadow-neuro-active bg-gradient-to-br from-neuro-accent to-neuro-accentLight text-white font-semibold transition-all disabled:opacity-50"
          >
            <Navigation className="w-4 h-4" strokeWidth={2.5} />
            Recenter
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-2xl shadow-neuro-ai-sm bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Location Error</h3>
                <p className="text-sm text-red-700">{error}</p>
                <p className="text-xs text-red-600 mt-2">
                  Please enable location permissions in your browser settings and refresh the page.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentLocation && currentLocationName && (
          <div className="mb-4 p-4 rounded-2xl shadow-neuro-ai-sm bg-gradient-to-br from-neuro-accent/10 to-neuro-accentLight/10 border border-neuro-accent/20">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-neuro-accent" strokeWidth={2.5} />
              <p className="text-sm font-medium text-neuro-ai-text">
                You're {currentLocationName}
              </p>
            </div>
          </div>
        )}

        <div
          ref={mapRef}
          className="w-full rounded-2xl shadow-neuro-inset overflow-hidden"
          style={{ height: '500px' }}
        >
          {loading && (
            <div className="w-full h-full flex items-center justify-center bg-neuro-ai-bg">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neuro-accent border-t-transparent mb-4"></div>
                <p className="text-neuro-ai-textLight">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {currentLocation && (
          <div className="mt-4 p-4 rounded-2xl shadow-neuro-ai-sm bg-neuro-ai-bg">
            <p className="text-xs text-neuro-ai-textLight">
              Coordinates: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
