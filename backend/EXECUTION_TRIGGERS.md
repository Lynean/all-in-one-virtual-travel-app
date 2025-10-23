# Execution Trigger Phrases

## Overview
App actions (checklist, itinerary, budget) only execute when the user sends a message containing one of these trigger phrases **AND** all requirements are met.

For normal messages without triggers, the system only checks requirements and provides guidance.

## Checklist Triggers
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

### Without Trigger (Normal Conversation)
```
User: "I'm planning a trip to Japan for 2 weeks"
System: 
- Checks requirements ✅
- Does NOT execute checklist ❌
- Response: "Great! I have the info. Say 'create the checklist' when ready."
```

### With Trigger (Execution)
```
User: "create the checklist"
System:
- Detects trigger ✅
- Checks requirements ✅
- Executes checklist ✅
- Response: "Here's your Japan travel checklist!"
```

### With Trigger But Missing Requirements
```
User: "create the checklist" (but destination not provided)
System:
- Detects trigger ✅
- Checks requirements ❌
- Does NOT execute checklist
- Response: "I need more info first. Where are you traveling to?"
```

## Adding Custom Triggers

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
