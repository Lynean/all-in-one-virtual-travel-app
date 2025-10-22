# Query Routing Changes After Routes Branch Removal

## How Different Queries Are Now Handled

### 🗺️ Direction/Route Queries → PLACES Branch

#### Query: "Directions to Marina Bay"
**Old Behavior** (Routes Branch):
- Routes branch extracts destination
- Returns route computation
- Frontend displays route

**New Behavior** (Places Branch):
- Places branch finds "Marina Bay" location
- Returns place information with coordinates
- Frontend displays marker on map
- **User can click "Get Directions" to calculate route**

---

#### Query: "Transit from NTU to Marina Bay"
**Old Behavior** (Routes Branch):
- Routes branch extracts: origin="NTU", dest="Marina Bay", mode="TRANSIT"
- Returns full route with steps
- Frontend displays colored route segments

**New Behavior** (Places Branch):
- Places branch finds "Marina Bay" location
- Returns place data
- Frontend shows location marker
- **User interaction triggers route calculation with:**
  - Origin: User's current location or manual selection
  - Destination: Marina Bay coordinates
  - Travel mode: User selects (TRANSIT/DRIVE/WALK/BICYCLE)

---

#### Query: "How to get from here to Gardens by the Bay"
**Old Behavior** (Routes Branch):
- Extracts: origin="USER_LOCATION", dest="Gardens by the Bay"
- Computes route
- Returns route data

**New Behavior** (Places Branch):
- Finds "Gardens by the Bay" location
- Returns place information
- **Frontend can immediately show route if user clicks directions**

---

### 🔍 Location Search Queries → PLACES Branch (Unchanged)

#### Query: "Where is NTU?"
**Behavior**: ✅ No change
- Places branch finds NTU location
- Returns coordinates and place details
- Frontend displays marker

---

#### Query: "Show me Marina Bay"
**Behavior**: ✅ No change
- Places branch finds location
- Returns place data
- Frontend displays on map

---

### 🍽️ Restaurant/Hotel Queries → PLACES Branch (Unchanged)

#### Query: "Find vegetarian restaurants near me"
**Behavior**: ✅ No change
- Places branch searches with filters
- Returns list of places
- Frontend displays markers

---

#### Query: "Pet-friendly cafes with outdoor seating"
**Behavior**: ✅ No change
- Places branch with advanced filters
- Returns matching places
- Frontend shows results

---

### ✅ Checklist Queries → CHECKLIST Branch (Unchanged)

#### Query: "Create packing list for Singapore trip"
**Behavior**: ✅ No change
- Checklist branch creates list
- Returns categorized items
- Frontend displays in Checklist tab

---

### 💬 Information Queries → TEXT Branch (Unchanged)

#### Query: "What is the weather like in Singapore?"
**Behavior**: ✅ No change
- TEXT branch provides information
- May use Weather tool
- Returns conversational response

---

## Frontend Implementation Needed

### For Direction Queries

When a direction query results in a place location, the frontend should:

1. **Display the destination** on the map with a marker
2. **Show an info window** with place details
3. **Add "Get Directions" button** in the info window
4. **On button click**:
   ```typescript
   const handleGetDirections = async (place: Place) => {
     // Use existing Routes API in frontend
     const result = await computeRoutes({
       origin: { 
         location: { 
           latLng: latLngToLocation(userLocation) 
         } 
       },
       destination: { 
         location: { 
           latLng: {
             latitude: place.location.latitude,
             longitude: place.location.longitude
           }
         } 
       },
       travelMode: TravelMode.TRANSIT, // or let user choose
       computeAlternativeRoutes: true
     });
     
     // Use existing colored route rendering
     if (result.routes && result.routes.length > 0) {
       drawColoredRouteSegments(result.routes[0]);
       setAllRoutes(result.routes);
       setSelectedRouteIndex(0);
     }
   };
   ```

### User Experience Flow

**Scenario**: User asks "Transit from NTU to Marina Bay"

1. **Agent Response**: 
   ```
   "I found Marina Bay for you! It's a popular waterfront area in Singapore. 
   Would you like directions? Click the location on the map to get transit routes."
   ```

2. **Map Display**:
   - Marker appears on Marina Bay
   - Info window shows place details
   - "Get Directions" button visible

3. **User Clicks Button**:
   - Modal/panel opens with route options:
     - Origin: Current Location / Custom
     - Mode: Transit / Drive / Walk / Bicycle
   - User confirms

4. **Route Calculation**:
   - Frontend calls Routes API directly
   - Distance validation (1000km) runs
   - Geocoding bias ensures correct locations
   - Multiple route alternatives returned

5. **Route Display**:
   - Colored segments drawn on map
   - Transit instructions panel shown
   - Route selector for alternatives
   - Walking (gray dotted) + Transit (line colors)

---

## Benefits of New Flow

### ✅ User Control
- Users can choose when to calculate routes
- Users can modify origin/destination on map
- Users can switch between travel modes easily
- Users can explore alternative routes

### ✅ Flexibility
- Direction queries don't immediately compute routes
- Users can search for multiple places first
- Users can compare locations before routing

### ✅ Performance
- Backend doesn't process complex route computations
- Frontend handles visualization natively
- Reduced API calls (routes only when needed)

### ✅ Accuracy
- Frontend has direct access to user's actual location
- No "USE_USER_LOCATION" placeholder parsing
- Distance validation prevents impossible routes
- Geocoding bias ensures correct locations

---

## Testing Scenarios

### Test 1: Direction Query
**Input**: "Directions to Marina Bay"
**Expected**:
- ✅ Agent returns place data (not route)
- ✅ Map shows Marina Bay marker
- ✅ Agent message suggests getting directions
- ❌ No route automatically displayed
- ⏸️ User must click "Get Directions" (to be implemented)

---

### Test 2: Transit Query
**Input**: "Transit from NTU to Gardens by the Bay"
**Expected**:
- ✅ Agent finds Gardens by the Bay location
- ✅ Map shows destination marker
- ✅ Agent message mentions transit option
- ❌ No route automatically calculated
- ⏸️ User chooses to get transit directions

---

### Test 3: Location Query (Should Work Same as Before)
**Input**: "Where is Sentosa?"
**Expected**:
- ✅ Agent finds Sentosa location
- ✅ Map shows marker
- ✅ Info window with details
- ✅ No change in behavior

---

### Test 4: Restaurant Query (Should Work Same as Before)
**Input**: "Find halal restaurants near Marina Bay"
**Expected**:
- ✅ Agent searches for restaurants
- ✅ Map shows multiple markers
- ✅ List of results displayed
- ✅ No change in behavior

---

## Migration Checklist

- [x] Remove routes branch from backend agent
- [x] Update intent classification to route direction queries to PLACES
- [x] Remove GoogleRoutesTool from agent tools
- [x] Keep Routes API available in frontend
- [x] Keep geocoding bias logic (1000km validation)
- [x] Keep colored route segment rendering
- [ ] Add "Get Directions" button to place info windows
- [ ] Create route options form (origin/mode selection)
- [ ] Connect frontend button to Routes API
- [ ] Test direction queries → PLACES → manual route trigger
- [ ] Update user documentation

---

**Status**: Backend Complete ✅ | Frontend Implementation Pending ⏸️
**Date**: October 20, 2025
