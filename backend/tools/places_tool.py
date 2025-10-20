"""
Google Places API Tool
Handles place searches, details, and nearby locations
"""
from langchain.tools import BaseTool
from typing import Optional, Type, List
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class PlacesSearchInput(BaseModel):
    """Input schema for places search tool - flexible to handle LangChain parsing quirks"""
    # Make query optional to bypass Pydantic validation - actual validation in _arun
    query: Optional[str] = Field(None, description="Search query for places (e.g., 'italian restaurants', 'hotels near me', 'museums')")
    latitude: Optional[float] = Field(None, description="User's current latitude for location-based search")
    longitude: Optional[float] = Field(None, description="User's current longitude for location-based search")
    radius: Optional[int] = Field(
        5000,
        description="Search radius in meters (default: 5000m = 5km)"
    )
    place_types: Optional[List[str]] = Field(
        None,
        description="Filter by place types: restaurant, cafe, hotel, museum, park, etc."
    )
    min_rating: Optional[float] = Field(
        None,
        description="Minimum rating filter (0-5)"
    )
    price_level: Optional[str] = Field(
        None,
        description="Price level: FREE, INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE"
    )
    open_now: Optional[bool] = Field(
        None,
        description="Filter to only show places open now"
    )
    
    class Config:
        # Allow extra fields that might come from LangChain parsing
        extra = "allow"


class GooglePlacesTool(BaseTool):
    """Tool for searching places and attractions using Google Places API (New)"""
    
    name: str = "search_places"
    description: str = """
    Search for places, attractions, restaurants, hotels, and points of interest using Google Places API.
    
    Use this tool when user asks about:
    - Finding specific types of places ("Where can I eat?", "Hotels near me")
    - Nearby attractions and landmarks
    - Restaurants, cafes, shops, services
    - Tourist destinations and activities
    - Places with specific criteria (rating, price, open now)
    - Recommendations based on location
    
    Examples:
    - "Find good Italian restaurants nearby"
    - "Where's the nearest coffee shop?"
    - "Show me museums in downtown"
    - "Hotels under $150 near Times Square"
    - "Parks and playgrounds for kids"
    - "Best rated sushi restaurants open now"
    
    This tool generates search commands with filters that will be executed by the frontend.
    """
    args_schema: Type[BaseModel] = PlacesSearchInput
    
    def _run(self, **kwargs) -> str:
        """Synchronous version (not used in async context)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, tool_input = None, **kwargs) -> str:
        """
        Generate place search command
        Accepts tool_input (dict or JSON string) or kwargs to handle various LangChain calling patterns
        
        Returns:
            Places search command string to be parsed and executed by frontend
        """
        try:
            import json
            
            # CRITICAL: LangChain passes the JSON as a STRING in tool_input, not a dict!
            if tool_input:
                if isinstance(tool_input, str):
                    # Parse the JSON string
                    try:
                        parsed = json.loads(tool_input)
                        kwargs.update(parsed)
                        logger.info(f"🔍 Parsed JSON string: {parsed}")
                    except Exception as e:
                        logger.error(f"Failed to parse JSON string: {e}")
                elif isinstance(tool_input, dict):
                    # Already a dict, just merge
                    kwargs.update(tool_input)
            
            # Handle edge case: JSON wrapped in another string
            if 'query' in kwargs and isinstance(kwargs.get('query'), str):
                first_val = kwargs['query']
                if first_val.startswith('{'):
                    try:
                        parsed = json.loads(first_val)
                        kwargs.update(parsed)
                    except:
                        pass
            
            # Extract parameters
            query = kwargs.get('query')
            latitude = kwargs.get('latitude')
            longitude = kwargs.get('longitude')
            radius = kwargs.get('radius', 5000)
            place_types = kwargs.get('place_types')
            min_rating = kwargs.get('min_rating')
            price_level = kwargs.get('price_level')
            open_now = kwargs.get('open_now')
            
            # Validate required field
            if not query:
                error_msg = f"Missing required 'query' field. Got: {kwargs}"
                logger.error(error_msg)
                return f"⚠️ Error: 'query' is required. {error_msg}"
            
            # Build search data object
            search_data = {
                "query": query,
                "radius": radius
            }
            
            if latitude and longitude:
                # Frontend expects flat structure
                search_data["latitude"] = latitude
                search_data["longitude"] = longitude
            
            if place_types:
                search_data["includedTypes"] = place_types
            
            if min_rating:
                search_data["minRating"] = min_rating
            
            if price_level:
                search_data["priceLevel"] = price_level
            
            if open_now is not None:
                search_data["openNow"] = open_now
            
            # Generate map command
            import json
            search_json = json.dumps(search_data)
            command = f"[MAP_SEARCH:{search_json}]"
            
            # Build readable response
            response_parts = [
                f"🔍 Searching for: **{query}**"
            ]
            
            filters = []
            if latitude and longitude:
                filters.append(f"within {radius}m radius")
            if min_rating:
                filters.append(f"rating ≥{min_rating}⭐")
            if price_level:
                filters.append(f"price: {price_level}")
            if open_now:
                filters.append("open now")
            
            if filters:
                response_parts.append(f"  • Filters: {', '.join(filters)}")
            
            response_parts.append(f"\n{command}")
            
            logger.info(f"Generated places search command: {query}")
            return "\n".join(response_parts)
            
        except Exception as e:
            logger.error(f"Places tool error: {str(e)}")
            return f"⚠️ Unable to search places: {str(e)}"


class PlaceDetailsInput(BaseModel):
    """Input schema for place details tool"""
    place_id: str = Field(..., description="Google Place ID")
    place_name: str = Field(..., description="Name of the place for user-friendly response")


class GooglePlaceDetailsTool(BaseTool):
    """Tool for getting detailed information about a specific place"""
    
    name: str = "get_place_details"
    description: str = """
    Get detailed information about a specific place using its Google Place ID.
    
    Use this tool when user asks for:
    - Detailed information about a specific location
    - Opening hours, phone numbers, website
    - Reviews and ratings
    - Photos and additional details
    - Exact address and location
    
    Examples:
    - "Tell me more about [place name]"
    - "What are the opening hours of [place]?"
    - "Show me reviews for [place]"
    - "What's the phone number of [restaurant]?"
    
    Note: You need a Place ID from search_places first.
    """
    args_schema: Type[BaseModel] = PlaceDetailsInput
    
    def _run(self, **kwargs) -> str:
        """Synchronous version (not used in async context)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, place_id: str, place_name: str) -> str:
        """Generate place details command"""
        try:
            command = f"[MAP_PLACE_DETAILS:{place_id}]"
            
            logger.info(f"Generated place details command: {place_id}")
            return f"📍 Fetching details for **{place_name}**...\n{command}"
            
        except Exception as e:
            logger.error(f"Place details tool error: {str(e)}")
            return f"⚠️ Unable to fetch place details: {str(e)}"
