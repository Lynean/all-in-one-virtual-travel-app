import { configService } from './configService';

let API_KEY: string | null = null;

const getApiKey = async (): Promise<string> => {
  if (!API_KEY) {
    API_KEY = await configService.getGoogleMapsApiKey();
  }
  return API_KEY;
};

export interface LocationName {
  formattedAddress: string;
  locality?: string;
  neighborhood?: string;
  landmark?: string;
  coordinates?: { lat: number; lng: number };
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<LocationName | null> {
  try {
    const apiKey = await getApiKey();
    
    // CRITICAL: Use proxy server to avoid CORS and mixed content issues
    const proxyUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'https://proxy.chatandbuild.com';
    const accessToken = import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN;
    
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    
    console.log('🔍 Reverse Geocoding Request:', {
      proxyUrl,
      geocodingUrl,
      hasAccessToken: !!accessToken
    });
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: geocodingUrl,
        method: 'GET',
        headers: {},
        body: {}
      })
    });
    
    console.log('📡 Proxy Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy Error Response:', errorText);
      throw new Error(`Geocoding API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Geocoding API Response:', data);

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status);
      return null;
    }

    // Prioritize results by type to get the most specific address with postal code
    const priorityTypes = [
      'premise',           // Specific building/property
      'subpremise',        // Unit within building
      'street_address',    // Street-level address
      'route',             // Street name
      'intersection',      // Street intersection
      'neighborhood',      // Neighborhood
      'locality'           // City/town
    ];

    let bestResult = null;

    // Find the most specific result that includes a postal code
    for (const priorityType of priorityTypes) {
      const found = data.results.find((result: any) => {
        const hasType = result.types && result.types.includes(priorityType);
        const hasPostalCode = result.address_components?.some((comp: any) => 
          comp.types?.includes('postal_code')
        );
        return hasType && hasPostalCode;
      });
      
      if (found) {
        bestResult = found;
        break;
      }
    }

    // Fallback to first result with postal code
    if (!bestResult) {
      bestResult = data.results.find((result: any) =>
        result.address_components?.some((comp: any) => 
          comp.types?.includes('postal_code')
        )
      );
    }

    // Final fallback to first result
    if (!bestResult) {
      bestResult = data.results[0];
    }

    const addressComponents = bestResult.address_components || [];

    let locality = '';
    let neighborhood = '';
    let landmark = '';
    let streetName = '';
    let postalCode = '';
    let country = '';

    for (const component of addressComponents) {
      const types = component.types || [];
      
      if (types.includes('locality')) {
        locality = component.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood')) {
        neighborhood = component.long_name;
      } else if (types.includes('point_of_interest') || types.includes('establishment')) {
        landmark = component.long_name;
      } else if (types.includes('route')) {
        streetName = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      }
    }

    // Construct formatted address in Google Maps style: "Street/Building, Country Postal_Code, Country"
    let formattedAddress = bestResult.formatted_address;

    // If we have postal code and country, try to construct a cleaner format
    if (postalCode && country) {
      // Extract the main address part (before postal code)
      const parts = formattedAddress.split(',').map((p: string) => p.trim());
      
      // Find the part with postal code
      const postalIndex = parts.findIndex((p: string) => p.includes(postalCode));
      
      if (postalIndex > 0) {
        // Take everything before postal code as the street/building name
        const mainAddress = parts.slice(0, postalIndex).join(', ');
        // Reconstruct: "Main Address, Country Postal_Code, Country"
        formattedAddress = `${mainAddress}, ${country} ${postalCode}, ${country}`;
      }
    }

    return {
      formattedAddress,
      locality,
      neighborhood,
      landmark,
      coordinates: { lat, lng },
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function forwardGeocode(address: string): Promise<LocationName | null> {
  try {
    const apiKey = await getApiKey();
    
    // CRITICAL: Use proxy server to avoid CORS and mixed content issues
    const proxyUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'https://proxy.chatandbuild.com';
    const accessToken = import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN;
    
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    console.log('🔍 Forward Geocoding Request:', {
      proxyUrl,
      geocodingUrl,
      hasAccessToken: !!accessToken
    });
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: geocodingUrl,
        method: 'GET',
        headers: {},
        body: {}
      })
    });
    
    console.log('📡 Proxy Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy Error Response:', errorText);
      throw new Error(`Geocoding API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Geocoding API Response:', data);

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Forward geocoding failed:', data.status);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry?.location;
    
    if (!location) {
      return null;
    }

    const addressComponents = result.address_components || [];
    let locality = '';
    let neighborhood = '';
    let landmark = '';
    let postalCode = '';
    let country = '';

    for (const component of addressComponents) {
      const types = component.types || [];
      
      if (types.includes('locality')) {
        locality = component.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood')) {
        neighborhood = component.long_name;
      } else if (types.includes('point_of_interest') || types.includes('establishment')) {
        landmark = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      }
    }

    // Construct formatted address similar to reverse geocode
    let formattedAddress = result.formatted_address;

    if (postalCode && country) {
      const parts = formattedAddress.split(',').map((p: string) => p.trim());
      const postalIndex = parts.findIndex((p: string) => p.includes(postalCode));
      
      if (postalIndex > 0) {
        const mainAddress = parts.slice(0, postalIndex).join(', ');
        formattedAddress = `${mainAddress}, ${country} ${postalCode}, ${country}`;
      }
    }

    return {
      formattedAddress,
      locality,
      neighborhood,
      landmark,
      coordinates: { lat: location.lat, lng: location.lng },
    };
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function formatLocationForDisplay(locationName: LocationName | null): string {
  if (!locationName) {
    return 'your current location';
  }

  return locationName.formattedAddress;
}
