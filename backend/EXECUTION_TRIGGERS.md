# Execution Trigger System

## Overview
The system has two modes:
1. **Normal Mode**: Extracts and returns structured requirement information as JSON
2. **Execution Mode**: Creates app actions (checklist, itinerary, budget) when triggered

## Trigger Methods

### Method 1: Text-Based Triggers
Use natural language phrases to trigger execution.

### Method 2: JSON Command (NEW)
Send a JSON object with specific app_action(s) to execute:

```json
{
  "app_action": "checklist"
}
```

or multiple actions:

```json
{
  "app_actions": ["checklist", "itinerary"]
}
```

## Response Structure

### Normal Messages (No Trigger)
When you send a normal message, the system extracts information and returns:

```json
{
  "message": "AI response text",
  "metadata": {
    "requirements_status": {
      "checklist": {
        "compulsory": {
          "desired_location": "Tokyo",
          "current_location": "New York",
          "number_of_days": "5",
          "number_of_pax": "2"
        },
        "optional": {
          "accommodation": null,
          "interests": ["food", "scenery"],
          "dietary_restrictions": null
        },
        "ready": true
      }
    }
  }
}
```

### Execution Messages (With Trigger)
When requirements are met and trigger detected:

```json
{
  "message": "Here's your Tokyo travel checklist!",
  "app_actions": [
    {
      "type": "checklist",
      "data": { ... }
    }
  ],
  "metadata": {
    "requirements_status": { ... }
  }
}
```

## Requirement Structure

### Requirement Structure

### Checklist Requirements

**Compulsory:**
- `desired_location`: Where user wants to go
- `current_location`: User's current location (from geocoding)
- `number_of_days`: How many days for the trip
- `number_of_pax`: How many people traveling

**Optional:**
- `accommodation`: Hotel/hostel/airbnb preference
- `interests`: ["food", "scenery", "amusement", "nightlife", "sea"]
- `dietary_restrictions`: "halal"/"vegetarian"/"none"

### Itinerary Requirements

**Compulsory:**
- `desired_locations`: ["place1", "place2"] - Can be multiple specific places
- `interests`: ["food", "scenery"] - MUST have at least 2
- `number_of_days`: How many days

**Optional:**
- `travel_preference`: 
  - `max_distance_km`: 10 (default)
  - `transport_mode`: "bus"/"taxi"/"rental"/"walking"
  - `max_travel_time_hours`: null
- `specific_attractions`: ["attraction1", "attraction2"]

### Budget Requirements

**Compulsory:**
- `total_budget`: Total budget amount with currency (e.g., "1000 USD")
- `desired_locations`: ["place1", "place2"]
- `current_location`: User's location (for flight cost estimation)

**Optional:**
- `dietary_preference`: "halal"/"vegetarian"/"none"
- `specific_places`: ["amusement park", "restaurant"]
- `itinerary_reference`: Can reference from created itinerary

## Text-Based Triggers

### Checklist Triggers
- "create the checklist"
- "generate the checklist"
- "make the checklist"
- "build the checklist"
- "create my checklist"
- "generate my checklist"
- "make my checklist"
- "create checklist"

## Itinerary Triggers
- "create the itinerary"
- "generate the itinerary"
- "make the itinerary"
- "build the itinerary"
- "create my itinerary"
- "generate my itinerary"
- "make my itinerary"
- "create itinerary"
- "plan my day"
- "plan my days"

## Budget Triggers
- "create the budget"
- "generate the budget"
- "make the budget"
- "build the budget"
- "create my budget"
- "generate my budget"
- "make my budget"
- "create budget"
- "show me the budget"
- "breakdown the budget"

## General Triggers
These work for any app action type:
- "create it now"
- "generate it now"
- "make it now"
- "show me"
- "let's do it"
- "go ahead"
- "proceed"
- "execute"

## How It Works

### Flow 1: Normal Conversation (Information Gathering)

