# Default Travel Mode Changed to TRANSIT

## Summary
Changed the default travel mode from `DRIVE` to `TRANSIT` throughout the application.

## Changes Made

### 1. MapView.tsx (3 locations)

#### Line 396 - Agent Map Actions Handler
```typescript
// Before:
action.data.travelMode || action.data.travel_mode || 'DRIVE'

// After:
action.data.travelMode || action.data.travel_mode || 'TRANSIT'
```

#### Line 480 - showDirectionsFromAgent Function
```typescript
// Before:
travelMode: string = 'DRIVE'

// After:
travelMode: string = 'TRANSIT'
```

#### Line 605 - showDirections Function
```typescript
// Before:
travelMode: string = 'DRIVE'

// After:
travelMode: string = 'TRANSIT'
```

### 2. routesApi.ts (3 locations)

#### Line 201 - computeRoutes Function
```typescript
// Before:
const travelMode = request.travelMode || TravelMode.DRIVE;

// After:
const travelMode = request.travelMode || TravelMode.TRANSIT;
```

#### Line 314 - computeRouteMatrix Function
```typescript
// Before:
const travelMode = request.travelMode || TravelMode.DRIVE;

// After:
const travelMode = request.travelMode || TravelMode.TRANSIT;
```

#### Line 427 - convertTravelMode Function
```typescript
// Before:
default:
  return TravelMode.DRIVE;

// After:
default:
  return TravelMode.TRANSIT;
```

## Impact

### User Experience
- **Before**: Users asking "how do I get to X" would see driving directions by default
- **After**: Users will see public transit directions by default (more appropriate for travel guide)

### When Transit is Used
1. User asks for directions without specifying mode
2. Backend/agent doesn't specify a travel mode
3. API call doesn't include travelMode parameter

### Example Queries (Now Default to Transit)
- "Show me directions to the airport"
- "How do I get to Times Square?"
- "Navigate to Changi Airport"
- "Get me to Marina Bay Sands"

### When Other Modes Are Used
The following explicit modes still work:
- **DRIVE**: "Show me driving directions to..."
- **WALK**: "Show me walking directions to..."
- **BICYCLE**: "Show me biking directions to..."
- **TWO_WHEELER**: "Show me motorcycle directions to..."

The agent can still specify these modes, and they will override the default.

## Rationale

### Why Transit as Default?
1. **Travel Context**: This is a "Virtual Travel Guide" - tourists typically use public transit
2. **Rich Visualizations**: Our new colored transit segments show off the app's capabilities
3. **Multiple Options**: Transit routes with alternatives give users choices
4. **Sustainability**: Encourages public transportation over driving
5. **Cost Information**: Transit shows fares, helping budget-conscious travelers

### Previous State
- Default was DRIVE (inherited from general mapping apps)
- Not ideal for travel guide use case
- Missed opportunity to showcase transit features

## Testing

### Test Scenarios

#### Scenario 1: Generic Direction Query
```
User: "How do I get to the airport?"
Expected: Transit directions with colored segments
```

#### Scenario 2: Explicit Driving
```
User: "Show me driving directions to the mall"
Expected: DRIVE mode with single colored polyline
```

#### Scenario 3: Backend Route Action (No Mode Specified)
```json
{
  "type": "route",
  "data": {
    "origin": "Times Square",
    "destination": "JFK Airport"
  }
}
```
Expected: Transit mode used (default)

## Backward Compatibility

✅ **Fully Compatible**
- Existing code that explicitly specifies travel mode continues to work
- Only affects cases where travel mode is omitted/undefined
- No breaking changes to API

## Files Not Changed

The following files still have DRIVE examples (intentionally left):
- `routesApiExamples.ts` - These are explicit examples showing different modes
- Backend agent logic - Should specify mode based on user intent

## Deployment Notes

- **No database changes required**
- **No API changes required**
- **Client-side only changes**
- Users will see the change immediately after refresh

---

**Status**: ✅ Complete
**Date**: October 20, 2025
**Priority**: Medium - Improves UX for primary use case
**Breaking Changes**: None
