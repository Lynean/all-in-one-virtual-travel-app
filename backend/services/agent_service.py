import logging
import uuid
import json
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config import settings
from services.redis_service import RedisService
from tools.weather_tool import WeatherTool
from tools.currency_tool import CurrencyTool
from models.responses import (
    ChatResponse, MapAction, AppAction, 
    ClarificationRequest, BranchDecision
)

logger = logging.getLogger(__name__)


class AgentService:
    """Main service for LangChain agent operations with Gemini"""
    
    def __init__(self, redis_service: RedisService):
        self.redis = redis_service
        self._memory_sessions: Dict[str, Dict[str, Any]] = {}  # In-memory fallback
        self.llm = self._initialize_llm()
        self.tools = self._initialize_tools()
        # Legacy agent executor - not used in new multi-phase architecture
        self.agent_executor = None
    
    def _initialize_llm(self) -> ChatGoogleGenerativeAI:
        """Initialize Gemini LLM"""
        try:
            return ChatGoogleGenerativeAI(
                model=settings.primary_model,
                temperature=0.1,  # Lower temperature for more consistent formatting
                max_output_tokens=settings.max_tokens,
                google_api_key=settings.gemini_api_key,
                convert_system_message_to_human=True,  # Gemini compatibility
                timeout=30,  # 30 second timeout for API calls
                max_retries=2,  # Retry only twice to avoid long waits
                safety_settings={
                    "HARASSMENT": "BLOCK_NONE",
                    "HATE_SPEECH": "BLOCK_NONE", 
                    "SEXUALLY_EXPLICIT": "BLOCK_NONE",
                    "DANGEROUS_CONTENT": "BLOCK_NONE"
                }
            )
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {str(e)}")
            raise
    
    def _initialize_tools(self) -> List:
        """Initialize all agent tools"""
        return [
            # Weather and travel info
            WeatherTool(),
            CurrencyTool()
        ]
    
    def _detect_execution_trigger(self, message: str) -> Dict[str, Any]:
        """
        Detect if user wants to explicitly execute app actions
        Can be either text-based trigger or JSON command
        
        Args:
            message: User message (can be text or JSON)
            
        Returns:
            {
                "execute": bool,
                "actions": ["checklist", "itinerary", "budget"] or None,
                "format": "text" or "json"
            }
        """
        
        # First, try to parse as JSON
        try:
            if message.strip().startswith('{'):
                data = json.loads(message)
                
                # Check if it's a special execution command
                if "app_action" in data or "app_actions" in data:
                    actions = data.get("app_action") or data.get("app_actions")
                    if isinstance(actions, str):
                        actions = [actions]
                    
                    logger.info(f"🎯 JSON execution command detected: {actions}")
                    return {
                        "execute": True,
                        "actions": actions,
                        "format": "json"
                    }
        except json.JSONDecodeError:
            pass  # Not JSON, check text triggers
        
        # Check text-based triggers
        message_lower = message.lower()
        
        # Execution trigger phrases
        triggers = [
            "create the checklist",
            "generate the checklist",
            "make the checklist",
            "build the checklist",
            "create my checklist",
            "generate my checklist",
            "make my checklist",
            "create checklist",
            
            "create the itinerary",
            "generate the itinerary",
            "make the itinerary",
            "build the itinerary",
            "create my itinerary",
            "generate my itinerary",
            "make my itinerary",
            "create itinerary",
            "plan my day",
            "plan my days",
            
            "create the budget",
            "generate the budget",
            "make the budget",
            "build the budget",
            "create my budget",
            "generate my budget",
            "make my budget",
            "create budget",
            "show me the budget",
            "breakdown the budget",
            
            # General execution triggers
            "create it now",
            "generate it now",
            "make it now",
            "show me",
            "let's do it",
            "go ahead",
            "proceed",
            "execute"
        ]
        
        for trigger in triggers:
            if trigger in message_lower:
                logger.info(f"🎯 Text execution trigger detected: '{trigger}'")
                
                # Determine which action based on trigger
                actions = []
                if "checklist" in trigger:
                    actions = ["checklist"]
                elif "itinerary" in trigger or "day" in trigger:
                    actions = ["itinerary"]
                elif "budget" in trigger:
                    actions = ["budget"]
                else:
                    actions = None  # General trigger, execute all enabled
                
                return {
                    "execute": True,
                    "actions": actions,
                    "format": "text"
                }
        
        return {
            "execute": False,
            "actions": None,
            "format": "text"
        }
    
    # ==================== REQUIREMENT CHECKING SYSTEM ====================
    
    async def _check_requirements_for_action(
        self,
        action_type: str,
        user_query: str,
        persistent_context: Dict[str, Any],
        current_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract and return structured information for app actions
        Returns JSON object showing compulsory and optional fields with extracted values
        """
        
        if action_type == "CHECKLIST":
            return await self._extract_checklist_info(user_query, persistent_context, current_context)
        elif action_type == "ITINERARY":
            return await self._extract_itinerary_info(user_query, persistent_context, current_context)
        elif action_type == "BUDGET":
            return await self._extract_budget_info(user_query, persistent_context, current_context)
        
        return {"error": "unknown action type"}
    
    async def _extract_checklist_info(
        self, 
        user_query: str, 
        persistent_ctx: Dict[str, Any], 
        current_ctx: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract checklist information from context and query
        Returns structured JSON with compulsory and optional fields
        """
        
        prompt = f"""Extract travel checklist information from the conversation.

User Query: "{user_query}"

Persistent Context:
- Destinations mentioned: {persistent_ctx.get('destinations_mentioned', [])}
- Interests: {persistent_ctx.get('interests', [])}
- Travel style: {persistent_ctx.get('travel_style')}
- Budget level: {persistent_ctx.get('budget_level')}

Current Context:
- Current location: {current_ctx.get('current_location', {{}})}

EXTRACT the following information and return ONLY valid JSON:

{{
  "checklist": {{
    "compulsory": {{
      "desired_location": "where user wants to go (null if not mentioned)",
      "current_location": "user's current location from geocoding (null if not available)",
      "number_of_days": "how many days for the trip (null if not mentioned)",
      "number_of_pax": "how many people traveling (null if not mentioned, default to 1 if 'solo' or 'alone')"
    }},
    "optional": {{
      "accommodation": "hotel/hostel/airbnb preference (null if not mentioned)",
      "interests": ["food", "scenery", "amusement", "nightlife", "sea"] or null,
      "dietary_restrictions": "halal/vegetarian/none (null if not mentioned)"
    }},
    "ready": true/false (true only if ALL compulsory fields are filled)
  }}
}}

IMPORTANT: 
- Use null for missing values, not empty strings
- Extract exact values from context
- For current_location, use the geocoded location if available
- Set ready=true ONLY when all 4 compulsory fields have values"""

        return await self._execute_info_extraction(prompt, "checklist")
    
    async def _extract_itinerary_info(
        self, 
        user_query: str, 
        persistent_ctx: Dict[str, Any], 
        current_ctx: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract itinerary information from context and query
        Returns structured JSON with compulsory and optional fields
        """
        
        prompt = f"""Extract travel itinerary information from the conversation.

User Query: "{user_query}"

Persistent Context:
- Destinations mentioned: {persistent_ctx.get('destinations_mentioned', [])}
- Interests: {persistent_ctx.get('interests', [])}
- Travel style: {persistent_ctx.get('travel_style')}

Current Context:
- Current location: {current_ctx.get('current_location', {{}})}

EXTRACT the following information and return ONLY valid JSON:

{{
  "itinerary": {{
    "compulsory": {{
      "desired_locations": ["place1", "place2"] or null (can be multiple specific places),
      "interests": ["food", "scenery", "amusement"] or null (MUST have at least 2),
      "number_of_days": "how many days (null if not mentioned)"
    }},
    "optional": {{
      "travel_preference": {{
        "max_distance_km": 10,
        "transport_mode": "bus/taxi/rental/walking",
        "max_travel_time_hours": null
      }},
      "specific_attractions": ["attraction1", "attraction2"] or null
    }},
    "ready": true/false (true only if ALL compulsory fields are filled and interests has at least 2 items)
  }}
}}

IMPORTANT:
- Use null for missing values
- desired_locations can be multiple places, ask carefully
- interests MUST have at least 2 items to be valid
- Default max_distance_km to 10 if not specified
- Check if destinations conflict (too far apart)"""

        return await self._execute_info_extraction(prompt, "itinerary")
    
    async def _extract_budget_info(
        self, 
        user_query: str, 
        persistent_ctx: Dict[str, Any], 
        current_ctx: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract budget information from context and query
        Returns structured JSON with compulsory and optional fields
        """
        
        prompt = f"""Extract travel budget information from the conversation.

User Query: "{user_query}"

Persistent Context:
- Destinations mentioned: {persistent_ctx.get('destinations_mentioned', [])}
- Budget level: {persistent_ctx.get('budget_level')}
- Created itineraries: {persistent_ctx.get('created_items', {{}}).get('itineraries', [])}

Current Context:
- Current location: {current_ctx.get('current_location', {{}})}

EXTRACT the following information and return ONLY valid JSON:

{{
  "budget": {{
    "compulsory": {{
      "total_budget": "total budget amount with currency (null if not mentioned)",
      "desired_locations": ["place1", "place2"] or null,
      "current_location": "user's location from geocoding (null if not available)"
    }},
    "optional": {{
      "dietary_preference": "halal/vegetarian/none (null if not mentioned)",
      "specific_places": ["amusement park", "restaurant name"] or null,
      "itinerary_reference": "can reference places from created itinerary if available"
    }},
    "ready": true/false (true only if ALL compulsory fields are filled)
  }}
}}

IMPORTANT:
- Use null for missing values
- total_budget should include currency (e.g., "1000 USD", "$500")
- Extract specific places from itinerary if available
- current_location should come from geocoding"""

        return await self._execute_info_extraction(prompt, "budget")
    
    async def _execute_info_extraction(self, prompt: str, action_type: str) -> Dict[str, Any]:
        """Execute LLM-based information extraction and return structured JSON"""
        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(response_text[json_start:json_end])
                return result
            
            # Fallback structure
            return {
                action_type: {
                    "compulsory": {},
                    "optional": {},
                    "ready": False
                }
            }
        except Exception as e:
            logger.error(f"Error extracting {action_type} info: {e}")
            return {
                action_type: {
                    "compulsory": {},
                    "optional": {},
                    "ready": False,
                    "error": str(e)
                }
            }
    
    # ==================== PHASE 1: INTENT CLASSIFICATION ====================
    
    async def _classify_intent_and_decide_branches(
        self, 
        user_query: str, 
        context: Dict[str, Any]
    ) -> List[BranchDecision]:
        """
        Phase 1: Analyze query and decide which branches to enable
        Returns list of branch decisions with confidence scores
        """
        prompt = f"""You are an intent classifier for a travel assistant app.

Analyze the user query and determine which branches should be enabled.

User Query: "{user_query}"
User Location: {context.get('current_location', {})}
Context: {json.dumps(context, indent=2)}

Available Branches:
1. CHECKLIST: Create task lists, packing lists with custom categories
   - Examples: "create packing list", "things to pack", "checklist for trip"
2. BUDGET: Plan trip budgets with customizable spending categories
   - Examples: "plan budget", "how much money", "budget for trip", "calculate costs"
3. ITINERARY: Create detailed day-by-day travel schedules with times and activities
   - Examples: "plan itinerary", "daily schedule", "what to do each day", "create trip plan"
4. TEXT: Provide information, recommendations, and general assistance
   - Examples: "what is Singapore like", "tell me about Marina Bay", "best time to visit", "recommend activities"
   - Also handles all location/place/direction queries (Maps will be handled by frontend)

For each branch, decide:
- enabled: true/false (should this branch execute?)
- confidence: 0.0-1.0 (how confident are you?)
- needs_clarification: true/false (is the query too vague?)
- clarification: If needs_clarification=true, what question to ask?
- priority: 1-2 (execution order, 1=highest)

Guidelines:
- Enable MULTIPLE branches if query needs them (e.g., "plan my trip and create packing list" = CHECKLIST + TEXT)
- For budget queries, enable BUDGET branch
- For itinerary/schedule queries, enable ITINERARY branch
- For place/location/direction queries, use TEXT branch to provide information
- Set needs_clarification=true ONLY if critical info is missing
- TEXT branch is default for most queries

Output ONLY valid JSON (no markdown, no explanations):
{{
  "branches": [
    {{
      "branch": "checklist",
      "enabled": false,
      "confidence": 0.0,
      "needs_clarification": false,
      "clarification": null,
      "priority": 1,
      "reasoning": "No checklist requested"
    }},
    {{
      "branch": "budget",
      "enabled": false,
      "confidence": 0.0,
      "needs_clarification": false,
      "clarification": null,
      "priority": 2,
      "reasoning": "No budget requested"
    }},
    {{
      "branch": "itinerary",
      "enabled": false,
      "confidence": 0.0,
      "needs_clarification"
      : false,
      "clarification": null,
      "priority": 3,
      "reasoning": "No itinerary requested"
    }},
    {{
      "branch": "text",
      "enabled": true,
      "confidence": 0.9,
      "needs_clarification": false,
      "clarification": null,
      "priority": 4,
      "reasoning": "General query or information request"
    }}
  ]
}}"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                data = json.loads(json_str)
                
                branches = []
                for branch_data in data.get('branches', []):
                    clarification = None
                    # Check if clarification is needed and is a valid dict (not null/None)
                    if branch_data.get('needs_clarification') and branch_data.get('clarification'):
                        clar_data = branch_data['clarification']
                        # Make sure clar_data is a dict, not a string like "null"
                        if isinstance(clar_data, dict):
                            clarification = ClarificationRequest(
                                branch=branch_data['branch'].lower(),  # Normalize to lowercase
                                question=clar_data.get('question', ''),
                                type=clar_data.get('type', 'text'),
                                options=clar_data.get('options'),
                                default=clar_data.get('default'),
                                timeout=clar_data.get('timeout', 30)
                            )
                    
                    branches.append(BranchDecision(
                        branch=branch_data['branch'].lower(),  # Normalize to lowercase
                        enabled=branch_data['enabled'],
                        confidence=branch_data['confidence'],
                        needs_clarification=branch_data.get('needs_clarification', False),
                        clarification=clarification,
                        priority=branch_data.get('priority', 1),
                        reasoning=branch_data.get('reasoning')
                    ))
                
                return branches
            else:
                raise ValueError("No JSON found in response")
                
        except Exception as e:
            logger.error(f"Error in intent classification: {e}")
            # Fallback: enable TEXT branch only
            return [
                BranchDecision(branch="checklist", enabled=False, confidence=0.0, priority=1),
                BranchDecision(branch="budget", enabled=False, confidence=0.0, priority=2),
                BranchDecision(branch="itinerary", enabled=False, confidence=0.0, priority=3),
                BranchDecision(branch="text", enabled=True, confidence=1.0, priority=4,
                             reasoning="Fallback due to classification error")
            ]
    
    # ==================== PHASE 2: CLARIFICATION COLLECTION ====================
    
    async def _collect_clarifications(
        self,
        branches: List[BranchDecision]
    ) -> Dict[str, Any]:
        """
        Phase 2: Collect clarifications from user
        In this implementation, we return clarifications for frontend to handle
        """
        clarifications = []
        for branch in branches:
            if branch.needs_clarification and branch.clarification:
                clarifications.append(branch.clarification)
        
        return {"clarifications": clarifications, "has_clarifications": len(clarifications) > 0}
    
    # ==================== HELPER FUNCTIONS ====================
    
    def _ensure_ids(self, data: Dict[str, Any], data_type: str) -> Dict[str, Any]:
        """Ensure all items have unique IDs for frontend deletion"""
        import uuid
        
        if data_type == "checklist":
            for cat_idx, category in enumerate(data.get("categories", [])):
                if "id" not in category:
                    category["id"] = f"category-{cat_idx+1}"
                for item_idx, item in enumerate(category.get("items", [])):
                    if "id" not in item:
                        item["id"] = f"item-{cat_idx+1}-{item_idx+1}"
        
        elif data_type == "budget":
            for cat_idx, category in enumerate(data.get("categories", [])):
                if "id" not in category:
                    category["id"] = f"budget-category-{cat_idx+1}"
        
        elif data_type == "itinerary":
            for day_idx, day in enumerate(data.get("days", [])):
                if "id" not in day:
                    day["id"] = f"day-{day_idx+1}"
                for act_idx, activity in enumerate(day.get("activities", [])):
                    if "id" not in activity:
                        activity["id"] = f"activity-{day_idx+1}-{act_idx+1}"
        
        return data
    
    async def _extract_context_from_message(
        self,
        message: str,
        current_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract key information from user message to update persistent context"""
        prompt = f"""Analyze this user message and extract key travel planning information.

User Message: "{message}"

Current Context: {json.dumps(current_context)}

Extract and return ONLY the following information if mentioned (use null if not found):
- destinations: List of places/cities mentioned
- interests: Travel interests/activities (food, culture, adventure, shopping, etc.)
- budget_level: "budget", "mid-range", or "luxury" (if mentioned)
- travel_style: "relaxed", "packed", "family", "solo", "group" (if mentioned)

Output ONLY valid JSON:
{{
  "destinations": ["city1", "city2"],
  "interests": ["food", "culture"],
  "budget_level": "mid-range",
  "travel_style": "relaxed"
}}"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                extracted = json.loads(response_text[json_start:json_end])
                return extracted
            return {}
        except Exception as e:
            logger.error(f"Error extracting context: {e}")
            return {}
    
    # ==================== PHASE 3: BRANCH EXECUTION ====================
    
    async def _execute_checklist_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Checklist branch - generate checklist with custom categories"""
        prompt = f"""Generate a personalized travel checklist based on EXACTLY what the user requested.

User Query: "{user_query}"
Context: {json.dumps(context)}

CAREFULLY ANALYZE WHAT THEY'RE ASKING FOR:
- Is it for a specific activity? (beach, hiking, business, etc.)
- What destination? (weather, culture, requirements)
- Trip duration? (weekend vs long trip)
- Any specific items or categories mentioned?

CREATE CUSTOM CATEGORIES that match their exact needs:
- DON'T use generic "Documents, Electronics, Clothing" unless appropriate
- DO create specific categories for their trip type
- Examples: Beach trip → "Beach Essentials", "Water Activities", "Sun Protection"
- Business trip → "Business Documents", "Professional Attire", "Tech Equipment"

IMPORTANT:
- Create 4-8 custom categories that match their SPECIFIC request
- Keep each item under 100 characters
- Include destination-specific requirements
- Output ONLY valid JSON, no markdown

Format:
{{
  "title": "Descriptive Checklist Title",
  "categories": [
    {{
      "id": "category-1",
      "category": "Custom Category Name",
      "items": [
        {{"id": "item-1", "text": "Brief item description", "checked": false}}
      ]
    }}
  ]
}}

Now generate the checklist as JSON:"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Log the response for debugging
            if not response_text or len(response_text.strip()) == 0:
                return {"success": False, "error": "Empty response from LLM"}
            
            # Log FULL response for debugging (not truncated)
            
            # Remove markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                
                # Log the extracted JSON
                
                try:
                    checklist_data = json.loads(json_str)
                    # Ensure all items have IDs for deletion
                    checklist_data = self._ensure_ids(checklist_data, "checklist")
                    return {"success": True, "data": checklist_data, "type": "checklist"}
                except json.JSONDecodeError as parse_error:
                    logger.error(f"❌ JSON decode error: {parse_error}")
                    logger.error(f"❌ Failed JSON string:\n{json_str}")
                    # Try to fix common JSON issues
                    try:
                        # Attempt to fix truncated JSON by adding closing brackets
                        fixed_json = json_str
                        if not fixed_json.rstrip().endswith('}'):
                            # Count open vs close braces
                            open_braces = fixed_json.count('{')
                            close_braces = fixed_json.count('}')
                            if open_braces > close_braces:
                                logger.info(f"🔧 Attempting to fix truncated JSON ({open_braces} open, {close_braces} close)")
                                # Close any open string
                                if fixed_json.rstrip()[-1] not in ['"', ',', '}', ']']:
                                    fixed_json = fixed_json.rstrip() + '"'
                                # Close any open objects/arrays
                                open_arrays = fixed_json.count('[') - fixed_json.count(']')
                                open_objects = open_braces - close_braces
                                fixed_json += ']' * open_arrays
                                fixed_json += '}' * open_objects
                                logger.info(f"🔧 Fixed JSON:\n{fixed_json}")
                                checklist_data = json.loads(fixed_json)
                                logger.info(f"✅ Successfully parsed fixed JSON!")
                                # Ensure all items have IDs for deletion
                                checklist_data = self._ensure_ids(checklist_data, "checklist")
                                return {"success": True, "data": checklist_data, "type": "checklist"}
                    except Exception as fix_error:
                        logger.error(f"❌ Failed to fix JSON: {fix_error}")
                    raise parse_error
            
            return {"success": False, "error": "Could not parse checklist data - no JSON found"}
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"JSON parsing error: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_budget_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Budget branch - generate trip budget with custom categories"""
        prompt = f"""Generate a personalized trip budget plan based on the user's specific request.

User Query: "{user_query}"
Context: {json.dumps(context)}

CAREFULLY ANALYZE THE USER'S REQUEST:
- What is their budget level? (Look for keywords: cheap, budget, affordable, mid-range, comfortable, luxury)
- How long is the trip? (days/weeks mentioned)
- What activities do they want? (affects activity budget)
- Any specific spending priorities mentioned?

CREATE REALISTIC, PERSONALIZED ESTIMATES:
- Match budget to destination's cost of living
- Adjust categories based on travel style (backpacker vs luxury)
- Include only relevant categories for their trip type
- Don't just use generic tourist budgets - customize!

IMPORTANT:
- Create 5-10 custom budget categories based on the trip
- Provide realistic cost estimates in USD (or specify currency)
- Include total budget and breakdown by category
- Add brief notes/tips for each category
- Output ONLY valid JSON, no markdown

Format:
{{
  "title": "Trip Budget Plan",
  "currency": "USD",
  "totalBudget": 1500,
  "categories": [
    {{
      "id": "budget-category-1",
      "category": "Custom Category Name",
      "amount": 300,
      "notes": "Brief explanation or tips",
      "percentage": 20
    }}
  ],
  "tips": [
    "Money-saving tip 1",
    "Money-saving tip 2"
  ]
}}

Now generate the budget as JSON:"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            if not response_text or len(response_text.strip()) == 0:
                return {"success": False, "error": "Empty response from LLM"}
            
            # Remove markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                
                try:
                    budget_data = json.loads(json_str)
                    # Ensure all items have IDs for deletion
                    budget_data = self._ensure_ids(budget_data, "budget")
                    return {"success": True, "data": budget_data, "type": "budget"}
                except json.JSONDecodeError as parse_error:
                    logger.error(f"❌ JSON decode error in budget: {parse_error}")
                    logger.error(f"❌ Failed JSON string:\n{json_str[:500]}...")
                    
                    # Try to fix common JSON issues
                    try:
                        fixed_json = json_str
                        if not fixed_json.rstrip().endswith('}'):
                            open_braces = fixed_json.count('{')
                            close_braces = fixed_json.count('}')
                            if open_braces > close_braces:
                                logger.info(f"🔧 Attempting to fix truncated JSON")
                                if fixed_json.rstrip()[-1] not in ['"', ',', '}', ']']:
                                    fixed_json = fixed_json.rstrip() + '"'
                                open_arrays = fixed_json.count('[') - fixed_json.count(']')
                                open_objects = open_braces - close_braces
                                fixed_json += ']' * open_arrays
                                fixed_json += '}' * open_objects
                                budget_data = json.loads(fixed_json)
                                logger.info(f"✅ Successfully parsed fixed JSON!")
                                # Ensure all items have IDs for deletion
                                budget_data = self._ensure_ids(budget_data, "budget")
                                return {"success": True, "data": budget_data, "type": "budget"}
                    except Exception as fix_error:
                        logger.error(f"❌ Failed to fix JSON: {fix_error}")
                    raise parse_error
            
            return {"success": False, "error": "Could not parse budget data - no JSON found"}
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"JSON parsing error: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_itinerary_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Itinerary branch - generate day-by-day travel schedule"""
        prompt = f"""Generate a personalized day-by-day travel itinerary based on the user's specific request.

User Query: "{user_query}"
Context: {json.dumps(context)}

ANALYZE THE USER'S PREFERENCES:
- Look for keywords about interests (food, culture, adventure, nature, shopping, nightlife, etc.)
- Consider trip style (relaxed, packed, budget, luxury)
- Note any specific attractions or activities mentioned
- Adapt to their pace and preferences

IMPORTANT REQUIREMENTS:
- Customize based on what the user actually asked for (don't just list tourist hotspots)
- Limit to 3-4 activities per day for a relaxed pace (or 5 if they want packed schedule)
- Keep descriptions under 100 characters each
- Keep tips under 80 characters each
- Use 24-hour time format (e.g., "09:00", "14:30")
- Match the number of days requested (default to 2-3 if not specified)
- Include variety: mix popular spots with local experiences
- Output ONLY valid JSON, no markdown, no extra text

Format:
{{
  "title": "X-Day Trip Itinerary",
  "destination": "Destination Name",
  "days": [
    {{
      "id": "day-1",
      "day": 1,
      "date": "Day 1",
      "activities": [
        {{
          "id": "activity name / destination",
          "time": "09:00",
          "endTime": "11:00",
          "title": "Activity Title",
          "description": "Brief description under 100 chars",
          "location": "Location name"
        }}
      ]
    }}
  ],
  "generalTips": [
    "Tip 1 under 80 chars",
    "Tip 2 under 80 chars"
  ]
}}

Now generate the itinerary as JSON:"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            if not response_text or len(response_text.strip()) == 0:
                return {"success": False, "error": "Empty response from LLM"}
            
            # Remove markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                
                try:
                    itinerary_data = json.loads(json_str)
                    # Ensure all items have IDs for deletion
                    itinerary_data = self._ensure_ids(itinerary_data, "itinerary")
                    return {"success": True, "data": itinerary_data, "type": "itinerary"}
                except json.JSONDecodeError as parse_error:
                    logger.error(f"❌ JSON decode error in itinerary: {parse_error}")
                    logger.error(f"❌ Failed JSON string:\n{json_str[:500]}...")
                    
                    # Try to fix common JSON issues
                    try:
                        fixed_json = json_str
                        if not fixed_json.rstrip().endswith('}'):
                            # Count open vs close braces
                            open_braces = fixed_json.count('{')
                            close_braces = fixed_json.count('}')
                            if open_braces > close_braces:
                                logger.info(f"🔧 Attempting to fix truncated JSON ({open_braces} open, {close_braces} close)")
                                # Close any open string
                                if fixed_json.rstrip()[-1] not in ['"', ',', '}', ']']:
                                    fixed_json = fixed_json.rstrip() + '"'
                                # Close any open objects/arrays
                                open_arrays = fixed_json.count('[') - fixed_json.count(']')
                                open_objects = open_braces - close_braces
                                fixed_json += ']' * open_arrays
                                fixed_json += '}' * open_objects
                                logger.info(f"🔧 Fixed JSON")
                                itinerary_data = json.loads(fixed_json)
                                logger.info(f"✅ Successfully parsed fixed JSON!")
                                # Ensure all items have IDs for deletion
                                itinerary_data = self._ensure_ids(itinerary_data, "itinerary")
                                return {"success": True, "data": itinerary_data, "type": "itinerary"}
                    except Exception as fix_error:
                        logger.error(f"❌ Failed to fix JSON: {fix_error}")
                    raise parse_error
            
            return {"success": False, "error": "Could not parse itinerary data - no JSON found"}
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"JSON parsing error: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_text_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        chat_history: str
    ) -> Dict[str, Any]:
        """Execute Text branch - generate informational response"""
        prompt = f"""You are a helpful travel assistant. Answer the user's question conversationally.

Chat History:
{chat_history}

User Query: "{user_query}"
Context: {json.dumps(context)}

IMPORTANT GUIDELINES:
1. If the user is asking to FIND or SEARCH for places/restaurants/hotels:
   - DO NOT say you will search or look up results
   - Instead, tell them: "I can help you search! Please use the search bar or map to find [what they're looking for] near your location."
   - Provide helpful tips about what to look for or popular options in the area

2. If the user asks for RECOMMENDATIONS or INFORMATION:
   - Provide helpful suggestions and information
   - You can mention specific place names
   - Be conversational and friendly

3. Keep responses concise (2-3 paragraphs max)

Provide a helpful, friendly response now:"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            return {"success": True, "data": {"message": response_text}, "type": "text"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_branches(
        self,
        branches: List[BranchDecision],
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any],
        chat_history: str
    ) -> List[Dict[str, Any]]:
        """Execute all enabled branches in parallel"""
        tasks = []
        enabled_branches = [b for b in branches if b.enabled]
        
        
        try:
            for branch in sorted(enabled_branches, key=lambda x: x.priority):
                if branch.branch == "checklist":
                    tasks.append(self._execute_checklist_branch(user_query, context, clarifications))
                elif branch.branch == "budget":
                    tasks.append(self._execute_budget_branch(user_query, context, clarifications))
                elif branch.branch == "itinerary":
                    tasks.append(self._execute_itinerary_branch(user_query, context, clarifications))
                elif branch.branch == "text":
                    tasks.append(self._execute_text_branch(user_query, context, chat_history))
        except Exception as e:
            logger.error(f"Error creating tasks: {e}", exc_info=True)
            return []
        
        if not tasks:
            # No branches enabled, fall back to text
            tasks.append(self._execute_text_branch(user_query, context, chat_history))
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            logger.error(f"Error in asyncio.gather: {e}", exc_info=True)
            return []
        # Filter out exceptions
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Branch execution error: {result}", exc_info=True)
            else:
                valid_results.append(result)
        
        return valid_results
    
    # ==================== PHASE 4: RESULT AGGREGATION ====================
    
    async def _aggregate_results(
        self,
        branch_results: List[Dict[str, Any]],
        user_query: str,
        context: Dict[str, Any]
    ) -> ChatResponse:
        """Aggregate branch results and generate final response"""
        
        # Separate results by type
        app_actions = []
        text_responses = []
        
        logger.info(f"📦 Aggregating {len(branch_results)} branch results")
        for i, result in enumerate(branch_results):
            logger.info(f"  Result {i+1}: success={result.get('success')}, type={result.get('type')}, has_data={bool(result.get('data'))}")
            
            if not result.get('success'):
                logger.warning(f"  ⚠️ Result {i+1} failed: {result.get('error', 'Unknown error')}")
                continue
                
            result_type = result.get('type')
            data = result.get('data', {})
            if result_type == 'checklist':
                app_actions.append(AppAction(type="checklist", data=data))
                logger.info(f"  ✅ Added checklist action")
            elif result_type == 'budget':
                app_actions.append(AppAction(type="budget", data=data))
                logger.info(f"  ✅ Added budget action")
            elif result_type == 'itinerary':
                app_actions.append(AppAction(type="itinerary", data=data))
                logger.info(f"  ✅ Added itinerary action")
            elif result_type == 'text':
                text_responses.append(data.get('message', ''))
                logger.info(f"  ✅ Added text response")
        
        # Determine final message
        # Combine all responses appropriately
        message_parts = []
        
        # Add text responses first
        if text_responses:
            message_parts.extend(text_responses)
            logger.info(f"💬 Added {len(text_responses)} text response(s)")
        
        # Add acknowledgment for app actions if present
        if app_actions:
            action_types = [action.type for action in app_actions]
            if "checklist" in action_types:
                message_parts.append("I've created a checklist for you. Check it out below!")
            if "budget" in action_types:
                message_parts.append("I've prepared a budget plan for your trip. Take a look!")
            if "itinerary" in action_types:
                message_parts.append("Here's your customized day-by-day itinerary!")
            logger.info(f"📋 Added acknowledgment for {len(app_actions)} action(s)")
        
        # Combine all parts or use fallback
        if message_parts:
            final_message = '\n\n'.join(message_parts)
        else:
            final_message = "I'm here to help with your travel planning. Let me know if you need anything!"
            logger.info(f"❓ Using fallback message")
        
        # Generate suggestions based on what was provided
        suggestions = []
        action_types = [action.type for action in app_actions]
        
        if app_actions and text_responses:
            # Both present
            suggestions.append("Would you like to customize anything?")
            suggestions.append("Need more details about your trip?")
        elif "checklist" in action_types:
            suggestions.append("Would you like to modify the checklist?")
            suggestions.append("Need help with anything else?")
        elif "budget" in action_types:
            suggestions.append("Want to adjust the budget categories?")
            suggestions.append("Need tips on saving money?")
        elif "itinerary" in action_types:
            suggestions.append("Would you like to adjust the schedule?")
            suggestions.append("Need more activity suggestions?")
        elif text_responses:
            # Only text
            suggestions.append("Would you like more details?")
            suggestions.append("Any other questions?")
        
        logger.info(f"✨ Final response: {len(app_actions)} app actions, message length: {len(final_message)}")
        
        return {
            "message": final_message,
            "map_actions": [],  # No map actions from backend
            "app_actions": app_actions,
            "suggestions": suggestions[:2]  # Max 2 suggestions
        }
    
    async def create_session(self, user_id: str, session_id: str = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a new chat session with persistent context
        
        Args:
            user_id: User identifier
            session_id: Optional session ID (auto-generate if not provided)
            metadata: Optional session metadata
        
        Returns:
            Session ID
        """
        if not session_id:
            session_id = str(uuid.uuid4())
        
        session_data = {
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "chat_history": [],
            "persistent_context": {
                "destinations_mentioned": [],
                "interests": [],
                "travel_dates": None,
                "budget_level": None,
                "travel_style": None,
                "current_location": None,
                "created_items": {
                    "checklists": [],
                    "itineraries": [],
                    "budgets": []
                }
            },
            "metadata": metadata or {}
        }
        
        if self.redis:
            await self.redis.set_session(session_id, session_data)
        else:
            self._memory_sessions[session_id] = session_data
            
        logger.info(f"Created session {session_id} for user {user_id}")
        
        return session_id
    
    async def get_or_create_session(self, user_id: str) -> str:
        """
        Get an active session for user or create a new one
        Sessions are considered active if used within last 24 hours
        
        Args:
            user_id: User identifier
            
        Returns:
            Session ID
        """
        # Try to find an active session for this user
        # This would require maintaining a user_id -> session_id mapping in Redis
        # For now, just create a new session
        # Frontend should maintain session IDs in localStorage
        
        return await self.create_session(user_id)
    
    async def is_session_active(self, session_id: str) -> bool:
        """
        Check if a session is still active (within 24 hours of last activity)
        
        Args:
            session_id: Session identifier
            
        Returns:
            Boolean indicating if session is active
        """
        try:
            if self.redis:
                session_data = await self.redis.get_session(session_id)
            else:
                session_data = self._memory_sessions.get(session_id)
            
            if not session_data:
                return False
            
            last_activity = session_data.get("last_activity")
            if not last_activity:
                return False
            
            from datetime import datetime, timedelta
            last_time = datetime.fromisoformat(last_activity)
            now = datetime.utcnow()
            
            # Session is active if used within last 24 hours
            return (now - last_time) < timedelta(hours=24)
            
        except Exception as e:
            logger.error(f"Error checking session activity: {e}")
            return False
    
    async def delete_session(self, session_id: str, user_id: str):
        """
        Delete a chat session
        
        Args:
            session_id: Session identifier
            user_id: User identifier for authorization
        """
        if self.redis:
            session_data = await self.redis.get_session(session_id)
        else:
            session_data = self._memory_sessions.get(session_id)
        
        if not session_data:
            raise ValueError(f"Session {session_id} not found")
        
        if session_data.get("user_id") != user_id:
            raise ValueError("Unauthorized session access")
        
        if self.redis:
            await self.redis.delete_session(session_id)
        else:
            self._memory_sessions.pop(session_id, None)
        logger.info(f"Deleted session {session_id}")
    
    async def process_message(
        self,
        user_id: str,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ChatResponse:
        """
        Process user message with MULTI-PHASE WORKFLOW
        
        Phase 1: Intent Classification → Decide which branches to enable
        Phase 2: Clarification Collection → Ask user for missing info (if needed)
        Phase 3: Branch Execution → Execute enabled branches in parallel
        Phase 4: Result Aggregation → Combine results and generate final response
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            message: User's message
            context: Additional context (location, preferences, etc.)
        
        Returns:
            ChatResponse with agent's reply and actions
        """
        try:
            logger.info(f"🎯 Processing message: '{message}'")
            
            # Retrieve or create session
            if self.redis:
                session_data = await self.redis.get_session(session_id)
                if not session_data:
                    await self.create_session(user_id, session_id)
                    session_data = await self.redis.get_session(session_id)
            else:
                session_data = self._memory_sessions.get(session_id)
                if not session_data:
                    await self.create_session(user_id, session_id)
                    session_data = self._memory_sessions.get(session_id)
            
            if not session_data:
                raise ValueError(f"Failed to retrieve or create session {session_id}")
            
            # Update last activity timestamp
            session_data["last_activity"] = datetime.utcnow().isoformat()
            
            # Extract context from current message
            extracted_context = await self._extract_context_from_message(
                message,
                session_data.get("persistent_context", {})
            )
            
            # Update persistent context
            persistent_ctx = session_data.get("persistent_context", {})
            
            # Merge destinations
            if extracted_context.get("destinations"):
                current_dests = persistent_ctx.get("destinations_mentioned", [])
                for dest in extracted_context["destinations"]:
                    if dest and dest not in current_dests:
                        current_dests.append(dest)
                persistent_ctx["destinations_mentioned"] = current_dests[:5]  # Keep last 5
            
            # Merge interests
            if extracted_context.get("interests"):
                current_interests = persistent_ctx.get("interests", [])
                for interest in extracted_context["interests"]:
                    if interest and interest not in current_interests:
                        current_interests.append(interest)
                persistent_ctx["interests"] = current_interests[:10]  # Keep last 10
            
            # Update budget level and travel style if mentioned
            if extracted_context.get("budget_level"):
                persistent_ctx["budget_level"] = extracted_context["budget_level"]
            if extracted_context.get("travel_style"):
                persistent_ctx["travel_style"] = extracted_context["travel_style"]
            
            # Update current location from context
            if context and context.get('current_location'):
                persistent_ctx["current_location"] = context['current_location']
            
            session_data["persistent_context"] = persistent_ctx
            
            # Build chat history with persistent context
            chat_history_str = self._build_chat_history_string(
                session_data.get("chat_history", []),
                persistent_ctx
            )
            
            # Prepare context with defaults
            if not context:
                context = {}
            if 'current_location' not in context:
                context['current_location'] = {"name": "Unknown", "lat": 1.2894, "lng": 103.8499}
            
            # ==================== PHASE 1: INTENT CLASSIFICATION ====================
            logger.info("📊 PHASE 1: Classifying intent and deciding branches...")
            branches = await self._classify_intent_and_decide_branches(message, context)
            
            # ==================== PHASE 2: REQUIREMENT CHECKING ====================
            logger.info("🔍 PHASE 2: Extracting information and checking requirements...")
            
            # Detect if user explicitly wants to execute app actions
            trigger_info = self._detect_execution_trigger(message)
            execute_app_actions = trigger_info["execute"]
            requested_actions = trigger_info.get("actions")
            
            if execute_app_actions:
                logger.info(f"✅ Execution trigger detected - will execute: {requested_actions or 'all enabled actions'}")
            else:
                logger.info("ℹ️ No execution trigger - will extract and return requirement status")
            
            # Extract information for each app action branch
            requirements_status = {}
            
            # Check requirements for each app action branch
            app_action_branches = [b for b in branches if b.enabled and b.branch in ["CHECKLIST", "ITINERARY", "BUDGET"]]
            
            if app_action_branches:
                for branch in app_action_branches:
                    # Extract structured information
                    extraction_result = await self._check_requirements_for_action(
                        branch.branch,
                        message,
                        persistent_ctx,
                        context
                    )
                    
                    # Get the action-specific data (checklist/itinerary/budget)
                    action_key = branch.branch.lower()
                    action_data = extraction_result.get(action_key, {})
                    
                    # Store the full extraction result in requirements_status
                    requirements_status[action_key] = extraction_result
                    
                    # Check if ready
                    is_ready = action_data.get("ready", False)
                    
                    # Check if this specific action was requested
                    action_requested = requested_actions is None or action_key in requested_actions
                    
                    # ALWAYS disable app action branches for normal messages
                    # Only enable if execution trigger detected AND requirements met AND action requested
                    if not execute_app_actions or not is_ready or not action_requested:
                        if not execute_app_actions:
                            logger.info(f"🔒 {branch.branch} disabled - no execution trigger in message")
                        elif not action_requested:
                            logger.info(f"🔒 {branch.branch} disabled - not in requested actions {requested_actions}")
                        else:
                            compulsory = action_data.get("compulsory", {})
                            missing_fields = [k for k, v in compulsory.items() if v is None]
                            logger.info(f"❌ {branch.branch} disabled - requirements not met. Missing: {missing_fields}")
                        
                        branch.enabled = False
                        
                        # If this was the only enabled branch, add TEXT branch for follow-up
                        if len([b for b in branches if b.enabled]) == 0:
                            text_branch = BranchDecision(
                                branch="TEXT",
                                enabled=True,
                                reasoning=f"Extracting requirements for {branch.branch.lower()} or providing guidance",
                                needs_clarification=False
                            )
                            branches.append(text_branch)
                    else:
                        logger.info(f"✅ {branch.branch} enabled - execution trigger present and requirements met")
            
            # ==================== PHASE 3: CLARIFICATION COLLECTION ====================
            clarification_result = await self._collect_clarifications(branches)
            
            # If clarifications are needed, return them to frontend
            if clarification_result.get('has_clarifications'):
                logger.info("❓ PHASE 3: Clarifications needed from user")
                clarifications_list = [b.clarification for b in branches if b.needs_clarification and b.clarification]
                
                return ChatResponse(
                    session_id=session_id,
                    message="I need a bit more information to help you better:",
                    map_actions=[],
                    app_actions=[],
                    clarifications=clarifications_list,
                    suggestions=[],
                    metadata={
                        "model": "gemini-2.5-flash",
                        "phase": "clarification_needed",
                        "branches": [{"branch": b.branch, "enabled": b.enabled} for b in branches],
                        "requirements_status": requirements_status
                    }
                )
            
            # ==================== PHASE 4: BRANCH EXECUTION ====================
            logger.info("⚙️ PHASE 4: Executing branches...")
            clarifications = {}  # In future, this would come from user's clarification response
            branch_results = await self._execute_branches(
                branches, message, context, clarifications, chat_history_str
            )
            
            # ==================== PHASE 5: RESULT AGGREGATION ====================
            logger.info("🔗 PHASE 5: Aggregating results...")
            aggregated = await self._aggregate_results(branch_results, message, context)
            
            # Add requirements status to metadata
            if not aggregated.get('metadata'):
                aggregated['metadata'] = {}
            aggregated['metadata']['requirements_status'] = requirements_status
            
            # Store created items in persistent context
            for app_action in aggregated.get('app_actions', []):
                action_type = app_action.type
                action_data = app_action.data
                
                if action_type == "checklist":
                    persistent_ctx.setdefault("created_items", {}).setdefault("checklists", []).append({
                        "title": action_data.get("title", "Untitled"),
                        "created_at": datetime.utcnow().isoformat()
                    })
                elif action_type == "itinerary":
                    persistent_ctx.setdefault("created_items", {}).setdefault("itineraries", []).append({
                        "title": action_data.get("title", "Untitled"),
                        "destination": action_data.get("destination", "Unknown"),
                        "created_at": datetime.utcnow().isoformat()
                    })
                elif action_type == "budget":
                    persistent_ctx.setdefault("created_items", {}).setdefault("budgets", []).append({
                        "title": action_data.get("title", "Untitled"),
                        "total": action_data.get("totalBudget", 0),
                        "created_at": datetime.utcnow().isoformat()
                    })
            
            # Keep only last 3 of each item type
            created_items = persistent_ctx.get("created_items", {})
            for item_type in ["checklists", "itineraries", "budgets"]:
                if item_type in created_items:
                    created_items[item_type] = created_items[item_type][-3:]
            
            session_data["persistent_context"] = persistent_ctx
            
            # Update session history
            session_data["chat_history"].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            session_data["chat_history"].append({
                "role": "assistant",
                "content": aggregated['message'],
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Keep only last 10 messages
            session_data["chat_history"] = session_data["chat_history"][-10:]
            
            # Save session
            if self.redis:
                await self.redis.set_session(session_id, session_data)
            else:
                self._memory_sessions[session_id] = session_data
            
            logger.info(f"✅ Processing complete: {len(aggregated['map_actions'])} map actions, {len(aggregated['app_actions'])} app actions")
            
            return ChatResponse(
                session_id=session_id,
                message=aggregated['message'],
                map_actions=aggregated['map_actions'],
                app_actions=aggregated['app_actions'],
                clarifications=[],
                suggestions=aggregated['suggestions'],
                metadata={
                    "model": "gemini-2.5-flash",
                    "phase": "complete",
                    "branches_executed": [b.branch for b in branches if b.enabled],
                    "requirements_status": requirements_status,
                    **(aggregated.get('metadata', {}))
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Error in multi-phase processing: {str(e)}", exc_info=True)
            return ChatResponse(
                session_id=session_id,
                message=f"I encountered an error while processing your request. Please try again or rephrase your question.",
                map_actions=[],
                app_actions=[],
                clarifications=[],
                suggestions=[],
                metadata={"error": True, "error_message": str(e)}
            )
    
    def _build_chat_history(self, history: List[Dict[str, str]]) -> List:
        """Convert stored history to LangChain message format"""
        messages = []
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        return messages
    
    def _build_chat_history_string(self, history: List[Dict[str, str]], persistent_context: Dict[str, Any] = None) -> str:
        """Convert stored history to string format with persistent context"""
        context_parts = []
        
        # Add persistent context summary
        if persistent_context:
            if persistent_context.get("current_location"):
                loc = persistent_context["current_location"]
                context_parts.append(f"User's Location: {loc.get('name', 'Unknown')}")
            
            if persistent_context.get("destinations_mentioned"):
                dests = ", ".join(persistent_context["destinations_mentioned"])
                context_parts.append(f"Destinations Discussed: {dests}")
            
            if persistent_context.get("interests"):
                interests = ", ".join(persistent_context["interests"])
                context_parts.append(f"User Interests: {interests}")
            
            if persistent_context.get("budget_level"):
                context_parts.append(f"Budget Level: {persistent_context['budget_level']}")
            
            if persistent_context.get("travel_style"):
                context_parts.append(f"Travel Style: {persistent_context['travel_style']}")
            
            # Add info about created items
            created = persistent_context.get("created_items", {})
            if created.get("checklists"):
                context_parts.append(f"Created Checklists: {len(created['checklists'])} item(s)")
            if created.get("itineraries"):
                context_parts.append(f"Created Itineraries: {len(created['itineraries'])} item(s)")
            if created.get("budgets"):
                context_parts.append(f"Created Budgets: {len(created['budgets'])} item(s)")
        
        result = []
        
        if context_parts:
            result.append("=== SESSION CONTEXT ===")
            result.extend(context_parts)
            result.append("=== RECENT CONVERSATION ===")
        
        if not history:
            result.append("No previous conversation.")
        else:
            # Only last 5 messages
            for msg in history[-5:]:
                role = "Human" if msg["role"] == "user" else "AI"
                result.append(f"{role}: {msg['content']}")
        
        return "\n".join(result)
    
    def _enhance_message_with_context(self, message: str, context: Optional[Dict[str, Any]]) -> str:
        """Add context information to user message"""
        if not context:
            return message
        
        context_parts = []
        
        if context.get("current_location"):
            loc = context["current_location"]
            location_name = loc.get('name', 'Unknown')
            lat = loc.get('lat')
            lng = loc.get('lng')
            context_parts.append(f"User's Current Location: {location_name} (coordinates: {lat}, {lng})")
        
        if context.get("budget"):
            context_parts.append(f"Budget: {context['budget']}")
        
        if context_parts:
            context_info = "\n".join(context_parts)
            return f"{message}\n\n[SYSTEM CONTEXT - Use this information in your response:\n{context_info}]"
        
        return message
    
    # ==================== UTILITY METHODS ====================