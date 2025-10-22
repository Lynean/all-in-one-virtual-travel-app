import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Loader2, Globe, Coffee, Hotel, ShoppingBag, Camera, Search, Locate } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useMapMarkers } from '../hooks/useMapMarkers';
import { useDirections } from '../hooks/useDirections';
import { useGeocoding } from '../hooks/useGeocoding';
import { useUserMarker } from '../hooks/useUserMarker';
import { useSearch } from '../hooks/useSearch';
import { useMapClickHandler } from '../hooks/useMapClickHandler';
import { MapLocation } from '../utils/googleMaps';
import { reverseGeocode } from '../services/geocoding';

export const MapView: React.FC = () => {
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { setCurrentLocation, setMapInstance, originLocation, setOriginLocation } = useStore();
  
  const { mapRef, mapInstance, isLoading: isMapLoading, error: mapError } = useGoogleMaps();
  
  const handleSetOrigin = (location: MapLocation, address: string) => {
    console.log('🎯 handleSetOrigin called:', { location, address });
    setOriginLocation({ lat: location.lat, lng: location.lng, address });
    setLocationError(`✅ Origin set to: ${address}`);
  };

  const { addMarker, clearMarkers, showInfoWindowAtLocation, updateOriginMarker } = useMapMarkers({ 
    mapInstance, 
    userLocation,
    originLocation,
    onSetOrigin: handleSetOrigin
  });
  
  const { transitInstructions, showDirections, isProcessing: isDirectionsProcessing } = useDirections({ mapInstance });
  const { geocodeAddress, parseCoordinateString } = useGeocoding();
  const { createUserMarker, updateUserMarker } = useUserMarker(mapInstance);

  const { performTextSearch, performNearbySearch } = useSearch({
    mapInstance,
    userLocation,
    onMarkersCreated: (count, query) => setLocationError(`✅ Found ${count} places for "${query}".`),
    onError: setLocationError,
    createMarker: async (location, label, infoContent) => {
      await addMarker(location, label, infoContent);
    }
  });

  useMapClickHandler({
    mapInstance,
    onMapClick: async (location, address) => {
      const destinationAddress = address;
      const originAddress = originLocation?.address || (userLocation ? await getAddressFromGeocoding(userLocation) : null);

      const content = createMapClickInfoContent(location, destinationAddress, originAddress, (loc, addr) => {
        setOriginLocation({ lat: loc.lat, lng: loc.lng, address: addr });
        setLocationError(`✅ Origin set to: ${addr}`);
      });
      await showInfoWindowAtLocation(location, content);
    }
  });

  useEffect(() => {
    if (mapInstance) {
      setMapInstance(mapInstance);
    }
  }, [mapInstance, setMapInstance]);

  useEffect(() => {
    if (!navigator.geolocation || isMapLoading || !mapInstance) return;

    let isMounted = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!isMounted) return;

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setUserLocation(location);
        
        const address = await getAddressFromGeocoding(location);
        setCurrentLocation({ ...location, address });
        
        mapInstance.setCenter(location);
        mapInstance.setZoom(15);

        try {
          await createUserMarker(mapInstance, location);
        } catch (error) {
          console.error('Failed to create user marker:', error);
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
  }, [isMapLoading, mapInstance, setCurrentLocation, createUserMarker]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstance) return;

    setIsSearching(true);
    clearMarkers();
    
    try {
      await performTextSearch(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecenterLocation = async () => {
    if (!navigator.geolocation || !mapInstance) return;

    setIsProcessing(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setUserLocation(location);
        
        const address = await getAddressFromGeocoding(location);
        setCurrentLocation({ ...location, address });
        
        updateUserMarker(location, true, 15);
        setIsProcessing(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Unable to get your location.');
        setIsProcessing(false);
      }
    );
  };

  const handleNearbySearch = async (type: string) => {
    if (!mapInstance || !userLocation) {
      setLocationError('Please enable location services to search nearby places.');
      return;
    }

    setIsProcessing(true);
    clearMarkers();

    try {
      await performNearbySearch(type, userLocation, 2000);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search Card - Mobile Optimized */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl sm:rounded-2xl shadow-lg">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Interactive Map</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Search anywhere • Click map for info</p>
            </div>
          </div>
          {(isProcessing || isDirectionsProcessing) && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-50 rounded-lg sm:rounded-xl">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" strokeWidth={2.5} />
              <span className="text-xs sm:text-sm font-medium text-blue-600 hidden sm:inline">Processing...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-3 sm:mb-4">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anywhere..."
              className="w-full pl-10 sm:pl-12 pr-20 sm:pr-24 py-3 sm:py-4 bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm sm:text-base text-gray-900 placeholder-gray-400"
              disabled={isSearching || !mapInstance}
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim() || !mapInstance}
              className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSearching ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {(locationError || mapError) && (
          <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
            (locationError || mapError).includes('Failed') || (locationError || mapError).includes('Unable') 
              ? 'bg-red-50 border border-red-200' 
              : (locationError || mapError).includes('✅')
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-xs sm:text-sm font-medium ${
              (locationError || mapError).includes('Failed') || (locationError || mapError).includes('Unable')
                ? 'text-red-700'
                : (locationError || mapError).includes('✅')
                ? 'text-green-700'
                : 'text-blue-700'
            }`}>
              {locationError || mapError}
            </p>
          </div>
        )}
      </div>

      {/* User Location Card - Mobile Optimized */}
      {userLocation && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl shadow-lg">
                <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Your Location</h3>
                <p className="text-xs sm:text-sm text-gray-500">Current position</p>
              </div>
            </div>
            <button
              onClick={handleRecenterLocation}
              disabled={isProcessing}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Locate className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Recenter</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Latitude</p>
              <p className="text-xs sm:text-sm font-mono text-gray-900">{userLocation.lat.toFixed(6)}°</p>
            </div>
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Longitude</p>
              <p className="text-xs sm:text-sm font-mono text-gray-900">{userLocation.lng.toFixed(6)}°</p>
            </div>
          </div>
        </div>
      )}

      {/* Origin Location Card - Mobile Optimized */}
      {originLocation && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Origin Location</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{originLocation.address}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setOriginLocation(null);
                setLocationError('✅ Origin location cleared');
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-red-600 transition-all shadow-lg flex-shrink-0 ml-2"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Latitude</p>
              <p className="text-xs sm:text-sm font-mono text-gray-900">{originLocation.lat.toFixed(6)}°</p>
            </div>
            <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Longitude</p>
              <p className="text-xs sm:text-sm font-mono text-gray-900">{originLocation.lng.toFixed(6)}°</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Container - Mobile Optimized with Single-Finger Gestures */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {isMapLoading && (
          <div className="w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50" style={{ height: '400px' }}>
            <div className="text-center">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-gray-900 font-bold text-lg sm:text-xl mb-1 sm:mb-2">Loading Map</h3>
              <p className="text-gray-600 text-xs sm:text-sm">Initializing your location...</p>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className="w-full touch-pan-y touch-pinch-zoom"
          style={{ 
            height: window.innerWidth < 640 ? '400px' : '600px',
            display: isMapLoading ? 'none' : 'block'
          }}
        />
      </div>

      {/* Transit Instructions - Mobile Optimized */}
      {transitInstructions && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl shadow-lg">
              <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Transit Directions</h3>
              <p className="text-xs sm:text-sm text-gray-500">{transitInstructions.totalDistance} • {transitInstructions.totalDuration}</p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {transitInstructions.steps.map((step: any, index: number) => (
              <div key={index} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className={`p-1.5 sm:p-2 ${step.type === 'transit' ? 'bg-blue-500' : 'bg-gray-400'} rounded-lg flex-shrink-0`}>
                  {step.type === 'transit' ? (
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    {step.type === 'transit' ? step.transitDetails.transitLine?.name || 'Transit' : 'Walk'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    {step.type === 'transit' 
                      ? `${step.transitDetails.stopDetails?.departureStop?.name} → ${step.transitDetails.stopDetails?.arrivalStop?.name}`
                      : step.instruction
                    }
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{step.distance} • {step.duration}</p>
                </div>
              </div>
            ))}
          </div>

          {transitInstructions.fare && (
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-green-50 rounded-lg sm:rounded-xl border border-green-200">
              <p className="text-xs sm:text-sm font-semibold text-green-900">
                Estimated Fare: {transitInstructions.fare.text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Explore Nearby - Mobile Optimized */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg sm:rounded-xl shadow-lg">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Explore Nearby</h3>
            <p className="text-xs sm:text-sm text-gray-500">Quick access to popular places</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {nearbyPlaces.map((place) => {
            const Icon = place.icon;
            return (
              <button
                key={place.type}
                onClick={() => handleNearbySearch(place.type)}
                disabled={!userLocation || isProcessing}
                className={`group relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${place.color} text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-6 h-6 sm:w-8 sm:h-8 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                <p className="text-xs sm:text-sm font-semibold">{place.label}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

async function getAddressFromGeocoding(location: MapLocation): Promise<string> {
  try {
    const result = await reverseGeocode(location.lat, location.lng);
    if (result?.formattedAddress) {
      return result.formattedAddress;
    }
  } catch (error) {
    console.error('Geocoding API error:', error);
  }
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
}

function createMapClickInfoContent(
  location: MapLocation,
  destinationAddress: string,
  originAddress: string | null,
  onSetOrigin: (location: MapLocation, address: string) => void
): string {
  const baseContent = `
    <div style="padding: 12px; max-width: 250px;">
      <strong style="font-size: 14px; color: #111827; display: block; margin-bottom: 8px;">📍 Location</strong>
      <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">${destinationAddress}</p>
      <div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 8px;">
        <p style="font-size: 11px; color: #4b5563; margin: 2px 0;">
          <strong>Lat:</strong> ${location.lat.toFixed(6)}°
        </p>
        <p style="font-size: 11px; color: #4b5563; margin: 2px 0;">
          <strong>Lng:</strong> ${location.lng.toFixed(6)}°
        </p>
      </div>
  `;

  const setOriginButton = `
    <div style="margin-top: 12px;">
      <button 
        onclick="window.setOriginLocation(${location.lat}, ${location.lng}, '${destinationAddress.replace(/'/g, "\\'")}')"
        style="display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 10px 16px; background: #8B5CF6; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3); transition: all 0.2s ease; margin-bottom: 8px;"
        onmouseover="this.style.background='#7C3AED'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)'"
        onmouseout="this.style.background='#8B5CF6'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(139, 92, 246, 0.3)'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        Set as Origin
      </button>
    </div>
  `;

  (window as any).setOriginLocation = (lat: number, lng: number, address: string) => {
    onSetOrigin({ lat, lng }, address);
  };

  if (!originAddress) {
    return baseContent + setOriginButton + '</div>';
  }

  const formatAddress = (addr: string) => addr.replace(/\s+/g, '+');
  
  const formattedOrigin = formatAddress(originAddress);
  const formattedDestination = formatAddress(destinationAddress);
  const coordinates = `@${location.lat},${location.lng}`;

  const baseUrl = `https://www.google.com/maps/dir/${formattedOrigin}/${formattedDestination}/${coordinates}`;

  const googleMapsIcon = `
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
      <path d="M24 4C17.37 4 12 9.37 12 16c0 10.5 12 24 12 24s12-13.5 12-24c0-6.63-5.37-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#EA4335"/>
      <circle cx="24" cy="16" r="4" fill="#FFFFFF"/>
      <path d="M24 12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#4285F4"/>
    </svg>
  `;

  const navigationButton = `
    <div style="margin-top: 0;">
      <a 
        href="${baseUrl}"
        target="_blank"
        rel="noopener noreferrer"
        style="display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px 20px; background: #4285F4; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3); text-decoration: none; transition: all 0.2s ease;"
        onmouseover="this.style.background='#3367D6'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(66, 133, 244, 0.4)'"
        onmouseout="this.style.background='#4285F4'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(66, 133, 244, 0.3)'"
      >
        ${googleMapsIcon}
        Get Directions
      </a>
    </div>
  `;

  return baseContent + setOriginButton + navigationButton + '</div>';
}
