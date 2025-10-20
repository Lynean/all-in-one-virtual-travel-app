"""
Backend Google Routes API Service
Handles all Google Routes API calls server-side
"""
import os
import logging
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Get API key from environment
GOOGLE_MAPS_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY", "")
ROUTES_API_BASE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


class RouteWaypoint(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


class RouteRequest(BaseModel):
    origin: RouteWaypoint
    destination: RouteWaypoint
    waypoints: Optional[List[RouteWaypoint]] = None
    travel_mode: str = "DRIVE"  # DRIVE, WALK, BICYCLE, TRANSIT, TWO_WHEELER
    avoid: Optional[List[str]] = None  # tolls, highways, ferries, indoor


class RouteStep(BaseModel):
    instruction: str
    distance: int  # meters
    duration: int  # seconds
    start_location: Dict[str, float]
    end_location: Dict[str, float]


class RouteLeg(BaseModel):
    start_address: str
    end_address: str
    distance: int  # meters
    duration: int  # seconds
    steps: List[RouteStep]


class RouteResult(BaseModel):
    legs: List[RouteLeg]
    polyline: str  # Encoded polyline
    distance: int  # Total distance in meters
    duration: int  # Total duration in seconds
    travel_mode: str


class BackendRoutesService:
    """Server-side Google Routes API service"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or GOOGLE_MAPS_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def compute_routes(self, request: RouteRequest) -> Optional[RouteResult]:
        """
        Compute routes between origin and destination
        Server-side equivalent of frontend routesApi.computeRoutes()
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "routes.legs,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
            }
            
            body = {
                "origin": {
                    "location": {
                        "latLng": {
                            "latitude": request.origin.latitude,
                            "longitude": request.origin.longitude
                        }
                    }
                },
                "destination": {
                    "location": {
                        "latLng": {
                            "latitude": request.destination.latitude,
                            "longitude": request.destination.longitude
                        }
                    }
                },
                "travelMode": request.travel_mode,
                "routingPreference": "TRAFFIC_AWARE",
                "computeAlternativeRoutes": False,
                "languageCode": "en-US",
                "units": "METRIC"
            }
            
            # Add waypoints if provided
            if request.waypoints:
                body["intermediates"] = [
                    {
                        "location": {
                            "latLng": {
                                "latitude": wp.latitude,
                                "longitude": wp.longitude
                            }
                        }
                    }
                    for wp in request.waypoints
                ]
            
            # Add route modifiers (avoid features)
            if request.avoid:
                body["routeModifiers"] = {
                    "avoidTolls": "tolls" in request.avoid,
                    "avoidHighways": "highways" in request.avoid,
                    "avoidFerries": "ferries" in request.avoid,
                    "avoidIndoor": "indoor" in request.avoid
                }
            
            response = await self.client.post(
                ROUTES_API_BASE_URL,
                headers=headers,
                json=body
            )
            
            if response.status_code != 200:
                logger.error(f"Routes API error: {response.status_code} - {response.text}")
                return None
            
            data = response.json()
            routes = data.get("routes", [])
            
            if not routes:
                logger.warning("No routes found")
                return None
            
            # Parse first route
            route = routes[0]
            legs = route.get("legs", [])
            
            # Convert legs to RouteResult format
            parsed_legs = []
            for leg in legs:
                steps = []
                for step in leg.get("steps", []):
                    steps.append(RouteStep(
                        instruction=step.get("navigationInstruction", {}).get("instructions", "Continue"),
                        distance=step.get("distanceMeters", 0),
                        duration=int(step.get("staticDuration", "0s").replace("s", "")),
                        start_location={
                            "latitude": step.get("startLocation", {}).get("latLng", {}).get("latitude", 0),
                            "longitude": step.get("startLocation", {}).get("latLng", {}).get("longitude", 0)
                        },
                        end_location={
                            "latitude": step.get("endLocation", {}).get("latLng", {}).get("latitude", 0),
                            "longitude": step.get("endLocation", {}).get("latLng", {}).get("longitude", 0)
                        }
                    ))
                
                parsed_legs.append(RouteLeg(
                    start_address=leg.get("startLocation", {}).get("latLng", {}).get("latitude", ""),
                    end_address=leg.get("endLocation", {}).get("latLng", {}).get("latitude", ""),
                    distance=leg.get("distanceMeters", 0),
                    duration=int(leg.get("duration", "0s").replace("s", "")),
                    steps=steps
                ))
            
            result = RouteResult(
                legs=parsed_legs,
                polyline=route.get("polyline", {}).get("encodedPolyline", ""),
                distance=route.get("distanceMeters", 0),
                duration=int(route.get("duration", "0s").replace("s", "")),
                travel_mode=request.travel_mode
            )
            
            logger.info(f"Computed route: {result.distance}m, {result.duration}s")
            return result
            
        except Exception as e:
            logger.error(f"Error computing routes: {e}", exc_info=True)
            return None
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Singleton instance
_routes_service_instance = None

def get_routes_service() -> BackendRoutesService:
    """Get or create the routes service singleton"""
    global _routes_service_instance
    if _routes_service_instance is None:
        _routes_service_instance = BackendRoutesService()
    return _routes_service_instance
