from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class MapsInput(BaseModel):
    """Input schema for maps tool"""
    query: str = Field(..., description="Search query or destination")
    latitude: Optional[float] = Field(None, description="User's current latitude")
    longitude: Optional[float] = Field(None, description="User's current longitude")
    action: str = Field(
        default="search",
        description="Action type: 'search' for places or 'directions' for routes"
    )


class MapsTool(BaseTool):
    """Tool for map-related operations (delegates to frontend)"""
    
    name: str = "search_places"
    description: str = """
    Search for places, attractions, or get directions.
    Use this when user asks about nearby locations, restaurants, hotels, or directions.
    This tool generates map commands that will be executed by the frontend.
    Input should be search query and optional user location.
    Returns confirmation that map action will be executed.
    """
    args_schema: Type[BaseModel] = MapsInput
    
    def _run(
        self,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        action: str = "search"
    ) -> str:
        """Synchronous version (not used in async context)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(
        self,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        action: str = "search"
    ) -> str:
        """
        Generate map action command
        
        Args:
            query: Search query or destination
            latitude: User's latitude (optional)
            longitude: User's longitude (optional)
            action: 'search' or 'directions'
        
        Returns:
            Map command string to be parsed by frontend
        """
        try:
            if action == "directions":
                command = f"[MAP_DIRECTIONS:{query}]"
                logger.info(f"Generated directions command: {query}")
                return f"🗺️ Showing directions to **{query}** on the map.\n{command}"
            else:
                command = f"[MAP_SEARCH:{query}]"
                logger.info(f"Generated search command: {query}")
                return f"🔍 Searching for **{query}** on the map.\n{command}"
                
        except Exception as e:
            logger.error(f"Maps tool error: {str(e)}")
            return f"⚠️ Unable to generate map action: {str(e)}"
