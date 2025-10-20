# Multi-Phase Agent Architecture

## Overview

This document describes the new **4-phase agent architecture** that replaces the simple ReAct pattern with a sophisticated, branch-based execution model.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER QUERY                               │
│  "Find restaurants near Marina Bay and show me directions"       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1: INTENT CLASSIFICATION                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  LLM analyzes query and decides which branches needed  │    │
│  │                                                         │    │
│  │  Output: BranchDecision[] with confidence scores       │    │
│  │  ✅ Routes: enabled (0.95 confidence)                  │    │
│  │  ✅ Places: enabled (0.90 confidence)                  │    │
│  │  ❌ Checklist: disabled (0.1 confidence)               │    │
│  │  ❌ Text: disabled (0.2 confidence)                    │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│            PHASE 2: CLARIFICATION COLLECTION                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Check if any enabled branch needs clarification       │    │
│  │                                                         │    │
│  │  If YES → Return ClarificationRequest[] to frontend    │    │
│  │           Show in-chat buttons for quick response      │    │
│  │           Wait for user input                          │    │
│  │                                                         │    │
│  │  If NO → Continue to Phase 3                           │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 3: BRANCH EXECUTION                           │
│                                                                  │
│  Execute enabled branches IN PARALLEL:                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   ROUTES     │  │   PLACES     │  │  CHECKLIST   │         │
│  │   BRANCH     │  │   BRANCH     │  │   BRANCH     │         │
│  │              │  │              │  │              │         │
│  │ Extract:     │  │ Extract:     │  │ Generate:    │         │
│  │ - origin     │  │ - query      │  │ - title      │         │
│  │ - destination│  │ - lat/lng    │  │ - items[]    │         │
│  │ - mode       │  │ - radius     │  │ - type       │         │
│  │ - waypoints  │  │ - price      │  │              │         │
│  │              │  │ - rating     │  │              │         │
│  │              │  │              │  │              │         │
│  │ Output:      │  │ Output:      │  │ Output:      │         │
│  │ MAP_ROUTE    │  │ MAP_SEARCH   │  │ CHECKLIST    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┴─────────────────┘                  │
│                           │                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│            PHASE 4: RESULT AGGREGATION                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Combine all branch results:                           │    │
│  │                                                         │    │
│  │  1. Collect map_actions[] from Routes & Places         │    │
│  │  2. Collect app_actions[] from Checklist               │    │
│  │  3. Generate friendly final message with LLM           │    │
│  │  4. Add helpful suggestions                            │    │
│  │                                                         │    │
│  │  Output: ChatResponse {                                │    │
│  │    message: "I found 15 restaurants and...",           │    │
│  │    map_actions: [route, search],                       │    │
│  │    app_actions: [checklist],                           │    │
│  │    suggestions: ["Filter by cuisine?"]                 │    │
│  │  }                                                      │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND RENDERING                            │
│  - Display message in chat                                       │
│  - Execute map_actions (show routes, markers)                    │
│  - Render app_actions (checklists, buttons)                      │
│  - Show suggestions as quick-reply buttons                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### BranchDecision

```python
class BranchDecision(BaseModel):
    branch: str              # "routes", "places", "checklist", "text"
    enabled: bool            # Should this branch execute?
    confidence: float        # 0.0-1.0 confidence score
    needs_clarification: bool
    clarification: Optional[ClarificationRequest]
    priority: int           # Execution order (1=highest)
    reasoning: str          # Why enabled/disabled
```

### ClarificationRequest

```python
class ClarificationRequest(BaseModel):
    branch: str                    # Which branch needs clarification
    question: str                  # Question to ask user
    type: Literal["text", "multiple_choice", "yes_no"]
    options: Optional[List[str]]   # For multiple choice
    default: Optional[str]         # Default if no response
    timeout: int                   # Seconds before using default
```

### AppAction

```python
class AppAction(BaseModel):
    type: str        # "checklist", "quick_reply", "button_group"
    data: Dict       # Action-specific data
```

### ChatResponse (Enhanced)

```python
class ChatResponse(BaseModel):
    session_id: str
    message: str
    map_actions: List[MapAction]         # Map-related actions
    app_actions: List[AppAction]         # NEW: App UI actions
    clarifications: List[ClarificationRequest]  # NEW: Needed clarifications
    suggestions: List[str]               # NEW: Helpful suggestions
    metadata: Dict
```

