"""
Google Maps Routes API Tool
Handles route computation, directions, and navigation
"""
from langchain.tools import BaseTool
from typing import Optional, Type, List
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class RoutesInput(BaseModel):
    """Input schema for routes tool - flexible to handle LangChain parsing quirks"""
    # Make all fields optional with default None to bypass Pydantic validation
    # Actual validation happens in _arun method
    origin: Optional[str] = Field(None, description="Starting location (address or place name)")
    destination: Optional[str] = Field(None, description="Destination location (address or place name)")
    waypoints: Optional[List[str]] = Field(
        None,
        description="Optional list of waypoints to visit along the route"
    )
    travel_mode: Optional[str] = Field(
        "DRIVE",
        description="Travel mode: DRIVE, WALK, BICYCLE, TRANSIT, TWO_WHEELER"
    )
    avoid: Optional[List[str]] = Field(
        None,
        description="Features to avoid: tolls, highways, ferries, indoor"
    )
    
    class Config:
        # Allow extra fields that might come from LangChain parsing
        extra = "allow"


class GoogleRoutesTool(BaseTool):
    """Tool for computing routes and directions using Google Routes API"""
    
    name: str = "compute_route"
    description: str = """
    Calculate optimal routes and directions between locations using Google Routes API.
    
    Use this tool when user asks about:
    - Directions from one place to another
    - Best route between locations
    - Travel time and distance estimates
    - Navigation with multiple stops (waypoints)
    - Route alternatives avoiding tolls/highways/ferries
    - Different transportation modes (driving, walking, cycling, transit)
    
    Examples:
    - "How do I get from Times Square to Central Park?"
    - "What's the fastest route to the airport?"
    - "Show me walking directions to the nearest coffee shop"
    - "Plan a route visiting Museum A, Restaurant B, then Hotel C"
    
    This tool generates route commands that will be executed by the frontend with real-time data.
    """
    args_schema: Type[BaseModel] = RoutesInput
    
    def _run(self, tool_input: dict = None, **kwargs) -> str:
        """Synchronous version (not used in async context)"""
        logger.info(f"🔍 _run (SYNC) called with tool_input={tool_input}, kwargs={kwargs}")
        raise NotImplementedError("Use async version")
    
    async def _arun(self, tool_input = None, **kwargs) -> str:
        """
        Generate route computation command
        Accepts tool_input (dict or JSON string) or kwargs to handle various LangChain calling patterns
        
        Returns:
            Route command string to be parsed and executed by frontend
        """
        try:
            import json
            
            # DEBUG: Log exactly what we received
            logger.info(f"🔍 _arun called with:")
            logger.info(f"  - tool_input type: {type(tool_input)}, value: {tool_input}")
            logger.info(f"  - kwargs: {kwargs}")
            
            # CRITICAL: LangChain passes the JSON as a STRING in tool_input, not a dict!
            if tool_input:
                if isinstance(tool_input, str):
                    # Parse the JSON string
                    try:
                        parsed = json.loads(tool_input)
                        kwargs.update(parsed)
                        logger.info(f"  - Parsed JSON string, kwargs now: {kwargs}")
                    except Exception as e:
                        logger.error(f"  - Failed to parse JSON string: {e}")
                elif isinstance(tool_input, dict):
                    # Already a dict, just merge
                    kwargs.update(tool_input)
                    logger.info(f"  - Merged dict, kwargs now: {kwargs}")
            
            # Handle edge case: JSON wrapped in another string
            if 'origin' in kwargs and isinstance(kwargs['origin'], str) and kwargs['origin'].startswith('{'):
                try:
                    nested_parsed = json.loads(kwargs['origin'])
                    kwargs.update(nested_parsed)
                    logger.info(f"  - Unwrapped nested JSON, kwargs: {kwargs}")
                except Exception as e:
                    logger.warning(f"  - Nested JSON unwrap failed: {e}")
            
            # Extract parameters with defaults
            origin = kwargs.get('origin')
            destination = kwargs.get('destination')
            waypoints = kwargs.get('waypoints')
            travel_mode = kwargs.get('travel_mode', 'DRIVE')
            avoid = kwargs.get('avoid')
            
            logger.info(f"  - Extracted: origin={origin}, destination={destination}, travel_mode={travel_mode}")
            
            # Validate required fields
            if not origin or not destination:
                error_msg = f"Missing required fields. Got: {kwargs}"
                logger.error(error_msg)
                return f"⚠️ Error: Both 'origin' and 'destination' are required. {error_msg}"
            
            # Build route data object
            route_data = {
                "origin": origin,
                "destination": destination,
                "travelMode": travel_mode.upper()
            }
            
            if waypoints:
                route_data["waypoints"] = waypoints
            
            if avoid:
                route_data["avoid"] = avoid
            
            # Generate map command
            import json
            route_json = json.dumps(route_data)
            command = f"[MAP_ROUTE:{route_json}]"
            
            # Build readable response
            mode_emoji = {
                "DRIVE": "🚗",
                "WALK": "🚶",
                "BICYCLE": "🚴",
                "TRANSIT": "🚇",
                "TWO_WHEELER": "🛵"
            }.get(travel_mode.upper(), "🗺️")
            
            response_parts = [
                f"{mode_emoji} Computing {travel_mode.lower()} route:",
                f"  • From: **{origin}**",
                f"  • To: **{destination}**"
            ]
            
            if waypoints:
                response_parts.append(f"  • Via: {', '.join(waypoints)}")
            
            if avoid:
                response_parts.append(f"  • Avoiding: {', '.join(avoid)}")
            
            response_parts.append(f"\n{command}")
            
            logger.info(f"Generated route command: {origin} → {destination} ({travel_mode})")
            return "\n".join(response_parts)
            
        except Exception as e:
            logger.error(f"Routes tool error: {str(e)}")
            return f"⚠️ Unable to compute route: {str(e)}"
