import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle, Compass, Layers, ZoomIn, ZoomOut, Maximize2, Sparkles, TrendingUp, Target, Globe } from 'lucide-react';
import { initializeMap, getCurrentLocation } from '../services/maps';
import { reverseGeocode } from '../services/geocoding';
import { useStore } from '../store/useStore';

export const Map: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapZoom, setMapZoom] = useState(15);
  const { 
    currentLocation, 
    setCurrentLocation, 
    setMapInstance,
    currentLocationName,
    setCurrentLocationName,
    mapInstance
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
        setCurrentLocationName(location.address);

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
      setCurrentLocationName(location.address);

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

  const handleZoomIn = () => {
    if (mapInstance) {
      const currentZoom = mapInstance.getZoom() || 15;
      mapInstance.setZoom(currentZoom + 1);
      setMapZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      const currentZoom = mapInstance.getZoom() || 15;
      mapInstance.setZoom(currentZoom - 1);
      setMapZoom(currentZoom - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 p-8 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl"></div>
                <div className="relative p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                  <Globe className="w-10 h-10 text-white" strokeWidth={2} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Interactive Map</h1>
                <p className="text-blue-100 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI-powered exploration and navigation
                </p>
              </div>
            </div>
            <button
              onClick={handleRecenter}
              disabled={loading}
              className="group relative px-6 py-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 text-white font-semibold shadow-lg hover:bg-white/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex items-center gap-2">
                <Navigation className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} strokeWidth={2.5} />
                <span>{loading ? 'Locating...' : 'Recenter Map'}</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Error Alert - Enhanced */}
      {error && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-50 via-orange-50 to-red-50 p-6 shadow-xl border-2 border-red-200">
          <div className="relative z-10 flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-lg"></div>
              <div className="relative p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
                <AlertCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-xl mb-2 flex items-center gap-2">
                Location Access Required
              </h3>
              <p className="text-red-700 mb-4 leading-relaxed">{error}</p>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-red-200">
                <p className="text-sm text-red-600 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    <strong>Quick Fix:</strong> Enable location permissions in your browser settings and refresh the page. 
                    This allows us to show you relevant places and provide accurate directions.
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* Current Location Card - Enhanced */}
      {currentLocation && currentLocationName && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-xl border-2 border-emerald-200">
          <div className="relative z-10 flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-lg animate-pulse-slow"></div>
              <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                <Target className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-xl mb-2 flex items-center gap-2">
                <span>📍</span>
                Your Current Location
              </h3>
              <p className="text-emerald-800 font-semibold text-lg mb-3">{currentLocationName}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">Latitude</p>
                  <p className="text-sm text-emerald-900 font-mono">{currentLocation.lat.toFixed(6)}°</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">Longitude</p>
                  <p className="text-sm text-emerald-900 font-mono">{currentLocation.lng.toFixed(6)}°</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* Map Container - Enhanced */}
      <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Enhanced Map Controls Overlay */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-2 space-y-2">
            <button
              onClick={handleZoomIn}
              className="group w-full p-3 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl shadow-md hover:shadow-lg transition-all border border-blue-200"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5 text-blue-600 mx-auto group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            </button>
            <button
              onClick={handleZoomOut}
              className="group w-full p-3 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl shadow-md hover:shadow-lg transition-all border border-blue-200"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5 text-blue-600 mx-auto group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            </button>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <button
              className="group w-full p-3 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl shadow-md hover:shadow-lg transition-all border border-purple-200"
              aria-label="Layers"
            >
              <Layers className="w-5 h-5 text-purple-600 mx-auto group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Enhanced Zoom Level Indicator */}
        <div className="absolute bottom-6 left-6 z-10">
          <div className="px-5 py-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
              <div>
                <p className="text-xs text-gray-500 font-semibold">Zoom Level</p>
                <p className="text-lg font-bold text-gray-900">{mapZoom}x</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Element */}
        <div
          ref={mapRef}
          className="w-full"
          style={{ height: '600px' }}
        >
          {loading && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative inline-block animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <h3 className="text-gray-900 font-bold text-2xl mb-2">Loading Map</h3>
                <p className="text-gray-600 text-sm">Initializing your location...</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100 hover:border-green-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                <div className="relative p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 text-lg">Find Places</h4>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Ask AI to discover restaurants, attractions, hotels, and hidden gems nearby
            </p>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all"></div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100 hover:border-purple-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                <div className="relative p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Navigation className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 text-lg">Get Directions</h4>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Navigate to any destination with turn-by-turn guidance and transit options
            </p>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Compass className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 text-lg">Explore Area</h4>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Discover hidden gems, local favorites, and popular attractions around you
            </p>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
        </div>
      </div>

      {/* Enhanced Pro Tip */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 p-8 shadow-2xl">
        <div className="relative z-10 flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl animate-pulse-slow"></div>
            <div className="relative p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
              <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
              💡 Pro Tips for Map Exploration
            </h3>
            <div className="space-y-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-white leading-relaxed">
                  <strong className="text-white/90">🗣️ Natural Language:</strong> Ask questions like "Find Italian restaurants nearby" or "Show me the route to the Eiffel Tower" for instant results
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-white leading-relaxed">
                  <strong className="text-white/90">🎯 Smart Filters:</strong> Specify preferences like "cheap hotels" or "highly rated cafes" to get personalized recommendations
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-white leading-relaxed">
                  <strong className="text-white/90">🚇 Transit Ready:</strong> Get detailed public transportation directions with real-time schedules and fare information
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};
