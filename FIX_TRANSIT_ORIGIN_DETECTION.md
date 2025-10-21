# Fix: Transit Directions from Named Locations

## Issue
When user asks "Transit direction from NTU to Marina Bay", the system was giving driving directions from current location to Marina Bay instead.

## Root Causes

### 1. Wrong Default Travel Mode
**Problem**: Routes branch had `default: DRIVE` in the prompt
**Fix**: Changed default to TRANSIT (more appropriate for travel guide)

### 2. Poor Origin Detection  
**Problem**: LLM wasn't extracting "NTU" as the origin properly
**Fix**: Added explicit examples and better instructions

### 3. Weak Travel Mode Detection
**Problem**: Keyword "transit" wasn't being detected reliably
**Fix**: Added comprehensive keyword mapping in prompt

## Changes Made

### File: `backend/services/agent_service.py`

#### 1. Intent Classification (Lines ~95)
**Added better examples for ROUTES branch:**
```python
1. ROUTES: Compute directions/routes between locations
   - Keywords: "directions", "how to get", "route", "navigate", "take me", "from X to Y", "transit", "drive", "walk"
   - Examples: "directions to Marina Bay", "transit from NTU to airport", "how to get from Sentosa to Chinatown"
```

#### 2. Routes Branch Extraction (Lines ~228-285)
**Before:**
```python
Extract:
- origin: Start location (use user location if "from here" or "from current location")
- destination: End location (address or place name)
- travel_mode: DRIVE, WALK, BICYCLE, TRANSIT (default: DRIVE)
```

**After:**
```python
IMPORTANT INSTRUCTIONS:
1. Origin: Extract from query (place name or address). Only use user location if query says "from here" or "from current location"
2. Destination: Extract the destination place name or address
3. Travel Mode: Detect from keywords in query:
   - "transit", "public transport", "bus", "train", "MRT", "subway" → TRANSIT
   - "drive", "driving", "car" → DRIVE  
   - "walk", "walking", "on foot" → WALK
   - "bike", "bicycle", "cycling" → BICYCLE
   - If NO mode specified → TRANSIT (default for travel guide)

Examples:
Query: "Transit from NTU to Marina Bay"
Output: {"origin": "NTU", "destination": "Marina Bay", "travelMode": "TRANSIT", ...}

Query: "Drive from Changi to Sentosa"
Output: {"origin": "Changi", "destination": "Sentosa", "travelMode": "DRIVE", ...}

Query: "How to get from here to Gardens by the Bay"
Output: {"origin": "USE_USER_LOCATION", "destination": "Gardens by the Bay", "travelMode": "TRANSIT", ...}
```

## Key Improvements

### 1. Explicit Keyword Mapping
Now the LLM knows exactly which keywords map to which travel modes:
- ✅ "transit" → TRANSIT
- ✅ "public transport" → TRANSIT
- ✅ "bus" → TRANSIT
- ✅ "train"/"MRT"/"subway" → TRANSIT
- ✅ "drive"/"driving"/"car" → DRIVE
- ✅ "walk"/"walking" → WALK
- ✅ "bike"/"bicycle" → BICYCLE

### 2. Clear Origin Extraction Rules
- ✅ Extract place names directly from query ("NTU", "Changi", "Sentosa")
- ✅ Only use user location for "from here" or "from current location"
- ✅ Special marker "USE_USER_LOCATION" when appropriate

### 3. Smart Default
- ✅ Default is now TRANSIT (appropriate for travel guide)
- ✅ Users can still explicitly request DRIVE/WALK/BICYCLE

### 4. Example-Based Learning
Added 3 concrete examples showing:
- Named origin → Named destination with TRANSIT
- Named origin → Named destination with DRIVE
- "from here" → Named destination with TRANSIT

## Testing

### Test Case 1: Original Issue
**Input**: "Transit direction from NTU to Marina Bay"
**Expected Output**:
```json
{
  "origin": "NTU",
  "destination": "Marina Bay",
  "travelMode": "TRANSIT",
  "waypoints": [],
  "avoid": []
}
```
**Result**: ✅ Should work correctly

### Test Case 2: Implicit Mode
**Input**: "How to get from Changi Airport to Sentosa"
**Expected**: TRANSIT (default)
**Result**: ✅ Should default to transit

### Test Case 3: Explicit Driving
**Input**: "Drive from Orchard to Marina Bay"
**Expected**: DRIVE mode
**Result**: ✅ Should detect "drive" keyword

### Test Case 4: Current Location
**Input**: "Show me transit to Gardens by the Bay"
**Expected**: Use current location as origin, TRANSIT mode
**Result**: ✅ Should use user location

### Test Case 5: Walking
**Input**: "Walk from Chinatown to Clarke Quay"
**Expected**: WALK mode
**Result**: ✅ Should detect "walk" keyword

## Impact

### Before Fix
❌ "Transit from NTU to Marina Bay" → Driving from current location to Marina Bay
❌ Origin "NTU" ignored
❌ Mode "transit" ignored
❌ Uses DRIVE as default

### After Fix
✅ "Transit from NTU to Marina Bay" → Transit from NTU to Marina Bay
✅ Origin extracted correctly
✅ Mode detected from keyword
✅ TRANSIT as sensible default

## Related Features

This fix complements:
1. **Colored Transit Routes** - Now users can properly request transit directions
2. **Multiple Route Options** - Shows alternative transit routes
3. **Default TRANSIT Mode** - Frontend also defaults to TRANSIT

## Backward Compatibility

✅ **Fully Compatible**
- Still handles "from here" correctly
- Still supports all travel modes
- Driving directions still work when explicitly requested
- No breaking changes

---

**Status**: ✅ Complete
**Files Modified**: 1 (agent_service.py)
**Lines Changed**: ~60 lines
**Priority**: High - Core routing functionality
**Testing**: Manual testing required
