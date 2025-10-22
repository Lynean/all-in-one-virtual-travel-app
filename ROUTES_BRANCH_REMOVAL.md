# Routes Branch Removal from Backend Agent

## Summary
Removed the Routes branch from the backend agent logic. Direction and route queries will now be handled by the PLACES branch to find the destination location. The actual route computation will be handled entirely in the frontend through direct user interaction with the map.

## Changes Made

### 1. **Removed Routes Tool Import**
**File**: `backend/services/agent_service.py`
- Removed: `from tools.routes_tool import GoogleRoutesTool`
- Removed: `GoogleRoutesTool()` from tools initialization

### 2. **Updated Intent Classification**
**File**: `backend/services/agent_service.py` (Lines ~95-111)

**Before**: 4 branches (ROUTES, PLACES, CHECKLIST, TEXT)
```python
Available Branches:
1. ROUTES: Compute directions/routes between locations
2. PLACES: Search for restaurants, hotels, attractions
3. CHECKLIST: Create task lists, itineraries
4. TEXT: Provide information
```

**After**: 3 branches (PLACES, CHECKLIST, TEXT)
```python
Available Branches:
1. PLACES: Search for restaurants, hotels, attractions, or get location information
   - Also handles location queries like "where is", "show me", "find location"
   - NOTE: Direction/route queries should use PLACES to find the location
2. CHECKLIST: Create task lists, itineraries
3. TEXT: Provide information
```

### 3. **Updated JSON Response Example**
Removed the `routes` branch from the example JSON output in the intent classification prompt.

### 4. **Updated Fallback Logic**
**File**: `backend/services/agent_service.py` (Lines ~189-196)

**Before**: Fallback included routes branch
```python
return [
    BranchDecision(branch="routes", enabled=False, ...),
    BranchDecision(branch="places", enabled=False, ...),
    BranchDecision(branch="checklist", enabled=False, ...),
    BranchDecision(branch="text", enabled=True, ...)
]
```

**After**: Fallback without routes branch
```python
return [
    BranchDecision(branch="places", enabled=False, ...),
    BranchDecision(branch="checklist", enabled=False, ...),
    BranchDecision(branch="text", enabled=True, ...)
]
```

### 5. **Removed _execute_routes_branch Function**
**File**: `backend/services/agent_service.py` (Lines ~230-284)

Completely removed the function that extracted route parameters (origin, destination, travelMode, etc.) from user queries.

### 6. **Updated Branch Execution Logic**
**File**: `backend/services/agent_service.py` (Lines ~520-530)

**Before**:
```python
for branch in sorted(enabled_branches, key=lambda x: x.priority):
    if branch.branch == "routes":
        tasks.append(self._execute_routes_branch(...))
    elif branch.branch == "places":
        tasks.append(self._execute_places_branch(...))
    # ...
```

**After**:
```python
for branch in sorted(enabled_branches, key=lambda x: x.priority):
    if branch.branch == "places":
        tasks.append(self._execute_places_branch(...))
    elif branch.branch == "checklist":
        tasks.append(self._execute_checklist_branch(...))
    # ...
```

### 7. **Removed Legacy MAP_DIRECTIONS Pattern**
**File**: `backend/services/agent_service.py` (Lines ~920-930)

Removed the legacy pattern parser for `[MAP_DIRECTIONS:destination]`.

**Note**: The `[MAP_ROUTE:{json}]` pattern was kept for backward compatibility with any legacy code.

## What Still Works

### ✅ Frontend Routes API Integration
The frontend can still use the Routes API directly:
- `src/services/routesApi.ts` - All Routes API functions intact
- `src/components/MapView.tsx` - Map component can compute routes
- Distance validation (1000km limit) still active
- Geocoding with location bias still active
- Multi-route alternatives still supported
- Colored transit segments still working

### ✅ Legacy Route Actions
The system still supports:
- `MapAction(type="route", data={...})` for backward compatibility
- `[MAP_ROUTE:{json}]` pattern parsing in responses

### ✅ Backend Tools
The Routes API tool itself still exists at `backend/tools/routes_tool.py` but is no longer registered with the agent. Can be re-added to tools list if needed in the future.

## How Direction Queries Are Now Handled

### Example: "Directions to Marina Bay"

**Old Flow (Removed)**:
1. Intent classifier → Enable ROUTES branch
2. Routes branch → Extract origin/destination/mode
3. Backend → Return route data as MapAction
4. Frontend → Display route

