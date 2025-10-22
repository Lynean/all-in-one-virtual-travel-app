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
  private readonly CACHE_DURATION = 300000;
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app';

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
        proxyUrl: `${this.BACKEND_URL}/api/proxy`,
        accessToken: import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN || 'undefined'
      };
    } catch (error) {
      console.error('Error fetching Google Maps config from backend:', error);
      
      const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const envMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
      
      if (envApiKey && envMapId) {
        console.log('Using environment variables for Google Maps config');
        return {
          apiKey: envApiKey,
          mapId: envMapId,
          proxyUrl: `${this.BACKEND_URL}/api/proxy`,
          accessToken: import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN || 'undefined'
        };
      }
      
      throw new Error('Google Maps configuration not available');
    }
  }

  async getGoogleMapsConfig(): Promise<GoogleMapsConfig> {
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cache;
    }

    const config = await this.fetchGoogleMapsConfig();
    
    this.cache = config;
    this.cacheTimestamp = Date.now();
    
    return config;
  }

  async getGoogleMapsApiKey(): Promise<string> {
    const config = await this.getGoogleMapsConfig();
    return config.apiKey;
  }

  async getGoogleMapsMapId(): Promise<string> {
    const config = await this.getGoogleMapsConfig();
    return config.mapId;
  }

  async getSupabaseUrl(): Promise<string> {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  async getSupabaseAnonKey(): Promise<string> {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

export const configService = new ConfigService();
