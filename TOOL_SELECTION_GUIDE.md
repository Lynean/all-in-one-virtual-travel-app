# Intelligent Tool Selection System

## Overview
The TravelMate AI Agent now features an intelligent tool selection system that automatically analyzes user queries and selects the appropriate Google Maps APIs and other tools to fulfill requests.

## Architecture

### Tool Categories

#### 1. **Google Maps Tools**
- **`search_places`** (GooglePlacesTool) - Places API (New)
  - Find restaurants, hotels, attractions, services
  - Advanced filtering: type, rating, price, open now, radius
  - Location-based search with customizable radius

- **`compute_route`** (GoogleRoutesTool) - Routes API
  - Calculate directions between locations
  - Multiple transportation modes (drive, walk, bike, transit)
  - Multi-waypoint routing
  - Route optimization (avoid tolls, highways, ferries)

- **`get_place_details`** (GooglePlaceDetailsTool) - Places API
  - Detailed information about specific places
  - Opening hours, contact info, website
  - Reviews, ratings, photos
  - Requires Place ID from search results

#### 2. **Travel Information Tools**
- **`get_weather`** (WeatherTool) - Weather API
  - Current conditions and forecasts
  - Location-based weather data
  - Extended forecasts for trip planning

- **`convert_currency`** (CurrencyTool) - Currency API
  - Real-time currency conversion
  - International travel budget planning

## Decision Logic

### Query Analysis Rules

```
User Query Pattern → Tool Selection
─────────────────────────────────────────────────────────────
"Where can I..." → search_places
"Find [type]..." → search_places
"[Type] near me" → search_places
"Best [category]" → search_places (with rating filter)

"How do I get to..." → compute_route
"Directions to..." → compute_route
"Route from X to Y" → compute_route
"Show me the way..." → compute_route

"Tell me about [place]" → get_place_details (needs place_id)
"Details for..." → get_place_details
"Opening hours of..." → get_place_details

"Weather in..." → get_weather
"Will it rain..." → get_weather
"Forecast for..." → get_weather

"Convert [amount] [currency]" → convert_currency
"How much is X in Y" → convert_currency
```

### Multi-Step Workflows

The agent can chain tools for complex requests:

1. **Search → Details Flow**
   ```
   User: "Find Italian restaurants and tell me about the top one"
   Agent: 
     1. Use search_places for "Italian restaurants"
     2. Use get_place_details for top result
   ```

2. **Search → Route Flow**
   ```
   User: "Find parks and show me how to get there"
   Agent:
     1. Use search_places for "parks"
     2. Use compute_route from user location to selected park
   ```

3. **Route with Weather Flow**
   ```
   User: "Directions to beach, will it rain?"
   Agent:
     1. Use compute_route to beach
     2. Use get_weather for destination
   ```

## Tool Input Schemas

### search_places (GooglePlacesTool)
```python
{
  "query": str,                    # Search query
  "latitude": float | None,        # User location
  "longitude": float | None,
  "radius": int = 5000,           # Search radius (meters)
  "place_types": List[str] | None, # Filter by type
  "min_rating": float | None,      # Minimum rating (0-5)
  "price_level": str | None,       # Price filter
  "open_now": bool | None          # Only show open places
}
```

### compute_route (GoogleRoutesTool)
```python
{
  "origin": str,                   # Starting location
  "destination": str,              # Destination
  "waypoints": List[str] | None,   # Stops along the way
  "travel_mode": str = "DRIVE",    # DRIVE|WALK|BICYCLE|TRANSIT
  "avoid": List[str] | None        # tolls|highways|ferries|indoor
}
```

### get_place_details (GooglePlaceDetailsTool)
```python
{
  "place_id": str,                 # Google Place ID
  "place_name": str                # For user-friendly response
}
```

## Map Action Commands

Tools generate structured commands that the frontend parses and executes:

### Format Examples

```
[MAP_SEARCH:{"query":"restaurants","radius":5000,"minRating":4.0}]
[MAP_ROUTE:{"origin":"Times Square","destination":"Central Park","travelMode":"WALK"}]
[MAP_PLACE_DETAILS:ChIJN1t_tDeuEmsRUsoyG83frY4]
[MAP_MARKER:40.758,-73.9855,Your Location]
[MAP_ZOOM:15]
```

## Usage Examples

