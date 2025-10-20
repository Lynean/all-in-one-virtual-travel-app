"""
Backend Google Places API Service
Handles all Google Places API calls server-side
"""
import os
import logging
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Get API key from environment or admin service
GOOGLE_MAPS_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY", "")
PLACES_API_BASE_URL = "https://places.googleapis.com/v1"


class PlaceLocation(BaseModel):
    latitude: float
    longitude: float


class PlaceSearchRequest(BaseModel):
    query: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: int = 5000
    included_types: Optional[List[str]] = None
    min_rating: Optional[float] = None
    open_now: Optional[bool] = None


class PlaceResult(BaseModel):
    id: str
    name: str
    formatted_address: str
    location: PlaceLocation
    rating: Optional[float] = None
    user_ratings_total: Optional[int] = None
    types: List[str] = []
    price_level: Optional[str] = None
    business_status: Optional[str] = None
    photos: List[str] = []


class BackendPlacesService:
    """Server-side Google Places API service"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or GOOGLE_MAPS_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def search_text(self, request: PlaceSearchRequest) -> List[PlaceResult]:
        """
        Search for places by text query
        Server-side equivalent of frontend placesApi.searchText()
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.priceLevel,places.businessStatus,places.photos"
            }
            
            body = {
                "textQuery": request.query,
                "maxResultCount": 20
            }
            
            # Add location bias if coordinates provided
            if request.latitude and request.longitude:
                body["locationBias"] = {
                    "circle": {
                        "center": {
                            "latitude": request.latitude,
                            "longitude": request.longitude
                        },
                        "radius": request.radius
                    }
                }
            
            # Add filters
            if request.included_types:
                body["includedType"] = request.included_types[0] if request.included_types else None
            
            if request.min_rating:
                body["minRating"] = request.min_rating
            
            if request.open_now:
                body["openNow"] = request.open_now
            
            response = await self.client.post(
                f"{PLACES_API_BASE_URL}/places:searchText",
                headers=headers,
                json=body
            )
            
            if response.status_code != 200:
                logger.error(f"Places API error: {response.status_code} - {response.text}")
                return []
            
            data = response.json()
            places = data.get("places", [])
            
            # Convert to PlaceResult format
            results = []
            for place in places:
                try:
                    result = PlaceResult(
                        id=place.get("id", ""),
                        name=place.get("displayName", {}).get("text", ""),
                        formatted_address=place.get("formattedAddress", ""),
                        location=PlaceLocation(
                            latitude=place.get("location", {}).get("latitude", 0),
                            longitude=place.get("location", {}).get("longitude", 0)
                        ),
                        rating=place.get("rating"),
                        user_ratings_total=place.get("userRatingCount"),
                        types=place.get("types", []),
                        price_level=place.get("priceLevel"),
                        business_status=place.get("businessStatus"),
                        photos=[photo.get("name", "") for photo in place.get("photos", [])[:3]]
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Failed to parse place: {e}")
                    continue
            
            logger.info(f"Found {len(results)} places for query: {request.query}")
            return results
            
        except Exception as e:
            logger.error(f"Error searching places: {e}", exc_info=True)
            return []
    
    async def search_nearby(
        self,
        latitude: float,
        longitude: float,
        radius: int = 5000,
        included_types: Optional[List[str]] = None
    ) -> List[PlaceResult]:
        """
        Search for places near a location
        Server-side equivalent of frontend placesApi.searchNearby()
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.priceLevel,places.businessStatus"
            }
            
            body = {
                "locationRestriction": {
                    "circle": {
                        "center": {
                            "latitude": latitude,
                            "longitude": longitude
                        },
                        "radius": radius
                    }
                },
                "maxResultCount": 20
            }
            
            if included_types:
                body["includedTypes"] = included_types
            
            response = await self.client.post(
                f"{PLACES_API_BASE_URL}/places:searchNearby",
                headers=headers,
                json=body
            )
            
            if response.status_code != 200:
                logger.error(f"Places API error: {response.status_code} - {response.text}")
                return []
            
            data = response.json()
            places = data.get("places", [])
            
            # Convert to PlaceResult format
            results = []
            for place in places:
                try:
                    result = PlaceResult(
                        id=place.get("id", ""),
                        name=place.get("displayName", {}).get("text", ""),
                        formatted_address=place.get("formattedAddress", ""),
                        location=PlaceLocation(
                            latitude=place.get("location", {}).get("latitude", 0),
                            longitude=place.get("location", {}).get("longitude", 0)
                        ),
                        rating=place.get("rating"),
                        user_ratings_total=place.get("userRatingCount"),
                        types=place.get("types", []),
                        price_level=place.get("priceLevel"),
                        business_status=place.get("businessStatus"),
                        photos=[]
                    )
                    results.append(result)
                except Exception as e:
                    logger.warning(f"Failed to parse place: {e}")
                    continue
            
            logger.info(f"Found {len(results)} nearby places")
            return results
            
        except Exception as e:
            logger.error(f"Error searching nearby: {e}", exc_info=True)
            return []
    
    async def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a place"""
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,types,priceLevel,websiteUri,nationalPhoneNumber,regularOpeningHours"
            }
            
            response = await self.client.get(
                f"{PLACES_API_BASE_URL}/places/{place_id}",
                headers=headers
            )
            
            if response.status_code != 200:
                logger.error(f"Place details error: {response.status_code}")
                return None
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting place details: {e}")
            return None
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Singleton instance
_places_service_instance = None

def get_places_service() -> BackendPlacesService:
    """Get or create the places service singleton"""
    global _places_service_instance
    if _places_service_instance is None:
        _places_service_instance = BackendPlacesService()
    return _places_service_instance
