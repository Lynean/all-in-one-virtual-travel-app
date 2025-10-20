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
from tools.maps_tool import MapsTool
from tools.routes_tool import GoogleRoutesTool
from tools.places_tool import GooglePlacesTool, GooglePlaceDetailsTool
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
            CurrencyTool(),
            
            # Google Maps APIs - Specialized tools
            GooglePlacesTool(),        # Places API (New) - Search for places, restaurants, hotels
            GooglePlaceDetailsTool(),  # Places API - Get detailed info about specific places
            GoogleRoutesTool(),        # Routes API - Compute directions and routes
            
            # Legacy maps tool (kept for backward compatibility)
            MapsTool()
        ]
    

    
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
1. ROUTES: Compute directions/routes between locations (e.g., "directions to", "how to get to", "route from X to Y")
2. PLACES: Search for restaurants, hotels, attractions with advanced filters
   - Supports: place types, dietary restrictions (vegetarian/vegan), amenities (parking/wifi),
   - Atmosphere (kid-friendly/pet-friendly/outdoor seating), price level, ratings, open now
   - Examples: "vegetarian restaurants", "pet-friendly cafes", "cheap breakfast places open now"
3. CHECKLIST: Create task lists, itineraries, packing lists (e.g., "create packing list", "plan my day", "things to do")
4. TEXT: Provide information without API calls (e.g., "what is", "tell me about", general questions)

For each branch, decide:
- enabled: true/false (should this branch execute?)
- confidence: 0.0-1.0 (how confident are you?)
- needs_clarification: true/false (is the query too vague?)
- clarification: If needs_clarification=true, what question to ask?
- priority: 1-4 (execution order, 1=highest)

Guidelines:
- Enable MULTIPLE branches if query needs them (e.g., "find restaurants and show directions" = PLACES + ROUTES)
- Set needs_clarification=true ONLY if critical info is missing and you can't make a reasonable assumption
- Don't ask for clarification if you can infer from context (e.g., "near me" means use user location)
- TEXT branch is fallback for informational queries

