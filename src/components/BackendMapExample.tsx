/**
 * Example: How to use Backend Map Service
 * 
 * This shows the new architecture:
 * 1. Frontend sends search request to BACKEND
 * 2. Backend calls Google Maps API
 * 3. Backend returns processed data
 * 4. Frontend displays data on Google Maps (rendering only)
 */

import React, { useState } from 'react';
import { backendMapService, PlaceResult, RouteResult } from '../services/backendMapService';

export const BackendMapExample: React.FC = () => {
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Example 1: Search for places using backend
   * Backend calls Google Places API, frontend just displays results
   */
  const searchRestaurants = async () => {
    setLoading(true);
    try {
      // Frontend sends request to backend
      const results = await backendMapService.searchPlaces({
        query: 'restaurants',
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5000,
        included_types: ['restaurant'],
        min_rating: 4.0
      });

      // Backend returns processed data
      setPlaces(results);

      // Now frontend can render markers on map
      // (Map rendering still happens on frontend)
      console.log('Found places:', results);

    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example 2: Compute route using backend
   * Backend calls Google Routes API, frontend just displays route
   */
  const computeRoute = async () => {
    setLoading(true);
    try {
      // Frontend sends request to backend
      const result = await backendMapService.computeRoutes({
        origin: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        destination: {
          latitude: 40.758,
          longitude: -73.9855
        },
        travel_mode: 'DRIVE',
        avoid: ['tolls']
      });

      // Backend returns route data (polyline, distance, duration)
      setRoute(result);

      // Now frontend can draw polyline on map
      console.log('Route computed:', result);

    } catch (error) {
      console.error('Route computation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example 3: Search nearby places
   */
  const searchNearby = async () => {
    setLoading(true);
    try {
      const results = await backendMapService.searchNearby(
        40.7128,  // latitude
        -74.0060, // longitude
        2000,     // radius in meters
        ['cafe', 'restaurant']
      );

      setPlaces(results);
      console.log('Nearby places:', results);

    } catch (error) {
      console.error('Nearby search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Backend Map Service Example</h2>
      
      <div className="space-x-2">
        <button
          onClick={searchRestaurants}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Search Restaurants (Backend API)
        </button>

        <button
          onClick={computeRoute}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Compute Route (Backend API)
        </button>

        <button
          onClick={searchNearby}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Search Nearby (Backend API)
        </button>
      </div>

      {loading && <div>Loading from backend...</div>}

      {places.length > 0 && (
        <div>
          <h3 className="font-bold">Places from Backend:</h3>
          <ul className="list-disc pl-6">
            {places.map((place) => (
              <li key={place.id}>
                {place.name} - {place.formatted_address}
                {place.rating && ` (Rating: ${place.rating})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {route && (
        <div>
          <h3 className="font-bold">Route from Backend:</h3>
          <p>Distance: {(route.distance / 1000).toFixed(2)} km</p>
          <p>Duration: {Math.round(route.duration / 60)} minutes</p>
          <p>Travel Mode: {route.travel_mode}</p>
          <p>Polyline: {route.polyline.substring(0, 50)}...</p>
        </div>
      )}
    </div>
  );
};

/**
 * KEY POINTS:
 * 
 * 1. API KEY SECURITY:
 *    - API key is ONLY on backend (in .env)
 *    - Frontend never sees or uses the API key
 *    - Backend validates requests and rate limits
 * 
 * 2. DATA FLOW:
 *    Frontend → Backend API → Google Maps API → Backend processes → Frontend displays
 * 
 * 3. FRONTEND RESPONSIBILITY:
 *    - Send search/route requests to backend
 *    - Receive processed data from backend
 *    - Render Google Maps (map, markers, polylines)
 *    - Handle user interactions (zoom, pan, click)
 * 
 * 4. BACKEND RESPONSIBILITY:
 *    - Store and manage API key securely
 *    - Call Google Maps APIs (Places, Routes, Geocoding)
 *    - Process and format response data
 *    - Return clean data to frontend
 *    - Cache results (optional)
 *    - Rate limiting and quota management
 * 
 * 5. BENEFITS:
 *    ✅ API key completely hidden
 *    ✅ Backend can cache responses
 *    ✅ Centralized rate limiting
 *    ✅ Easier to add business logic
 *    ✅ Frontend still gets full map interactivity
 *    ✅ No static site limitations
 */