---

## Phase Details

### Phase 1: Intent Classification

**Purpose**: Analyze user query and decide which branches to enable

**LLM Prompt**:
```
Analyze: "Find restaurants near Marina Bay and show directions"

For each branch (routes, places, checklist, text):
- Should it be enabled?
- What's your confidence (0.0-1.0)?
- Do you need clarification?

Output JSON with branch decisions
```

**Example Output**:
```json
{
  "branches": [
    {
      "branch": "places",
      "enabled": true,
      "confidence": 0.9,
      "needs_clarification": false,
      "priority": 1
    },
    {
      "branch": "routes",
      "enabled": true,
      "confidence": 0.95,
      "needs_clarification": false,
      "priority": 2
    }
  ]
}
```

**Smart Features**:
- ✅ Enables MULTIPLE branches when needed
- ✅ Confidence scoring for uncertain queries
- ✅ Only asks for clarification when critical info missing
- ✅ Prioritizes execution order

---

### Phase 2: Clarification Collection

**Purpose**: Collect missing information from user before execution

**When to Clarify**:
- ❓ "Find restaurants" → Which cuisine? (optional)
- ❓ "Plan a trip" → Which dates? (required)
- ❓ "Find hotels" → Budget range? (optional)

**Frontend UI Example**:
```typescript
// When clarifications needed, show in-chat buttons
<div className="clarification-panel">
  <p>How would you like to travel?</p>
  <ButtonGroup>
    <Button onClick={() => respond("DRIVE")}>🚗 Drive</Button>
    <Button onClick={() => respond("WALK")}>🚶 Walk</Button>
    <Button onClick={() => respond("TRANSIT")}>🚌 Transit</Button>
  </ButtonGroup>
</div>
```

**Timeout Behavior**:
- After 30 seconds → Use default/best guess
- Continue with execution
- No blocking

---

### Phase 3: Branch Execution

**Purpose**: Execute enabled branches in parallel

#### Routes Branch

**Extract**:
- origin (from user location or query)
- destination (place name or coordinates)
- travelMode (DRIVE/WALK/BICYCLE/TRANSIT)
- waypoints (optional stops)
- avoid (tolls, highways, ferries)

**Output**: `MapAction(type="route", data={...})`

#### Places Branch

**Extract**:
- query (restaurant, hotel, cafe)
- latitude, longitude (search center)
- radius (5000/10000/50000 meters)
- priceLevel (INEXPENSIVE/MODERATE/EXPENSIVE)
- minRating (1.0-5.0)
- openNow (true/false)

**Output**: `MapAction(type="search", data={...})`

#### Checklist Branch

**Generate**:
- type (packing_list, itinerary, pre_travel)
- title
- items[] with priority levels

**Output**: `AppAction(type="checklist", data={...})`

#### Text Branch

**Generate**:
- Conversational response
- No API calls
- Informational only

**Output**: Text message only

**Parallel Execution**:
```python
# All branches execute simultaneously
results = await asyncio.gather(
    execute_routes_branch(...),
    execute_places_branch(...),
    execute_checklist_branch(...),
    return_exceptions=True
)
```

---

### Phase 4: Result Aggregation

**Purpose**: Combine all branch results into unified response

**Process**:
1. Collect `map_actions` from Routes & Places branches
2. Collect `app_actions` from Checklist branch
3. Collect text responses from Text branch
4. Generate friendly summary message with LLM
5. Add contextual suggestions

**LLM Prompt for Final Message**:
```
User asked: "Find restaurants and show directions"

Results:
- Found 15 restaurants via Places API
- Computed route via Routes API
- Created dining checklist

Generate a friendly 1-2 sentence response summarizing what you found.
```

**Example Output**:
```json
{
  "message": "I found 15 great restaurants near Marina Bay and created a route to the top-rated one. Check the map and your dining checklist!",
  "map_actions": [
    {"type": "search", "data": {"query": "restaurant", ...}},
    {"type": "route", "data": {"origin": ..., "destination": ...}}
  ],
  "app_actions": [
    {"type": "checklist", "data": {"title": "Dining Checklist", ...}}
  ],
  "suggestions": [
    "Would you like me to filter by cuisine type?",
    "Need parking info at Marina Bay?"
  ]
}
```

---

## Example Workflows

### Example 1: Simple Places Search

**User**: "Find restaurants near me"

