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

### Normal Messages (No Execution Trigger)
For any normal user message, the system:
1. **Always checks requirements** for each app action type
2. **Never executes** the app action
3. Returns **TEXT response** with:
   - Requirement status in metadata
   - Follow-up questions to gather missing info
   - Confirmation that requirements are met (if ready)

**Example:**
```
User: "I'm planning a trip to Japan for 2 weeks with my partner from NYC"

Response:
- TEXT branch executed
- Message: "Great! I have all the information needed to create your Japan checklist. 
           When you're ready, just say 'create the checklist' and I'll generate it for you."
- Metadata shows: requirements_status.checklist.ready = true
- NO checklist created yet
```

### Execution Trigger Messages
When user sends a message with an execution trigger, the system:
1. Detects the trigger phrase
2. Checks requirements for the requested action
3. **Executes the app action** if requirements are met
4. Returns TEXT guidance if requirements are missing

**Execution Trigger Phrases:**
- Checklist: "create the checklist", "generate my checklist", "make the checklist"
- Itinerary: "create the itinerary", "plan my days", "generate my itinerary"  
- Budget: "create the budget", "show me the budget", "breakdown the budget"
- General: "create it now", "go ahead", "proceed", "execute", "show me"

**Example:**
```
User: "create the checklist now"

Response (if requirements met):
- CHECKLIST branch executed
- Checklist created with categories
- Message: "Here's your Japan travel checklist!"

Response (if requirements missing):
- TEXT branch executed
- Message: "I need a few more details: Where are you traveling from? How long will you be there?"
- Metadata shows missing fields
```

### Auto-Disabling App Actions
For **all messages** (with or without triggers):
- App action branches are checked for requirements
- If execution trigger NOT present → branch disabled (TEXT response)
- If execution trigger present BUT requirements missing → branch disabled (TEXT response with guidance)
- If execution trigger present AND requirements met → branch enabled (app action executed)

### Example Flow

**User:** "I want to visit Japan"

**Response:**
- No execution trigger detected
- Checklist branch disabled (missing: duration, pax, current_location)
- TEXT branch enabled
- Message: "That sounds exciting! How long are you planning to visit Japan for, and will you be traveling alone or with others?"
- Metadata: `requirements_status.checklist.ready = false`

---

**User:** "2 weeks with my partner"

**Response:**
- No execution trigger detected
- Checklist branch disabled (missing: current_location)
- TEXT branch enabled
- Message: "Perfect! Where will you be traveling from?"
- Metadata: `requirements_status.checklist.missing = ["current_location"]`

---

**User:** "From New York"

**Response:**
- No execution trigger detected
- All requirements met!
- TEXT branch enabled
- Message: "Excellent! I have all the details needed. Your trip: 2 weeks in Japan with your partner, departing from New York. Would you like me to create your checklist? Just say 'create the checklist'!"
- Metadata: `requirements_status.checklist.ready = true`

---

**User:** "create the checklist"

**Response:**
- Execution trigger detected ✅
- Requirements met ✅
- CHECKLIST branch **ENABLED** and executed
- Checklist created with custom categories
- Message: "Here's your personalized Japan travel checklist for 2 people traveling for 2 weeks!"
- Metadata: `requirements_status.checklist.ready = true`

## Future Enhancements

### More Execution Triggers
Add context-aware triggers:

```python
# Implicit confirmations
"yes, create it"
"sounds good"
"that works"
"perfect, let's do it"

# Action-specific variations
"I'm ready for the checklist"
"show me what I need to pack"
"what should my itinerary look like"
```

### Requirement Progress UI
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

### Testing

#### Test Cases

#### 1. Normal Message Without Trigger
```
User: "I want to travel"
Expected: 
- No execution trigger detected
- TEXT branch only
- requirements_status shows missing fields
- Message asks for destination, duration, etc.
- NO app action created
```

#### 2. Complete Info Without Trigger
```
User: "I'm flying from NYC to Tokyo for 10 days with my wife"
Expected:
- No execution trigger detected
- TEXT branch only
- requirements_status.checklist.ready = true
- Message: "I have all the info! Say 'create the checklist' when ready."
- NO app action created
```

#### 3. Execution Trigger With Complete Info
```
User: "create the checklist"
Expected:
- Execution trigger detected ✅
- Requirements met ✅
- CHECKLIST branch executes
- Checklist created
- requirements_status.checklist.ready = true
```

#### 4. Execution Trigger Without Complete Info
```
User: "create the checklist" (but missing destination)
Expected:
- Execution trigger detected ✅
- Requirements NOT met ❌
- TEXT branch only
- Message: "I need more info: Where are you traveling?"
- NO app action created
```

#### 5. Gradual Information Gathering
```
User: "Plan a trip to Paris"
Response: TEXT - "How long and with whom?"

User: "5 days, solo"
Response: TEXT - "Where are you traveling from?"

User: "From London"  
Response: TEXT - "Perfect! Ready to create your checklist? Say 'create the checklist'"

User: "create the checklist"
Response: CHECKLIST created ✅
```

#### 6. Multiple Action Types
```
User: "I need a checklist and itinerary for Rome"
Expected:
- No execution trigger detected
- Both requirements checked
- TEXT response asking for missing info
- NO app actions created

User: "create both" (after providing all info)
Expected:
- Execution trigger detected
- Both CHECKLIST and ITINERARY created
```
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

### Execution Trigger Phrases
Modify `_detect_execution_trigger()` method to add/remove trigger phrases:

```python
triggers = [
    # Add your custom triggers here
    "let's create it",
    "I'm ready",
    "build it for me",
]
```

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

### Disabling Execution Triggers
To revert to auto-execution (execute when requirements met):

```python
# In process_message, Phase 2:
execute_app_actions = True  # Always execute if requirements met

# Or comment out trigger detection:
# execute_app_actions = self._detect_execution_trigger(message)
```

## Code Location
File: `services/agent_service.py`
- Lines ~62-115: `_detect_execution_trigger()` method
- Lines ~117-280: Requirement checking methods (_check_requirements_for_action, etc.)
- Lines ~1240-1295: Phase 2 integration in process_message

## Dependencies
- `ChatGoogleGenerativeAI` (Gemini LLM)
- `json` module for parsing
- `logger` for debugging
- Session `persistent_context` for extracted info
- `BranchDecision` model for branch management