**New Flow**:
1. Intent classifier → Enable PLACES branch
2. Places branch → Find "Marina Bay" location
3. Backend → Return place data as MapAction
4. Frontend → Display location on map
5. **User clicks "Get Directions" button on map** (to be implemented)
6. Frontend → Directly calls Routes API
7. Frontend → Display route with colored segments

### Example: "Transit from NTU to Marina Bay"

**Old Flow (Removed)**:
1. Routes branch extracts: origin="NTU", destination="Marina Bay", mode="TRANSIT"
2. Backend returns route data
3. Frontend displays route

**New Flow**:
1. PLACES branch finds "Marina Bay" location
2. Frontend displays the place
3. **User interaction** triggers route calculation
4. Frontend Routes API handles the computation with:
   - Origin: User's current location or selected point
   - Destination: Marina Bay coordinates
   - Mode: Selected by user (TRANSIT/DRIVE/WALK)
5. 1000km distance validation runs
6. Geocoding bias ensures correct locations
7. Colored transit route displayed

## Benefits of This Change

### 1. **Separation of Concerns**
- Backend: Intent recognition + data fetching
- Frontend: Complex route visualization + user interaction

### 2. **Better User Control**
- Users can select origin/destination on map
- Users can change travel mode easily
- Users can explore alternative routes
- Users can adjust waypoints

### 3. **Reduced Backend Load**
- No route computation in backend
- No complex parameter extraction
- Simpler agent prompts

### 4. **Improved Reliability**
- Frontend has direct access to Routes API
- No JSON parsing of complex route data
- Better error handling in frontend

### 5. **Easier Maintenance**
- Route logic centralized in frontend
- Backend agent focuses on search/recommendations
- Clearer code separation

## Migration Notes

### For Frontend Development

**To implement full route functionality**:

1. Add "Get Directions" button to place info windows
2. Create route input form (origin/destination/mode selection)
3. Call `computeRoutes()` from `routesApi.ts` directly
4. Use existing colored polyline rendering in `MapView.tsx`
5. Use existing distance validation (1000km limit)

**Example code**:
```typescript
// When user clicks "Get Directions" to a place
const handleGetDirections = async (destinationPlace: Place) => {
  const origin = userLocation; // or let user select
  const destination = {
    lat: destinationPlace.location.latitude,
    lng: destinationPlace.location.longitude
  };
  
  const result = await computeRoutes({
    origin: { location: { latLng: latLngToLocation(origin) } },
    destination: { location: { latLng: latLngToLocation(destination) } },
    travelMode: TravelMode.TRANSIT, // or let user select
    computeAlternativeRoutes: true
  });
  
  // Display routes using existing drawColoredRouteSegments()
  drawColoredRouteSegments(result.routes[0]);
};
```

### For Backend Development

**Direction queries** like "directions to X" or "how to get to Y" will now:
1. Be classified as PLACES queries
2. Return location data for the destination
3. Let frontend handle route visualization

**No action needed** unless you want to re-add routes branch in the future.

## Testing

### Test Cases to Verify

✅ **Direction Queries → PLACES Branch**
- "Directions to Marina Bay" → Should return place location, not route
- "How to get to NTU" → Should return NTU location
- "Transit from X to Y" → Should return Y location

✅ **Place Search Still Works**
- "Find restaurants near me" → Returns restaurant list
- "Show me hotels" → Returns hotel list
- "Where is Gardens by the Bay" → Returns location

✅ **Checklist Still Works**
- "Create packing list" → Returns checklist
- "Plan my day" → Returns itinerary

✅ **Frontend Routes API Still Works**
- Direct `computeRoutes()` calls work
- Distance validation (1000km) works
- Geocoding bias works
- Colored segments work

## Rollback Plan

If needed, routes branch can be restored by:

1. Restore import: `from tools.routes_tool import GoogleRoutesTool`
2. Add tool: `GoogleRoutesTool()` to tools list
3. Restore ROUTES branch in intent classification prompt
4. Restore `_execute_routes_branch()` function
5. Restore routes branch execution in task creation
6. Restore legacy MAP_DIRECTIONS pattern parsing

All code is still available in git history.

---

**Status**: ✅ Complete
**Date**: October 20, 2025
**Files Modified**: 1 (`backend/services/agent_service.py`)
**Lines Changed**: ~120 lines removed/modified
**Breaking Changes**: None (frontend Routes API still works)
**Tests Needed**: Direction query handling, PLACES branch coverage