**Phase 1**: Enable PLACES branch only
**Phase 2**: No clarification needed
**Phase 3**: Execute places branch → Extract query, location, radius
**Phase 4**: Return map_actions with search command

**Result**: Map shows restaurant markers

---

### Example 2: Complex Multi-Branch Query

**User**: "Plan my day at Marina Bay - find attractions and create an itinerary"

**Phase 1**: Enable PLACES + CHECKLIST branches
**Phase 2**: No clarification (enough context)
**Phase 3**: Execute both branches in parallel
- Places: Search for attractions at Marina Bay
- Checklist: Generate itinerary with visit times
**Phase 4**: Combine results

**Result**: Map shows attractions + checklist appears in chat

---

### Example 3: Query with Clarification

**User**: "Find hotels"

**Phase 1**: Enable PLACES branch
**Phase 2**: Needs clarification:
- "What's your budget range?"
- Options: ["$" Budget, "$$" Moderate, "$$$" Premium]
**Wait for user response**
**Phase 3**: Execute with budget constraint
**Phase 4**: Return filtered results

**Result**: Only hotels matching budget shown

---

### Example 4: Multi-Action Query

**User**: "Show me restaurants at Changi Airport and directions to get there"

**Phase 1**: Enable PLACES + ROUTES branches
**Phase 2**: No clarification needed
**Phase 3**: Execute both:
- Places: Search restaurants at Changi Airport (1.3644, 103.9915)
- Routes: Compute route from user location to airport
**Phase 4**: Combine into unified response

**Result**: Map shows route + restaurant markers at destination

---

## Frontend Integration

### Handling ChatResponse

```typescript
interface ChatResponse {
  session_id: string;
  message: string;
  map_actions: MapAction[];
  app_actions: AppAction[];          // NEW
  clarifications: ClarificationRequest[];  // NEW
  suggestions: string[];             // NEW
  metadata: any;
}

// In frontend React component
const handleResponse = (response: ChatResponse) => {
  // 1. Display message
  addMessageToChat(response.message);
  
  // 2. Handle clarifications (if any)
  if (response.clarifications.length > 0) {
    showClarificationUI(response.clarifications);
    return; // Wait for user input
  }
  
  // 3. Execute map actions
  response.map_actions.forEach(action => {
    if (action.type === 'route') {
      showRoute(action.data);
    } else if (action.type === 'search') {
      performSearch(action.data);
    }
  });
  
  // 4. Render app actions
  response.app_actions.forEach(action => {
    if (action.type === 'checklist') {
      renderChecklist(action.data);
    } else if (action.type === 'quick_reply') {
      showQuickReplyButtons(action.data);
    }
  });
  
  // 5. Show suggestions
  if (response.suggestions.length > 0) {
    showSuggestionButtons(response.suggestions);
  }
};
```

### Checklist Rendering

```typescript
const renderChecklist = (data: any) => {
  return (
    <div className="checklist-card">
      <h3>{data.title}</h3>
      <ul>
        {data.items.map((item, i) => (
          <li key={i} className={`priority-${item.priority}`}>
            <input 
              type="checkbox" 
              checked={item.checked}
              onChange={() => toggleItem(i)}
            />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
      <div className="checklist-actions">
        <button>Export PDF</button>
        <button>Share</button>
      </div>
    </div>
  );
};
```

### Clarification UI

