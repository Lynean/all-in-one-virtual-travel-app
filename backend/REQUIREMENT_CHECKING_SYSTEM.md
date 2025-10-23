# Requirement Checking System

## Overview
The requirement checking system validates whether sufficient information has been gathered before executing expensive app actions (checklist, itinerary, budget). This prevents generic/incomplete outputs and creates a better conversational UX.

## Architecture

### Flow Integration
The requirement checking happens in **Phase 2** of the multi-phase agent workflow:

1. **Phase 1**: Intent Classification - Determines which branches to enable
2. **Phase 2**: Requirement Checking - Validates if app action branches have sufficient info
3. **Phase 3**: Clarification Collection - Asks user for additional info if needed
4. **Phase 4**: Branch Execution - Executes enabled branches
5. **Phase 5**: Result Aggregation - Combines results and adds requirement status to metadata

### Key Methods

#### `_check_requirements_for_action(action_type, message, persistent_ctx, context)`
Router method that delegates to specific requirement checkers based on action type.

**Parameters:**
- `action_type`: "CHECKLIST", "ITINERARY", or "BUDGET"
- `message`: Current user message
- `persistent_ctx`: Session's persistent context with extracted info
- `context`: Current request context (location, etc.)

**Returns:**
```python
{
    "ready": bool,           # True if all requirements met
    "missing": [str],        # List of missing required fields
    "has": [str],           # List of present required fields
    "follow_up": str        # Suggested follow-up question
}
```

#### `_check_checklist_requirements(message, persistent_ctx, context)`
Validates checklist requirements using LLM analysis.

**Required Fields:**
- `destination`: Where the user is going
- `current_location`: Where the user is departing from
- `trip_duration`: Length of trip (days/weeks)
- `num_travelers`: Number of people (default 1)

**Optional Fields:**
- `accommodation`: Type of lodging
- `interests`: Activities/preferences
- `dietary_restrictions`: Food requirements

**LLM Prompt:** Analyzes conversation to extract structured data and determine if checklist can be generated.

#### `_check_itinerary_requirements(message, persistent_ctx, context)`
Validates itinerary requirements using LLM analysis.

**Required Fields:**
- `destinations`: List of places to visit (can be multiple)
- `interests`: User preferences (minimum 2 for meaningful itinerary)
- `trip_duration`: Number of days

**Optional Fields:**
- `travel_preference`: Car/public transport/walking
- `max_radius_km`: Distance willing to travel (default 10km)

**LLM Prompt:** Extracts destinations, interests, and duration from conversation context.

#### `_check_budget_requirements(message, persistent_ctx, context)`
Validates budget requirements using LLM analysis.

**Required Fields:**
- `total_budget`: Overall trip budget amount
- `destinations`: Places to visit
- `current_location`: Departure point

**Optional Fields:**
- `dietary_preference`: Food choices
- `specific_places`: Specific venues to include

**LLM Prompt:** Determines if budget breakdown can be created with available info.

#### `_execute_requirement_check(prompt)`
Executes the LLM prompt for requirement validation.

**Returns:** Parsed JSON response from LLM with requirement check results.

## Response Metadata

### Requirement Status Structure
Every chat response now includes `requirements_status` in metadata:

```json
{
  "metadata": {
    "model": "gemini-2.5-flash",
    "phase": "complete",
    "branches_executed": ["TEXT"],
    "requirements_status": {
      "checklist": {
        "ready": false,
        "missing": ["trip_duration", "num_travelers"],
        "has": ["destination", "current_location"]
      },
      "itinerary": {
        "ready": true,
        "missing": [],
        "has": ["destinations", "interests", "trip_duration"]
      }
    }
  }
}
```

## Behavior

### Auto-Disabling App Actions
When requirements are not met:
1. The app action branch is **disabled** (branch.enabled = False)
2. If no branches remain enabled, a **TEXT branch is added** for conversational follow-up
3. The AI asks follow-up questions to gather missing information
4. Frontend receives `requirements_status` showing what's missing

### Example Flow

**User:** "I want to visit Japan"

**Response:**
- Checklist branch disabled (missing: duration, pax)
- TEXT branch enabled
- Message: "That sounds exciting! How long are you planning to visit Japan for, and will you be traveling alone or with others?"
- Metadata shows missing requirements

**User:** "2 weeks with my partner"

**Response:**
- Checklist branch still disabled (now has duration and pax, but needs current location)
- TEXT branch enabled
- Message: "Great! Where will you be traveling from?"

**User:** "From New York"

**Response:**
- Checklist branch **ENABLED** (all requirements met)
- Checklist created with categories
- Metadata shows all requirements satisfied

## Future Enhancements

### Explicit Execution Triggers
Currently, app actions auto-execute when requirements are met. Future enhancement:

```python
# Detect explicit triggers in user message
execute_app_actions = await self._detect_execution_trigger(message)

# Only execute if explicitly requested
if execute_app_actions and req_result["ready"]:
    # Execute app action
```

**Trigger Examples:**
- "create the checklist now"
- "generate my itinerary"
- "show me the budget breakdown"
- "make my trip plan"

### Frontend UI
Display requirement progress:

```
✅ Destination: Japan
✅ Duration: 2 weeks
✅ Travelers: 2 people
❌ Current Location: Not specified

[Ready to create checklist? Add departure location]
```

### localStorage Session Management
Frontend should:
1. Create session on app load
2. Store session_id in localStorage
3. Include session_id in all chat requests
4. Clear session on explicit user action (e.g., "start over")

## Testing

### Test Cases

#### 1. Insufficient Information
```
User: "I want to travel"
Expected: TEXT branch only, requirements_status shows missing fields
```

#### 2. Gradual Information Gathering
```
User: "Plan a trip to Paris"
Response: Asks for duration and travelers
User: "5 days, solo"
Response: Asks for departure location
User: "From London"
Response: Checklist created (all requirements met)
```

#### 3. Complete Information Upfront
```
User: "I'm flying from NYC to Tokyo for 10 days with my wife"
Expected: Checklist created immediately (all requirements present)
```

#### 4. Multiple Action Types
```
User: "Create an itinerary and budget for my Rome trip"
Expected: 
- Itinerary asks for interests and duration
- Budget asks for total budget amount
- Both track requirements separately
```

## Configuration

### Adjusting Requirements
To modify required/optional fields, edit the LLM prompts in each `_check_*_requirements()` method:

```python
# Add new required field
REQUIRED:
- new_field: Description of the field

# Add new optional field
OPTIONAL:
- new_field: Description (with default value)
```

### Disabling Requirement Checking
To disable for testing:

```python
# In process_message, after Phase 1:
execute_app_actions = True  # Always execute
requirements_status = {}    # Skip checking

# Comment out the requirement checking loop
```

## Dependencies
- `ChatGoogleGenerativeAI` (Gemini LLM)
- `json` module for parsing
- `logger` for debugging
- Session `persistent_context` for extracted info
- `BranchDecision` model for branch management

## Code Location
File: `services/agent_service.py`
Lines: ~870-1050 (requirement checking methods)
Lines: ~1190-1240 (Phase 2 integration in process_message)
