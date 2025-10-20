/**
 * useLocation Hook
 * React hook for accessing and tracking user location
 */

import { useState, useEffect, useCallback } from 'react';
import { locationService, type UserLocation } from '../services/locationService';

export interface UseLocationOptions {
  enableTracking?: boolean;  // Start tracking automatically
  updateInterval?: number;    // Update interval in ms (default: 30s)
  onError?: (error: Error) => void;  // Error callback
}

export interface UseLocationReturn {
  location: UserLocation | null;
  isLoading: boolean;
  error: Error | null;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  refreshLocation: () => Promise<void>;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableTracking = false,
    updateInterval = 30000,
    onError
  } = options;

  const [location, setLocation] = useState<UserLocation | null>(
    locationService.getLastKnownLocation()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsLoading(false);
    if (onError) {
      onError(err);
    }
  }, [onError]);

  const startTracking = useCallback(async () => {
    if (isTracking) return;

    setIsLoading(true);
    setError(null);

    try {
      const initialLocation = await locationService.startTracking(updateInterval);
      setLocation(initialLocation);
      setIsTracking(true);
      setIsLoading(false);
    } catch (err) {
      handleError(err as Error);
    }
  }, [isTracking, updateInterval, handleError]);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
  }, []);

  const refreshLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newLocation = await locationService.getCurrentLocation();
      setLocation(newLocation);
      setIsLoading(false);
    } catch (err) {
      handleError(err as Error);
    }
  }, [handleError]);

  // Subscribe to location updates
  useEffect(() => {
    const unsubscribe = locationService.onLocationUpdate((newLocation) => {
      setLocation(newLocation);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (enableTracking && !isTracking) {
      startTracking();
    }

    return () => {
      if (enableTracking) {
        stopTracking();
      }
    };
  }, [enableTracking, isTracking, startTracking, stopTracking]);

  return {
    location,
    isLoading,
    error,
    isTracking,
    startTracking,
    stopTracking,
    refreshLocation
  };
}
