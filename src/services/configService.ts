/**
 * Configuration Service
 * Fetches Google Maps API keys directly from Redis (public endpoint)
 */

interface GoogleMapsConfig {
  apiKey: string;
  mapId: string;
  proxyUrl: string;
  accessToken: string;
}

class ConfigService {
  private cache: GoogleMapsConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 300000; // 5 minutes in milliseconds
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app';

  /**
   * Fetch Google Maps configuration from public endpoint
   */
  private async fetchGoogleMapsConfig(): Promise<GoogleMapsConfig> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/public/google-maps-config`);

      if (!response.ok) {
        throw new Error(`Failed to fetch Google Maps config: ${response.status}`);
      }

      const data = await response.json();
      return {
        apiKey: data.apiKey,
        mapId: data.mapId,
        proxyUrl: import.meta.env.VITE_PROXY_SERVER_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app/api/proxy',
        accessToken: import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN || 'undefined'
      };
    } catch (error) {
      console.error('Error fetching Google Maps config from backend:', error);
      
      // Fallback to environment variables
      const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const envMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
      
      if (envApiKey && envMapId) {
        console.log('Using environment variables for Google Maps config');
        return {
          apiKey: envApiKey,
          mapId: envMapId,
          proxyUrl: import.meta.env.VITE_PROXY_SERVER_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app/api/proxy',
          accessToken: import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN || 'undefined'
        };
      }
      
      throw new Error('Google Maps configuration not available');
    }
  }

  /**
   * Get Google Maps configuration with caching
   */
  async getGoogleMapsConfig(): Promise<GoogleMapsConfig> {
    // Check cache first
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cache;
    }

    // Fetch fresh config
    const config = await this.fetchGoogleMapsConfig();
    
    // Update cache
    this.cache = config;
    this.cacheTimestamp = Date.now();
    
    return config;
  }

  /**
   * Get Google Maps API Key
   */
  async getGoogleMapsApiKey(): Promise<string> {
    const config = await this.getGoogleMapsConfig();
    return config.apiKey;
  }

  /**
   * Get Google Maps Map ID
   */
  async getGoogleMapsMapId(): Promise<string> {
    const config = await this.getGoogleMapsConfig();
    return config.mapId;
  }

  /**
   * Get Supabase URL (from environment variables)
   */
  async getSupabaseUrl(): Promise<string> {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  /**
   * Get Supabase Anon Key (from environment variables)
   */
  async getSupabaseAnonKey(): Promise<string> {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const configService = new ConfigService();
