/**
 * Configuration Service
 * Handles retrieving API keys from backend admin panel or fallback to env variables
 */

interface APIKeyCache {
  [key: string]: {
    value: string;
    timestamp: number;
  };
}

class ConfigService {
  private cache: APIKeyCache = {};
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  private adminToken: string | null = null;

  /**
   * Authenticate as admin and store token
   */
  private async authenticate(): Promise<string | null> {
    // Check if we have a valid cached token
    if (this.adminToken) {
      return this.adminToken;
    }

    try {
      // Try to get admin credentials from localStorage or prompt user
      const username = localStorage.getItem('admin_username') || 'admin';
      const password = localStorage.getItem('admin_password') || 'admin123';

      const response = await fetch(`${this.BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        console.warn('Admin authentication failed, will use env variables');
        return null;
      }

      const data = await response.json();
      this.adminToken = data.access_token;

      // Clear token after expiry
      setTimeout(() => {
        this.adminToken = null;
      }, (data.expires_in || 3600) * 1000);

      return this.adminToken;
    } catch (error) {
      console.warn('Failed to authenticate with admin panel:', error);
      return null;
    }
  }

  /**
   * Retrieve API key from backend admin panel
   */
  private async fetchKeyFromBackend(keyName: string): Promise<string | null> {
    try {
      const token = await this.authenticate();
      if (!token) {
        return null;
      }

      const response = await fetch(
        `${this.BACKEND_URL}/api/admin/keys/${keyName}/value`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch key ${keyName} from backend:`, response.status);
        return null;
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.warn(`Error fetching key ${keyName} from backend:`, error);
      return null;
    }
  }

  /**
   * Get API key with caching and fallback to env variables
   */
  async getApiKey(keyName: string, envFallback?: string): Promise<string> {
    // Check cache first
    const cached = this.cache[keyName];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.value;
    }

    // Try to fetch from backend
    const backendValue = await this.fetchKeyFromBackend(keyName);
    if (backendValue) {
      // Cache the value
      this.cache[keyName] = {
        value: backendValue,
        timestamp: Date.now(),
      };
      return backendValue;
    }

    // Fallback to environment variable
    const envValue = envFallback || (import.meta.env as any)[keyName];
    if (envValue) {
      console.log(`Using environment variable for ${keyName}`);
      return envValue;
    }

    throw new Error(`API key ${keyName} not found in backend or environment variables`);
  }

  /**
   * Get Google Maps API Key
   */
  async getGoogleMapsApiKey(): Promise<string> {
    return this.getApiKey(
      'VITE_GOOGLE_MAPS_API_KEY',
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    );
  }

  /**
   * Get Google Maps Map ID
   */
  async getGoogleMapsMapId(): Promise<string> {
    return this.getApiKey(
      'VITE_GOOGLE_MAPS_MAP_ID',
      import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    );
  }

  /**
   * Get Supabase URL
   */
  async getSupabaseUrl(): Promise<string> {
    return this.getApiKey(
      'VITE_SUPABASE_URL',
      import.meta.env.VITE_SUPABASE_URL
    );
  }

  /**
   * Get Supabase Anon Key
   */
  async getSupabaseAnonKey(): Promise<string> {
    return this.getApiKey(
      'VITE_SUPABASE_ANON_KEY',
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Set admin credentials for authentication
   */
  setAdminCredentials(username: string, password: string): void {
    localStorage.setItem('admin_username', username);
    localStorage.setItem('admin_password', password);
    this.adminToken = null; // Force re-authentication
  }
}

// Export singleton instance
export const configService = new ConfigService();