```typescript
const ClarificationPanel = ({ clarifications, onRespond }) => {
  return (
    <div className="clarification-panel">
      {clarifications.map((clar, i) => (
        <div key={i} className="clarification-question">
          <p>{clar.question}</p>
          
          {clar.type === 'multiple_choice' && (
            <div className="button-group">
              {clar.options.map(opt => (
                <button onClick={() => onRespond(clar.branch, opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          
          {clar.type === 'yes_no' && (
            <div className="button-group">
              <button onClick={() => onRespond(clar.branch, 'yes')}>Yes</button>
              <button onClick={() => onRespond(clar.branch, 'no')}>No</button>
            </div>
          )}
          
          {clar.type === 'text' && (
            <input 
              type="text" 
              placeholder="Type your answer..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onRespond(clar.branch, e.target.value);
                }
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## Benefits Over Simple ReAct

| Feature | Old ReAct | New Multi-Phase |
|---------|-----------|-----------------|
| **Branch Execution** | Sequential tool calls | Parallel execution |
| **Clarifications** | Not supported | Interactive UI |
| **App Actions** | Not supported | Checklists, buttons |
| **Performance** | ~5-15s per query | ~2-5s (parallel) |
| **User Experience** | Black box | Transparent phases |
| **Flexibility** | Hard to extend | Easy to add branches |
| **Error Handling** | Single point of failure | Per-branch isolation |

---

## Future Enhancements

### 1. Progressive Disclosure
```python
# Show 5 results initially, load more on demand
app_actions.append({
  "type": "load_more",
  "data": {
    "initial_count": 5,
    "total_count": 50,
    "action": "load_next_5"
  }
})
```

### 2. Context Memory
```python
# Remember user preferences
context["user_preferences"] = {
  "default_travel_mode": "DRIVE",
  "budget_range": "MODERATE",
  "cuisine_preferences": ["Chinese", "Japanese"]
}
```

### 3. Multi-Step Planning
```python
# For complex queries like "Plan a day at Marina Bay"
{
  "plan": [
    {"step": 1, "branch": "route", "action": "Get there"},
    {"step": 2, "branch": "places", "action": "Find lunch"},
    {"step": 3, "branch": "places", "action": "Find attractions"},
    {"step": 4, "branch": "checklist", "action": "Create itinerary"}
  ]
}
```

### 4. Interactive Refinement
```typescript
// Allow users to refine results
<button onClick={() => refineSearch({radius: 2000})}>
  Show closer options
</button>
<button onClick={() => refineSearch({priceLevel: 'INEXPENSIVE'})}>
  Show cheaper options
</button>
```

---

## Testing Guide

### Test Case 1: Simple Query
```
Query: "Find restaurants near me"
Expected:
- Phase 1: Enable PLACES only
- Phase 3: Execute places branch
- Phase 4: Return map_actions with search
```

### Test Case 2: Multi-Branch
```
Query: "Find hotels at Marina Bay and show directions"
Expected:
- Phase 1: Enable PLACES + ROUTES
- Phase 3: Both execute in parallel
- Phase 4: Return both map_actions
```

### Test Case 3: Checklist
```
Query: "Create a packing list for Singapore trip"
Expected:
- Phase 1: Enable CHECKLIST only
- Phase 3: Generate checklist
- Phase 4: Return app_actions with checklist
```

### Test Case 4: Clarification
```
Query: "Find hotels"
Expected:
- Phase 1: Enable PLACES
- Phase 2: Return clarification for budget
- Frontend: Show buttons, wait for response
```

---

## Advanced Features

### Places API - 70+ Fields & 150+ Types
The Places branch now supports **advanced filtering** with Google's Places API (New):

**Dietary Restrictions:**
- `servesVegetarianFood`, `servesBreakfast`, `servesBrunch`, `servesLunch`, `servesDinner`
- `servesBeer`, `servesWine`, `servesCocktails`, `servesCoffee`, `servesDessert`

**Atmosphere & Amenities:**
- `goodForChildren`, `goodForGroups`, `allowsDogs`, `outdoorSeating`, `liveMusic`
- `reservable`, `takeout`, `delivery`, `dineIn`, `curbsidePickup`, `restroom`, `parking`

**Accessibility:**
- `accessibilityOptions` - Wheelchair accessible, disabled access

**Example Queries:**
```javascript
// Complex dietary + atmosphere query
"Find vegetarian restaurants with outdoor seating, good for kids, open now"
→ {
  servesVegetarianFood: true,
  outdoorSeating: true,
  goodForChildren: true,
  openNow: true
}

// Pet-friendly with amenities
"Dog-friendly cafes with parking"
→ {
  allowsDogs: true,
  parking: true,
  includedTypes: ["cafe"]
}
```

**📚 See Full Documentation:**
- `backend/PLACES_API_ADVANCED_FEATURES.md` - Complete guide with 150+ place types
- `backend/test_advanced_places.py` - Test suite for advanced features

---

## Conclusion

The multi-phase architecture provides a **robust, scalable, and user-friendly** system that:
- ✅ Executes branches in parallel for better performance
- ✅ Handles complex multi-action queries elegantly
- ✅ Provides interactive clarifications when needed
- ✅ Supports rich app actions (checklists, buttons)
- ✅ **Supports 70+ place fields & 150+ place types** (NEW!)
- ✅ Is easy to extend with new branches
- ✅ Gives users transparency into the process

This is a significant improvement over the simple ReAct pattern! 🚀
