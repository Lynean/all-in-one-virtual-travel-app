import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'undefined') {
      console.warn('Google Maps API key not found in ChatAndBuild settings');
      return;
    }

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
    });

    loader.load().then(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 2,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              mapInstanceRef.current?.setCenter(pos);
              mapInstanceRef.current?.setZoom(13);

              new google.maps.Marker({
                position: pos,
                map: mapInstanceRef.current,
                title: 'Your Location',
              });
            },
            () => {
              console.log('Error: The Geolocation service failed.');
            }
          );
        }
      }
    });
  }, []);

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'undefined') {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Map View Unavailable</h3>
        <p className="text-gray-600">
          Please add your Google Maps API key to ChatAndBuild settings to enable the map view.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Get an API key from:{' '}
          <a
            href="https://developers.google.com/maps/documentation/javascript/get-api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Google Maps Platform
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div ref={mapRef} className="w-full h-96" />
    </div>
  );
}