### Example 1: Find Restaurants
```
User: "Find good Italian restaurants near me that are open now"

Agent Process:
1. Analyzes query → Selects search_places tool
2. Extracts parameters:
   - query: "Italian restaurants"
   - User's location from context
   - Filters: open_now=True, min_rating=4.0
3. Generates: [MAP_SEARCH:{...}]

Response: "🔍 Searching for Italian restaurants near Times Square
           • Filters: within 5000m, rating ≥4.0⭐, open now"
```

### Example 2: Get Directions
```
User: "How do I walk from Times Square to Central Park?"

Agent Process:
1. Analyzes query → Selects compute_route tool
2. Extracts parameters:
   - origin: "Times Square"
   - destination: "Central Park"
   - travel_mode: "WALK" (detected from "walk")
3. Generates: [MAP_ROUTE:{...}]

Response: "🚶 Computing walking route:
           • From: Times Square
           • To: Central Park
           Estimated time: 15 minutes"
```

### Example 3: Multi-Step Planning
```
User: "Plan a day trip: museums, lunch, then park"

Agent Process:
1. Uses search_places for "museums"
2. Uses search_places for "restaurants" 
3. Uses search_places for "parks"
4. Uses compute_route to connect all locations
5. Uses get_weather for day planning

Response: "Here's your day trip itinerary:
           
           Morning (10 AM): Metropolitan Museum of Art
           [MAP_MARKER:40.7794,-73.9632,Start Here]
           
           Lunch (1 PM): Italian Restaurant nearby  
           [MAP_ROUTE:{origin:museum,destination:restaurant}]
           
           Afternoon (3 PM): Central Park
           [MAP_ROUTE:{origin:restaurant,destination:park}]
           
           Weather: Sunny, 75°F ☀️ Perfect for walking!"
```

## Configuration

### Agent System Prompt
The system prompt in `agent_service.py` provides detailed guidance:
- Tool selection rules
- Query pattern matching
- Multi-step workflow examples
- Response formatting guidelines

### Tool Registration
Tools are registered in `_initialize_tools()`:
```python
def _initialize_tools(self) -> List:
    return [
        WeatherTool(),
        CurrencyTool(),
        GooglePlacesTool(),        # Primary place search
        GooglePlaceDetailsTool(),  # Detailed information
        GoogleRoutesTool(),        # Navigation & directions
        MapsTool()                 # Legacy support
    ]
```

## Frontend Integration

### Map Action Handler
Frontend components should handle these action types:

```typescript
interface MapAction {
  type: 'search' | 'route' | 'place_details' | 'marker' | 'zoom';
  data: Record<string, any>;
}

// Example handlers
switch (action.type) {
  case 'search':
    await placesApi.searchText(action.data);
    break;
  case 'route':
    await routesApi.computeRoutes(action.data);
    break;
  case 'place_details':
    await placesApi.getPlaceDetails(action.data.place_id);
    break;
  // ... other cases
}
```

## Testing

Run the test suite to verify tool selection:

```bash
python test_tool_selection.py
```

This tests various query patterns and verifies:
- Correct tool selection
- Proper parameter extraction
- Valid map action generation
- Multi-step workflow execution

## Future Enhancements

### Planned Tools
- **Distance Matrix Tool** - Bulk distance calculations
- **Geocoding Tool** - Address ↔ Coordinates conversion
- **Traffic Tool** - Real-time traffic data
- **Transit Tool** - Public transportation routes

### Advanced Features
- Context-aware tool chaining
- Learning from user preferences
- Proactive suggestions based on history
- Multi-language support
- Voice command integration

## Troubleshooting

### Tool Not Selected
**Problem**: Agent doesn't use the correct tool
**Solution**: Check system prompt patterns, ensure query matches decision rules

### Invalid Parameters
**Problem**: Tool receives wrong input format
**Solution**: Verify tool input schema, check context data structure

### Missing Location
**Problem**: Location-based tools fail without coordinates
**Solution**: Ensure location_confirmed in context, prompt user for confirmation

## Best Practices

1. **Always Confirm Location** - Before using location-based tools
2. **Provide Context** - Include user location, preferences in requests
3. **Chain Thoughtfully** - Don't over-chain tools, keep workflows simple
4. **Handle Errors Gracefully** - Provide fallbacks when tools fail
5. **Explain Actions** - Tell users which tool you're using and why

## API Reference

See individual tool files for detailed API documentation:
- `tools/places_tool.py` - Places search and details
- `tools/routes_tool.py` - Route computation
- `tools/maps_tool.py` - Legacy map operations
- `tools/weather_tool.py` - Weather data
- `tools/currency_tool.py` - Currency conversion
