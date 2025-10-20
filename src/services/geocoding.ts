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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status);
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components || [];

    let locality = '';
    let neighborhood = '';
    let landmark = '';

    for (const component of addressComponents) {
      const types = component.types || [];
      
      if (types.includes('locality')) {
        locality = component.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood')) {
        neighborhood = component.long_name;
      } else if (types.includes('point_of_interest') || types.includes('establishment')) {
        landmark = component.long_name;
      }
    }

    let formattedAddress = result.formatted_address;

    if (landmark) {
      formattedAddress = `near ${landmark}`;
    } else if (neighborhood && locality) {
      formattedAddress = `in ${neighborhood}, ${locality}`;
    } else if (locality) {
      formattedAddress = `in ${locality}`;
    } else {
      const parts = result.formatted_address.split(',');
      formattedAddress = parts.slice(0, 2).join(',');
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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

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

    for (const component of addressComponents) {
      const types = component.types || [];
      
      if (types.includes('locality')) {
        locality = component.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood')) {
        neighborhood = component.long_name;
      } else if (types.includes('point_of_interest') || types.includes('establishment')) {
        landmark = component.long_name;
      }
    }

    return {
      formattedAddress: result.formatted_address,
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
