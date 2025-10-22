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
    
    // Direct API call to Google Maps Geocoding API
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    
    console.log('🔍 Reverse Geocoding Request:', { lat, lng });
    
    const response = await fetch(geocodingUrl);
    
    console.log('📡 Geocoding Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Geocoding Error Response:', errorText);
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
      'premise',
      'subpremise',
      'street_address',
      'route',
      'intersection',
      'neighborhood',
      'locality'
    ];

    let bestResult = null;

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

    if (!bestResult) {
      bestResult = data.results.find((result: any) =>
        result.address_components?.some((comp: any) => 
          comp.types?.includes('postal_code')
        )
      );
    }

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

    let formattedAddress = bestResult.formatted_address;

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
    
    // Direct API call to Google Maps Geocoding API
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    console.log('🔍 Forward Geocoding Request:', { address });
    
    const response = await fetch(geocodingUrl);
    
    console.log('📡 Geocoding Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Geocoding Error Response:', errorText);
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
  const R = 6371;
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