Output ONLY valid JSON (no markdown, no explanations):
{{
  "branches": [
    {{
      "branch": "places",
      "enabled": true,
      "confidence": 0.9,
      "needs_clarification": false,
      "clarification": null,
      "priority": 1,
      "reasoning": "User wants to find places"
    }},
    {{
      "branch": "routes",
      "enabled": false,
      "confidence": 0.1,
      "needs_clarification": false,
      "clarification": null,
      "priority": 2,
      "reasoning": "No route computation needed"
    }},
    {{
      "branch": "checklist",
      "enabled": false,
      "confidence": 0.0,
      "needs_clarification": false,
      "clarification": null,
      "priority": 3,
      "reasoning": "No checklist requested"
    }},
    {{
      "branch": "text",
      "enabled": false,
      "confidence": 0.2,
      "needs_clarification": false,
      "clarification": null,
      "priority": 4,
      "reasoning": "Not an informational query"
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
                    if branch_data.get('needs_clarification') and branch_data.get('clarification'):
                        clar_data = branch_data['clarification']
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
                
                logger.info(f"✅ Branch decisions: {[f'{b.branch}({b.enabled})' for b in branches]}")
                return branches
            else:
                raise ValueError("No JSON found in response")
                
        except Exception as e:
            logger.error(f"Error in intent classification: {e}")
            # Fallback: enable TEXT branch only
            return [
                BranchDecision(branch="routes", enabled=False, confidence=0.0, priority=1),
                BranchDecision(branch="places", enabled=False, confidence=0.0, priority=2),
                BranchDecision(branch="checklist", enabled=False, confidence=0.0, priority=3),
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
    
    # ==================== PHASE 3: BRANCH EXECUTION ====================
    
    async def _execute_routes_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Routes branch - extract route parameters"""
        prompt = f"""Extract route parameters from the user query.

User Query: "{user_query}"
User Location: {json.dumps(context.get('current_location', {}))}
Clarifications: {json.dumps(clarifications)}

Extract:
- origin: Start location (use user location if "from here" or "from current location")
- destination: End location (address or place name)
- travel_mode: DRIVE, WALK, BICYCLE, TRANSIT (default: DRIVE)
- waypoints: Optional stops along the way
- avoid: tolls, highways, ferries

Output ONLY valid JSON:
{{
  "origin": "1.2929,103.7724",
  "destination": "Marina Bay Sands",
  "travelMode": "DRIVE",
  "waypoints": [],
  "avoid": []
}}"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                route_data = json.loads(response_text[json_start:json_end])
                logger.info(f"🚗 Routes branch: {route_data.get('origin')} → {route_data.get('destination')}")
                return {"success": True, "data": route_data, "type": "route"}
            return {"success": False, "error": "Could not parse route data"}
        except Exception as e:
            logger.error(f"Error in routes branch: {e}")
            return {"success": False, "error": str(e)}
    
    async def _execute_places_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Places branch - refine query for Google Places Text Search API"""
        current_location = context.get('current_location', {})
        lat = current_location.get('lat', 1.2894)
        lng = current_location.get('lng', 103.8499)
        location_name = current_location.get('name', 'Unknown')
        
        prompt = f"""You are refining a user's query for Google Places API Text Search.

User Query: "{user_query}"
User Location: {location_name} ({lat}, {lng})
Clarifications: {json.dumps(clarifications)}

TASK: Create a clear, natural language search query that Google Places API can understand.

GUIDELINES:
1. If query mentions a specific city/destination, include it: "attractions in Singapore"
2. If query says "near me" or "nearby", use current location: "restaurants near {location_name}"
3. If query mentions a SPECIFIC LOCATION (e.g., "near NTU", "near Marina Bay", "at Orchard Road"):
   - Include that location in textQuery: "restaurants near NTU"
   - Set needsGeocode: true
   - Set geocodeLocation: "NTU" (the specific location to geocode)
4. Keep it natural and conversational - Places API handles complex queries well
5. Include relevant filters in the text: "cheap vegetarian restaurants", "pet-friendly cafes"
6. For trip planning, focus on attractions: "top tourist attractions in Singapore"

IMPORTANT LOCATION HANDLING:
- "near me" / "nearby" → Use user's current location ({lat}, {lng})
- "near [PLACE]" → Set needsGeocode: true, geocodeLocation: "[PLACE]"
- "at [PLACE]" → Set needsGeocode: true, geocodeLocation: "[PLACE]"
- "in [CITY]" → Include city in textQuery, use city center coordinates

DESTINATION COORDINATES (use if mentioned in query):
- Singapore: 1.3521, 103.8198
- Malaysia/KL: 3.1390, 101.6869
- Bangkok: 13.7563, 100.5018
- Vietnam/Hanoi: 21.0285, 105.8542
- Vietnam/HCMC: 10.8231, 106.6297

COMMON SINGAPORE LOCATIONS (set needsGeocode: true for these):
- NTU (Nanyang Technological University): 1.3483, 103.6831
- NUS (National University of Singapore): 1.2966, 103.7764
- Marina Bay: 1.2806, 103.8586
- Orchard Road: 1.3048, 103.8318
- Changi Airport: 1.3644, 103.9915
- Sentosa: 1.2494, 103.8303

OPTIONAL PARAMETERS (only if explicitly mentioned):
- locationBias: circle with center (lat, lng) and radius in meters
  NOTE: Frontend will convert this to locationRestriction for strict radius enforcement
- priceLevels: ["PRICE_LEVEL_INEXPENSIVE"] for "cheap", ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"] for "expensive"
- minRating: 4.0 for "good ratings", 4.5 for "excellent"
- openNow: true if "open now" mentioned
- includedType: single type like "restaurant", "cafe", "hotel" (optional, helps narrow results)

EXAMPLES:
"Find vegetarian restaurants near me" → 
{{"textQuery": "vegetarian restaurants", "locationBias": {{"circle": {{"center": {{"latitude": {lat}, "longitude": {lng}}}, "radius": 5000}}}}}}

"Restaurants near NTU" →
{{"textQuery": "restaurants near NTU", "needsGeocode": true, "geocodeLocation": "NTU Singapore", "radius": 5000}}

"Coffee shops at Marina Bay" →
{{"textQuery": "coffee shops at Marina Bay", "needsGeocode": true, "geocodeLocation": "Marina Bay Singapore", "radius": 3000}}

"Plan a 3-day trip to Singapore" →
{{"textQuery": "tourist attractions in Singapore", "locationBias": {{"circle": {{"center": {{"latitude": 1.3521, "longitude": 103.8198}}, "radius": 10000}}}}}}

"Cheap breakfast places open now" →
{{"textQuery": "cheap breakfast restaurants", "priceLevels": ["PRICE_LEVEL_INEXPENSIVE"], "openNow": true, "locationBias": {{"circle": {{"center": {{"latitude": {lat}, "longitude": {lng}}}, "radius": 5000}}}}}}

"Pet-friendly cafes near Orchard Road" →
{{"textQuery": "pet-friendly cafes near Orchard Road", "needsGeocode": true, "geocodeLocation": "Orchard Road Singapore", "radius": 2000}}

Output ONLY valid JSON (omit optional params if not needed):

FOR QUERIES WITH SPECIFIC LOCATION (e.g., "near NTU", "at Marina Bay"):
{{
  "textQuery": "refined natural language query",
  "needsGeocode": true,
  "geocodeLocation": "specific location to geocode",
  "radius": 5000,
  "minRating": 4.0,
  "openNow": false,
  "priceLevels": ["PRICE_LEVEL_MODERATE"]
}}

FOR QUERIES USING CURRENT LOCATION (e.g., "near me"):
{{
  "textQuery": "refined natural language query",
  "locationBias": {{"circle": {{"center": {{"latitude": 1.29, "longitude": 103.77}}, "radius": 5000}}}},
  "minRating": 4.0,
  "openNow": false,
  "priceLevels": ["PRICE_LEVEL_MODERATE"]
}}"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Log response for debugging
            logger.info(f"Places LLM response length: {len(response_text)} chars")
            if not response_text or len(response_text.strip()) == 0:
                logger.warning("⚠️ Places branch received empty response from LLM")
                return {"success": False, "error": "Empty response from LLM"}
            
            logger.debug(f"Places response preview: {response_text[:300]}")
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                places_data = json.loads(json_str)
                
                # Validate required field
                if not places_data.get('textQuery'):
                    logger.warning(f"⚠️ Places branch missing textQuery. Data: {places_data}")
                    return {"success": False, "error": "Missing required textQuery"}
                
                logger.info(f"📍 Places Text Search: \"{places_data.get('textQuery')}\"")
                logger.info(f"📍 Places params: {json.dumps({k: v for k, v in places_data.items() if k != 'textQuery'}, indent=2)}")
                
                return {"success": True, "data": places_data, "type": "search"}
            
            logger.warning(f"⚠️ No JSON found in places response: {response_text[:500]}")
            return {"success": False, "error": "Could not parse places data - no JSON found"}
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in places branch: {e}")
            logger.error(f"Raw response: {response_text[:500]}")
            return {"success": False, "error": f"JSON parsing error: {str(e)}"}
        except Exception as e:
            logger.error(f"Error in places branch: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _execute_checklist_branch(
        self,
        user_query: str,
        context: Dict[str, Any],
        clarifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Checklist branch - generate checklist"""
        prompt = f"""Generate a concise travel checklist based on the user's request.

User Query: "{user_query}"
Context: {json.dumps(context)}

Create a comprehensive checklist with these categories (keep items concise):

1. Pre-Departure Preparations - Passport (6+ months validity), visa if needed, travel insurance, SG Arrival Card (for Singapore), vaccinations
2. Packing Essentials - Documents, phone/charger, power adapter (specify voltage), money, medications
3. Packing Clothing - Weather-appropriate clothes, walking shoes, jacket for AC, umbrella
4. Arrival Procedures - Immigration, customs (country-specific rules), SIM card, transport card
5. Must-Do Activities - Top 5-7 attractions and experiences
6. Optional Activities - Additional places if time permits
7. Souvenirs & Shopping - Popular items, packing tips, customs limits
8. Before Departure - Final checks, airport timing, luggage limits

IMPORTANT:
- Keep each item under 100 characters
- Use "high" for essentials, "medium" for important, "low" for optional
- Include country-specific requirements (e.g., SG Arrival Card for Singapore, ESTA for USA)
- Output ONLY valid JSON, no markdown

Format:
{{
  "type": "comprehensive",
  "title": "[Destination] Trip Checklist",
  "categories": [
    {{
      "category": "Category Name",
      "items": [
        {{"text": "Brief item description", "checked": false, "priority": "high|medium|low"}}
      ]
    }}
  ]
}}

Now generate the checklist as JSON:"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Log the response for debugging
            logger.info(f"Checklist LLM response length: {len(response_text)} chars")
            if not response_text or len(response_text.strip()) == 0:
                logger.warning("⚠️ Checklist branch received empty response from LLM")
                return {"success": False, "error": "Empty response from LLM"}
            
            # Log FULL response for debugging (not truncated)
            logger.info(f"📋 Full checklist response:\n{response_text}")
            
            # Remove markdown code blocks if present
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
                logger.info("📝 Removed markdown JSON code block")
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
                logger.info("📝 Removed markdown code block")
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                
                # Log the extracted JSON
                logger.info(f"🔍 Extracted JSON ({len(json_str)} chars):\n{json_str}")
                
                try:
                    checklist_data = json.loads(json_str)
                    logger.info(f"✅ Checklist branch: {checklist_data.get('title')} ({len(checklist_data.get('items', []))} items)")
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
                                return {"success": True, "data": checklist_data, "type": "checklist"}
                    except Exception as fix_error:
                        logger.error(f"❌ Failed to fix JSON: {fix_error}")
                    raise parse_error
            
            logger.warning(f"⚠️ No JSON found in checklist response")
            return {"success": False, "error": "Could not parse checklist data - no JSON found"}
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in checklist branch: {e}")
            return {"success": False, "error": f"JSON parsing error: {str(e)}"}
        except Exception as e:
            logger.error(f"Error in checklist branch: {e}", exc_info=True)
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

Provide a helpful, friendly response. Keep it concise (2-3 paragraphs max)."""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            logger.info(f"💬 Text branch: Generated response ({len(response_text)} chars)")
            return {"success": True, "data": {"message": response_text}, "type": "text"}
        except Exception as e:
            logger.error(f"Error in text branch: {e}")
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
        
        logger.info(f"🚀 Executing {len(enabled_branches)} branches: {[b.branch for b in enabled_branches]}")
        
        try:
            for branch in sorted(enabled_branches, key=lambda x: x.priority):
                if branch.branch == "routes":
                    tasks.append(self._execute_routes_branch(user_query, context, clarifications))
                elif branch.branch == "places":
                    tasks.append(self._execute_places_branch(user_query, context, clarifications))
                elif branch.branch == "checklist":
                    tasks.append(self._execute_checklist_branch(user_query, context, clarifications))
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
        map_actions = []
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
            
            if result_type == 'route':
                map_actions.append(MapAction(type="route", data=data))
                logger.info(f"  ✅ Added route action")
            elif result_type == 'search':
                map_actions.append(MapAction(type="search", data=data))
                logger.info(f"  ✅ Added search action")
            elif result_type == 'checklist':
                app_actions.append(AppAction(type="checklist", data=data))
                logger.info(f"  ✅ Added checklist action with {len(data.get('items', []))} items")
            elif result_type == 'text':
                text_responses.append(data.get('message', ''))
                logger.info(f"  ✅ Added text response")
        
        # Generate final message
        prompt = f"""Generate a friendly response summarizing the results.

User Query: "{user_query}"

Results:
- Route actions: {len([a for a in map_actions if a.type == 'route'])}
- Place searches: {len([a for a in map_actions if a.type == 'search'])}
- Checklists: {len([a for a in app_actions if a.type == 'checklist'])}
- Text responses: {len(text_responses)}

Branch Results:
{json.dumps(branch_results, indent=2)}

Generate a 1-2 sentence friendly response that:
1. Confirms what you found
2. Directs user to check the map/checklist if applicable
3. Is conversational and helpful

Example: "I've found 15 restaurants near you and created a route to the top-rated one. Check the map and your personalized checklist!"

Output only the message text (no JSON, no formatting):"""

        try:
            response = await self.llm.ainvoke(prompt)
            final_message = response.content if hasattr(response, 'content') else str(response)
            final_message = final_message.strip()
        except Exception as e:
            logger.error(f"Error generating final message: {e}")
            # Fallback message
            if text_responses:
                final_message = text_responses[0]
            elif map_actions:
                final_message = "I've found some results for you. Check the map for details!"
            elif app_actions:
                final_message = "I've created a checklist for you. Check it out below!"
            else:
                final_message = "I've processed your request. Let me know if you need anything else!"
        
        # Generate suggestions
        suggestions = []
        if any(a.type == 'search' for a in map_actions):
            suggestions.append("Would you like me to filter by price or rating?")
        if any(a.type == 'route' for a in map_actions):
            suggestions.append("Need parking information at your destination?")
        if app_actions:
            suggestions.append("Would you like to export or share this checklist?")
        
        logger.info(f"✨ Final response: {len(map_actions)} map actions, {len(app_actions)} app actions")
        
        return {
            "message": final_message,
            "map_actions": map_actions,
            "app_actions": app_actions,
            "suggestions": suggestions[:2]  # Max 2 suggestions
        }
    
    async def create_session(self, user_id: str, session_id: str = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a new chat session
        
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
            "chat_history": [],
            "metadata": metadata or {}
        }
        
        if self.redis:
            await self.redis.set_session(session_id, session_data)
        else:
            self._memory_sessions[session_id] = session_data
            
        logger.info(f"Created session {session_id} for user {user_id}")
        
        return session_id
    
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
            
            # Build chat history
            chat_history_str = self._build_chat_history_string(session_data.get("chat_history", []))
            
            # Prepare context with defaults
            if not context:
                context = {}
            if 'current_location' not in context:
                context['current_location'] = {"name": "Unknown", "lat": 1.2894, "lng": 103.8499}
            
            # ==================== PHASE 1: INTENT CLASSIFICATION ====================
            logger.info("📊 PHASE 1: Classifying intent and deciding branches...")
            branches = await self._classify_intent_and_decide_branches(message, context)
            
            # ==================== PHASE 2: CLARIFICATION COLLECTION ====================
            clarification_result = await self._collect_clarifications(branches)
            
            # If clarifications are needed, return them to frontend
            if clarification_result.get('has_clarifications'):
                logger.info("❓ PHASE 2: Clarifications needed from user")
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
                        "branches": [{"branch": b.branch, "enabled": b.enabled} for b in branches]
                    }
                )
            
            # ==================== PHASE 3: BRANCH EXECUTION ====================
            logger.info("⚙️ PHASE 3: Executing branches...")
            clarifications = {}  # In future, this would come from user's clarification response
            branch_results = await self._execute_branches(
                branches, message, context, clarifications, chat_history_str
            )
            
            # ==================== PHASE 4: RESULT AGGREGATION ====================
            logger.info("🔗 PHASE 4: Aggregating results...")
            aggregated = await self._aggregate_results(branch_results, message, context)
            
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
                    "branches_executed": [b.branch for b in branches if b.enabled]
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
    
    def _build_chat_history_string(self, history: List[Dict[str, str]]) -> str:
        """Convert stored history to string format for ReAct agent"""
        if not history:
            return "No previous conversation."
        
        history_lines = []
        for msg in history[-5:]:  # Only last 5 messages
            role = "Human" if msg["role"] == "user" else "AI"
            history_lines.append(f"{role}: {msg['content']}")
        
        return "\n".join(history_lines)
    
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
    
    def _parse_map_actions(self, response: str) -> List[MapAction]:
        """Parse map action commands from agent response"""
        actions = []
        import re
        import json as json_module
        
        logger.info(f"🔍 Parsing map actions from response (length: {len(response)} chars)")
        logger.info(f"🔍 Response preview: {response[:500]}")
        
        # Search for [MAP_SEARCH:{json}] pattern (new format with JSON)
        search_pattern = r'\[MAP_SEARCH:(\{[^\]]+\})\]'
        for match in re.finditer(search_pattern, response):
            try:
                search_data = json_module.loads(match.group(1))
                actions.append(MapAction(
                    type="search",
                    data=search_data
                ))
            except json_module.JSONDecodeError:
                logger.warning(f"Failed to parse MAP_SEARCH JSON: {match.group(1)}")
        
        # Legacy search pattern [MAP_SEARCH:simple_query]
        legacy_search_pattern = r'\[MAP_SEARCH:([^\]]+)\]'
        for match in re.finditer(legacy_search_pattern, response):
            query = match.group(1).strip()
            if not query.startswith('{'):  # Not a JSON object
                actions.append(MapAction(
                    type="search",
                    data={"query": query}
                ))
        
        # Search for [MAP_ROUTE:{json}] pattern
        route_pattern = r'\[MAP_ROUTE:(\{[^\]]+\})\]'
        for match in re.finditer(route_pattern, response):
            try:
                route_data = json_module.loads(match.group(1))
                actions.append(MapAction(
                    type="route",
                    data=route_data
                ))
            except json_module.JSONDecodeError:
                logger.warning(f"Failed to parse MAP_ROUTE JSON: {match.group(1)}")
        
        # Search for [MAP_DIRECTIONS:destination] pattern (legacy)
        directions_pattern = r'\[MAP_DIRECTIONS:([^\]]+)\]'
        for match in re.finditer(directions_pattern, response):
            destination = match.group(1).strip()
            if not destination.startswith('{'):  # Not a JSON object
                actions.append(MapAction(
                    type="directions",
                    data={"destination": destination}
                ))
        
        # Search for [MAP_PLACE_DETAILS:place_id] pattern
        details_pattern = r'\[MAP_PLACE_DETAILS:([^\]]+)\]'
        for match in re.finditer(details_pattern, response):
            actions.append(MapAction(
                type="place_details",
                data={"place_id": match.group(1).strip()}
            ))
        
        # Search for [MAP_MARKER:lat,lng,label] pattern
        marker_pattern = r'\[MAP_MARKER:([0-9.-]+),([0-9.-]+),([^\]]+)\]'
        for match in re.finditer(marker_pattern, response):
            actions.append(MapAction(
                type="marker",
                data={
                    "location": {
                        "lat": float(match.group(1)),
                        "lng": float(match.group(2))
                    },
                    "label": match.group(3).strip()
                }
            ))
        
        # Search for [MAP_ZOOM:level] pattern
        zoom_pattern = r'\[MAP_ZOOM:([0-9]+)\]'
        for match in re.finditer(zoom_pattern, response):
            actions.append(MapAction(
                type="zoom",
                data={"zoom": int(match.group(1))}
            ))
        
        logger.info(f"🔍 Found {len(actions)} map actions")
        if actions:
            for action in actions:
                logger.info(f"  - {action.type}: {action.data}")
        
        return actions
