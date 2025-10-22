/**
 * Location Service
 * Handles automatic location tracking using browser Geolocation API
 * and Google Maps Geocoding for reverse geocoding
 */

import { reverseGeocode, type LocationName } from './geocoding';

export interface UserLocation {
  name: string;
  lat: number;
  lng: number;
  address: string; // FIXED: Made required
  accuracy?: number;
  timestamp: number;
}

class LocationService {
  private currentLocation: UserLocation | null = null;
  private watchId: number | null = null;
  private updateCallbacks: ((location: UserLocation) => void)[] = [];
  private isTracking: boolean = false;

  /**
   * Start tracking user location
   */
  startTracking(updateInterval: number = 30000): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      this.isTracking = true;

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = await this.processPosition(position);
          this.currentLocation = location;
          resolve(location);
          this.notifyCallbacks(location);

          // Start watching position with specified interval
          this.watchId = navigator.geolocation.watchPosition(
            async (pos) => {
              const loc = await this.processPosition(pos);
              this.currentLocation = loc;
              this.notifyCallbacks(loc);
            },
            (error) => {
              console.error('Location tracking error:', error);
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: updateInterval
            }
          );
        },
        (error) => {
          this.isTracking = false;
          reject(this.handleLocationError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Stop tracking user location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  /**
   * Get current location (one-time request)
   */
  async getCurrentLocation(): Promise<UserLocation> {
    if (this.currentLocation && Date.now() - this.currentLocation.timestamp < 60000) {
      // Return cached location if less than 1 minute old
      return this.currentLocation;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = await this.processPosition(position);
          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          reject(this.handleLocationError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Accept 1-minute-old cached position
        }
      );
    });
  }

  /**
   * Get the last known location (may be stale)
   */
  getLastKnownLocation(): UserLocation | null {
    return this.currentLocation;
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: (location: UserLocation) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Process geolocation position and get human-readable name
   */
  private async processPosition(position: GeolocationPosition): Promise<UserLocation> {
    const { latitude, longitude, accuracy } = position.coords;

    // Try to get human-readable location name
    let locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    try {
      const geocodeResult = await reverseGeocode(latitude, longitude);
      if (geocodeResult) {
        // Prefer locality > neighborhood > formatted address
        locationName = geocodeResult.locality || 
                      geocodeResult.neighborhood || 
                      geocodeResult.formattedAddress ||
                      locationName;
        
        address = geocodeResult.formattedAddress || address;
      }
    } catch (error) {
      console.warn('Failed to reverse geocode location:', error);
      // Continue with coordinates as fallback
    }

    return {
      name: locationName,
      lat: latitude,
      lng: longitude,
      address,
      accuracy,
      timestamp: Date.now()
    };
  }

  /**
   * Notify all subscribers of location update
   */
  private notifyCallbacks(location: UserLocation): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  /**
   * Handle geolocation errors
   */
  private handleLocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Location permission denied by user');
      case error.POSITION_UNAVAILABLE:
        return new Error('Location information unavailable');
      case error.TIMEOUT:
        return new Error('Location request timed out');
      default:
        return new Error('An unknown error occurred getting location');
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();