```
User: "I'm planning a trip to Japan for 2 weeks"

System Response:
{
  "message": "Great! I'm gathering information for your trip. How many people will be traveling?",
  "metadata": {
    "requirements_status": {
      "checklist": {
        "compulsory": {
          "desired_location": "Japan",
          "current_location": "New York",  // from geocoding
          "number_of_days": "14",  // extracted from "2 weeks"
          "number_of_pax": null  // MISSING
        },
        "optional": { ... },
        "ready": false  // Not ready - missing pax
      }
    }
  }
}
```

---

```
User: "Just me and my wife"

System Response:
{
  "message": "Perfect! I have all the information needed. Say 'create the checklist' or send {\"app_action\": \"checklist\"} when ready.",
  "metadata": {
    "requirements_status": {
      "checklist": {
        "compulsory": {
          "desired_location": "Japan",
          "current_location": "New York",
          "number_of_days": "14",
          "number_of_pax": "2"  // NOW COMPLETE
        },
        "optional": { ... },
        "ready": true  // READY!
      }
    }
  }
}
```

### Flow 2: Execution with Text Trigger

```
User: "create the checklist"

System Response:
{
  "message": "Here's your Japan travel checklist for 2 people!",
  "app_actions": [
    {
      "type": "checklist",
      "data": {
        "title": "Japan Trip Checklist",
        "categories": [ ... ]
      }
    }
  ]
}
```

### Flow 3: Execution with JSON Command

```
User: {"app_action": "checklist"}

System Response:
{
  "message": "Here's your Japan travel checklist for 2 people!",
  "app_actions": [
    {
      "type": "checklist",
      "data": { ... }
    }
  ]
}
```

### Flow 4: Multiple Actions

```
User: {"app_actions": ["checklist", "itinerary"]}

System Response:
{
  "message": "Created your checklist and itinerary!",
  "app_actions": [
    { "type": "checklist", "data": { ... } },
    { "type": "itinerary", "data": { ... } }
  ]
}
```

### Flow 5: Trigger Without Complete Requirements

```
User: "create the checklist"
(but destination is missing)

System Response:
{
  "message": "I need more information first. Where are you planning to travel?",
  "metadata": {
    "requirements_status": {
      "checklist": {
        "compulsory": {
          "desired_location": null,  // MISSING
          "current_location": "New York",
          "number_of_days": null,
          "number_of_pax": null
        },
        "ready": false
      }
    }
  }
}
```

## Text-Based Triggers

### Checklist Triggers

Edit `services/agent_service.py`, method `_detect_execution_trigger()`:

```python
def _detect_execution_trigger(self, message: str) -> bool:
    message_lower = message.lower()
    
    triggers = [
        # Add your custom triggers here
        "I'm ready",
        "let's create it",
        "build it for me",
        "I want to see it",
    ]
    
    for trigger in triggers:
        if trigger in message_lower:
            logger.info(f"🎯 Execution trigger detected: '{trigger}'")
            return True
    
    return False
```

## Frontend Integration

### Display Trigger Hints
When requirements are met, show users what to say:

```javascript
if (metadata.requirements_status.checklist.ready) {
  showHint("✅ Ready! Say 'create the checklist' to generate it.");
}
```

### Button with Trigger
Add a button that sends the trigger phrase:

```javascript
<Button onClick={() => sendMessage("create the checklist")}>
  Create Checklist
</Button>
```

### Auto-suggest Triggers
When all requirements met, add trigger phrases to suggestions array.

## Testing Triggers

1. **Test without trigger:**
   ```
   Send: "Plan a trip to Paris for 5 days"
   Expect: TEXT response, NO app action
   ```

2. **Test with trigger:**
   ```
   Send: "create the checklist"
   Expect: Checklist created (if requirements met)
   ```

3. **Test trigger detection:**
   ```
   Look for log: "🎯 Execution trigger detected: 'create the checklist'"
   ```

4. **Test partial matches:**
   ```
   Send: "Please create the checklist for me"
   Expect: Trigger detected (contains "create the checklist")
   ```
