import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Search } from 'lucide-react';
import { useStore } from '../store/useStore';

export const MapView: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const { currentLocation, setCurrentLocation } = useStore();

  useEffect(() => {
    const loader = new Loader({
      apiKey: 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8',
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      if (mapRef.current) {
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
      }
    });
  }, []);

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
          <h2 className="text-2xl font-bold uppercase text-white mb-4">Interactive Map</h2>
          
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search location..."
                className="flex-1 px-4 py-3 neo-border border-r-0 bg-white text-black font-mono focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="bg-[#00F0FF] neo-border px-6 py-3 font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow-sm transition-all"
              >
                <Search className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
            <button
              onClick={handleGetLocation}
              className="bg-[#FFD700] neo-border px-6 py-3 font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow-sm transition-all flex items-center gap-2"
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
        </div>

        <div ref={mapRef} className="w-full h-[500px] neo-border border-t-0" />

        <div className="bg-[#00F0FF] p-4 neo-border border-b-0 border-l-0 border-r-0">
          <p className="font-mono text-sm font-bold uppercase">
            💡 TIP: Use search to find destinations or click "My Location" to see where you are
          </p>
        </div>
      </div>
    </div>
  );
};
