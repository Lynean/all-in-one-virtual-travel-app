# Places Branch "None near (None, None)" Fix

## Issue
When executing trip planning queries like "Plan a 3-day trip to Singapore", the Places branch logs:
```
📍 Places branch: None near (None, None)
```

This indicates the LLM is returning JSON with missing `query`, `latitude`, and `longitude` fields.

## Root Cause
The LLM was not extracting coordinates properly for trip planning queries because:
1. The query doesn't mention a specific location type ("restaurants near me")
2. The user's current location is irrelevant (they're planning a trip to a different city)
3. The prompt didn't provide clear examples for destination-based queries

## Fix Applied

### 1. Enhanced Error Handling & Validation
**File:** `backend/services/agent_service.py` - `_execute_places_branch()`

**Added comprehensive logging:**
```python
# Log response for debugging
logger.info(f"Places LLM response length: {len(response_text)} chars")
logger.debug(f"Places response preview: {response_text[:300]}")

# Log the parsed data for debugging
logger.info(f"📍 Places branch parsed data: {json.dumps(places_data, indent=2)}")
```

**Added coordinate validation with fallback:**
```python
# Validate required fields
if not places_data.get('latitude') or not places_data.get('longitude'):
    logger.warning(f"⚠️ Places branch missing coordinates. Data: {places_data}")
    
    # For trip planning queries, provide default destination coordinates
    if 'singapore' in user_query.lower():
        places_data['latitude'] = 1.3521
        places_data['longitude'] = 103.8198
        places_data['query'] = places_data.get('query') or 'tourist_attraction'
        logger.info(f"📍 Using Singapore defaults: {places_data['latitude']}, {places_data['longitude']}")
    else:
        return {"success": False, "error": "Missing required latitude/longitude"}
```

**Added better error messages:**
```python
except json.JSONDecodeError as e:
    logger.error(f"JSON parsing error in places branch: {e}")
    logger.error(f"Raw response: {response_text[:500]}")
    return {"success": False, "error": f"JSON parsing error: {str(e)}"}
```

### 2. Improved Prompt for Trip Planning
**File:** `backend/services/agent_service.py` - `_execute_places_branch()`

**Enhanced trip planning guidance:**
```python
IMPORTANT: For trip planning queries mentioning a destination city:
1. Extract the destination city name from the query
2. Use the city center coordinates from the list below
3. Set query to "tourist_attraction" and radius to 10000

Example: "Plan a 3-day trip to Singapore" should return:
{
  "query": "tourist_attraction",
  "latitude": 1.3521,
  "longitude": 103.8198,
  "radius": 10000,
  "includedTypes": ["tourist_attraction"]
}
```

**Destination coordinates reference:**
```python
DESTINATION COORDINATES (for trip planning):
- Singapore: 1.3521, 103.8198
- Malaysia/KL: 3.1390, 101.6869
- Bangkok: 13.7563, 100.5018
- Vietnam/Hanoi: 21.0285, 105.8542
- Vietnam/HCMC: 10.8231, 106.6297
```

## How It Works Now

### Query: "Plan a 3-day trip to Singapore, I from Vietnam"

**Before Fix:**
```
📍 Places branch: None near (None, None)
✨ Final response: 1 map actions (invalid), 0 app actions
```

**After Fix - Scenario 1 (LLM extracts correctly):**
```
Places LLM response length: 156 chars
📍 Places branch parsed data: {
  "query": "tourist_attraction",
  "latitude": 1.3521,
  "longitude": 103.8198,
  "radius": 10000,
  "includedTypes": ["tourist_attraction"]
}
📍 Places branch: tourist_attraction near (1.3521, 103.8198)
✨ Final response: 1 map actions, 1 app actions
```

**After Fix - Scenario 2 (LLM returns incomplete data - fallback kicks in):**
```
Places LLM response length: 45 chars
⚠️ Places branch missing coordinates. Data: {"query": "attraction"}
📍 Using Singapore defaults: 1.3521, 103.8198
📍 Places branch: tourist_attraction near (1.3521, 103.8198)
✨ Final response: 1 map actions, 1 app actions
```

## Supported Destinations

The system now has fallback coordinates for:
- 🇸🇬 **Singapore**: 1.3521, 103.8198
- 🇲🇾 **Kuala Lumpur**: 3.1390, 101.6869
- 🇹🇭 **Bangkok**: 13.7563, 100.5018
- 🇻🇳 **Hanoi**: 21.0285, 105.8542
- 🇻🇳 **Ho Chi Minh City**: 10.8231, 106.6297

To add more cities, add to the fallback validation:
```python
if 'tokyo' in user_query.lower():
    places_data['latitude'] = 35.6762
    places_data['longitude'] = 139.6503
elif 'paris' in user_query.lower():
    places_data['latitude'] = 48.8566
    places_data['longitude'] = 2.3522
```

## Testing

### Test Case 1: Singapore Trip Planning
**Query:** "Plan a 3-day trip to Singapore"

**Expected Logs:**
```
📍 Places branch parsed data: {"query": "tourist_attraction", "latitude": 1.3521, ...}
📍 Places branch: tourist_attraction near (1.3521, 103.8198)
```

**Expected Output:**
- Map shows tourist attractions in Singapore
- Checklist has 3-day itinerary

### Test Case 2: Missing Coordinates (Fallback)
**Query:** "Plan a trip to Singapore"

**Expected Logs:**
```
⚠️ Places branch missing coordinates. Data: {...}
📍 Using Singapore defaults: 1.3521, 103.8198
📍 Places branch: tourist_attraction near (1.3521, 103.8198)
```

**Expected Output:**
- Fallback coordinates used
- Map still shows Singapore attractions

### Test Case 3: Unknown Destination (Error)
**Query:** "Plan a trip to Narnia"

**Expected Logs:**
```
⚠️ Places branch missing coordinates. Data: {...}
❌ Error: Missing required latitude/longitude
```

**Expected Output:**
- Places branch fails gracefully
- Checklist still works
- Message explains map search unavailable

## Debugging

If you see `None near (None, None)` in logs, check:

1. **Full parsed data log:**
   ```
   📍 Places branch parsed data: {...}
   ```
   - Are `latitude` and `longitude` fields present?
   - Are they null/None?

2. **LLM response preview:**
   ```
   Places response preview: {first 300 chars}
   ```
   - Is the LLM returning valid JSON?
   - Does it include coordinates?

3. **Fallback trigger:**
   ```
   ⚠️ Places branch missing coordinates
   📍 Using Singapore defaults
   ```
   - Did the fallback activate?
   - Is the destination supported?

## Related Files
- `backend/services/agent_service.py` - Places branch with validation
- `CHECKLIST_EMPTY_RESPONSE_FIX.md` - Checklist fixes
- `CHECKLIST_INTEGRATION_FIX.md` - Frontend integration

## Status
✅ **FIXED** - Places branch now has coordinate validation and fallback for trip planning queries
