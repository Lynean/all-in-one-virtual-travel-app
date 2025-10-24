import logging
import uuid
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage

from config import settings
from services.redis_service import RedisService
from tools.weather_tool import WeatherTool
from tools.currency_tool import CurrencyTool
from models.responses import ChatResponse

logger = logging.getLogger(__name__)


class AgentService:
    """Simplified agent service for travel planning requirement extraction"""
    
    def __init__(self, redis_service: RedisService):
        self.redis = redis_service
        self._memory_sessions: Dict[str, Dict[str, Any]] = {}
        self.llm = self._initialize_llm()
        self.tools = self._initialize_tools()
    
    def _initialize_llm(self) -> ChatGoogleGenerativeAI:
        """Initialize Gemini LLM"""
        try:
            return ChatGoogleGenerativeAI(
                model=settings.primary_model,
                temperature=0.1,
                max_output_tokens=settings.max_tokens,
                google_api_key=settings.gemini_api_key,
                convert_system_message_to_human=True,
                timeout=30,
                max_retries=2,
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
        """Initialize agent tools"""
        return [WeatherTool(), CurrencyTool()]
    
    # ==================== REQUIREMENT EXTRACTION ====================
    
    async def _extract_all_requirements(
        self,
        user_query: str,
        persistent_context: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract any travel requirements in ONE LLM call"""

        # Get stored requirements
        prompt = f"""Extract ANY travel planning information from the conversation.


User Query: "{user_query}"

Stored Context:
{json.dumps(persistent_context, indent=2)}
Provided Context:
{json.dumps(context, indent=2)}
If user change their preference, feel free to modify the Stored Context. EXTRACT and return ONLY valid JSON (update only fields mentioned in the query):

{{
  "requirements": {{
    "desired_location": "destination (null if not mentioned in THIS query)",
    "current_location": "user's location (null if not mentioned in THIS query)",
    "number_of_days": "trip duration (null if not mentioned in THIS query)",
    "number_of_pax": "number of people (null if not mentioned in THIS query, 1 if solo)",
    "interests": ["food", "scenery"] or null (only if mentioned in THIS query),
    "total_budget": "amount with currency (null if not mentioned in THIS query)",
    "accommodation": "hotel/hostel/airbnb (null if not mentioned in THIS query)",
    "dietary_restrictions": "halal/vegetarian/none (null if not mentioned in THIS query)",
    "travel_preference": {{
      "max_distance_km": 10,
      "transport_mode": "bus/taxi/rental/walking",
      "max_travel_time_hours": null
    }},
    "specific_places": ["place1"] or null,
    "specific_activities": ["activity1"] or null
  }}
}}

IMPORTANT: Extract what is mentioned in the current query and merge it with the existing context."""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(response_text[json_start:json_end])
                return result.get('requirements', {})
            
            return {}
        except Exception as e:
            logger.error(f"Error extracting requirements: {e}")
            return {}
    
    def _check_action_requirements(
        self,
        action_type: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if requirements are met for specific action type"""
        
        action_lower = action_type.lower()
        
        if action_lower == "checklist":
            compulsory = {
                "desired_location": requirements.get("desired_location"),
                "current_location": requirements.get("current_location"),
                "number_of_days": requirements.get("number_of_days"),
                "number_of_pax": requirements.get("number_of_pax")
            }
            optional = {
                "accommodation": requirements.get("accommodation"),
                "interests": requirements.get("interests"),
                "dietary_restrictions": requirements.get("dietary_restrictions")
            }
            
            ready = all(v is not None and v != "" and (not isinstance(v, (list, dict)) or len(v) > 0) 
                       for v in compulsory.values())
            
            return {"checklist": {"compulsory": compulsory, "optional": optional, "ready": ready}}
        
        elif action_lower == "itinerary":
            desired_loc = requirements.get("desired_location")
            desired_locations = [desired_loc] if isinstance(desired_loc, str) else desired_loc
            
            compulsory = {
                "desired_locations": desired_locations,
                "interests": requirements.get("interests"),
                "number_of_days": requirements.get("number_of_days")
            }
            optional = {
                "travel_preference": requirements.get("travel_preference"),
                "specific_attractions": requirements.get("specific_attractions")
            }
            
            interests = requirements.get("interests") or []
            ready = (
                desired_locations is not None and 
                len(desired_locations) > 0 and
                len(interests) >= 2 and
                requirements.get("number_of_days") is not None
            )
            
            return {"itinerary": {"compulsory": compulsory, "optional": optional, "ready": ready}}
        
        elif action_lower == "budget":
            desired_loc = requirements.get("desired_location")
            desired_locations = [desired_loc] if isinstance(desired_loc, str) else desired_loc
            
            compulsory = {
                "total_budget": requirements.get("total_budget"),
                "desired_locations": desired_locations,
                "current_location": requirements.get("current_location")
            }
            optional = {
                "dietary_preference": requirements.get("dietary_restrictions"),
                "travel_preference": requirements.get("travel_preference"),
                "specific_places": requirements.get("specific_places")
            }
            
            ready = all(v is not None and v != "" and (not isinstance(v, (list, dict)) or len(v) > 0) 
                       for v in compulsory.values())
            
            return {"budget": {"compulsory": compulsory, "optional": optional, "ready": ready}}
        
        return {}
    
    # ==================== CONTEXT EXTRACTION ====================
    
    async def _extract_context_from_message(
        self,
        message: str,
        current_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract key information from user message"""
        prompt = f"""Extract key travel information from this message.

User Message: "{message}"
Current Context: {json.dumps(current_context)}

Extract and return ONLY valid JSON:
{{
  "requirements": {{
    "desired_location": "destination (null if not mentioned in THIS query)",
    "current_location": "user's location (null if not mentioned in THIS query)",
    "number_of_days": "trip duration (null if not mentioned in THIS query)",
    "number_of_pax": "number of people (null if not mentioned in THIS query, 1 if solo)",
    "interests": ["food", "scenery"] or null (only if mentioned in THIS query),
    "total_budget": "amount with currency (null if not mentioned in THIS query)",
    "accommodation": "hotel/hostel/airbnb (null if not mentioned in THIS query)",
    "dietary_restrictions": "halal/vegetarian/none (null if not mentioned in THIS query)",
    "travel_preference": {{
      "max_distance_km": 10,
      "transport_mode": "bus/taxi/rental/walking",
      "max_travel_time_hours": null
    }},
    "specific_places": ["place1"] or null,
    "specific_activities": ["activity1"] or null
  }}
}}"""

        try:
            response = await self.llm.ainvoke(prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(response_text[json_start:json_end])
            
            return {}
        except Exception as e:
            logger.error(f"Error extracting context: {e}")
            return {}
    
    # ==================== SESSION MANAGEMENT ====================
    
    async def create_session(self, user_id: str, session_id: str = None, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Create a new chat session"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        session_data = {
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "chat_history": [],
            "persistent_context": {
                "desired_location": "",
                "specific_places": [],
                "specific_activities": [],
                "current_location": "",
                "interests": [],
                "number_of_days": None,
                "number_of_pax": None,
                "total_budget": None,
                "travel_preference": {},
                "current_location": None,
                "created_items": {"checklists": [], "itineraries": [], "budgets": []}
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
        """Get or create session for user"""
        return await self.create_session(user_id)
    
    async def is_session_active(self, session_id: str) -> bool:
        """Check if session is active (used within 24 hours)"""
        if self.redis:
            session_data = await self.redis.get_session(session_id)
        else:
            session_data = self._memory_sessions.get(session_id)
        
        if not session_data:
            return False
        
        try:
            last_activity = datetime.fromisoformat(session_data["last_activity"])
            time_since_activity = datetime.utcnow() - last_activity
            return time_since_activity.total_seconds() < 86400  # 24 hours
        except:
            return False
    
    async def delete_session(self, session_id: str, user_id: str):
        """Delete a session"""
        if self.redis:
            await self.redis.delete_session(session_id)
        else:
            self._memory_sessions.pop(session_id, None)
        
        logger.info(f"Deleted session {session_id}")
    
    # ==================== MESSAGE PROCESSING ====================
    
    async def process_message(
        self,
        user_id: str,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ChatResponse:
        """Process user message - single-phase requirement extraction"""
        try:
            logger.info(f"🎯 Processing: '{message}'")
            
            # Get or create session
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
                raise ValueError(f"Failed to retrieve/create session {session_id}")
            
            # Update last activity
            session_data["last_activity"] = datetime.utcnow().isoformat()
            
            # Extract context from message
            extracted_context = await self._extract_context_from_message(
                message,
                session_data.get("persistent_context", {})
            )
            
            # Update persistent context
            persistent_ctx = session_data.get("persistent_context", {})
            # Merge desired location
            if extracted_context.get("desired_location"):
                persistent_ctx["desired_location"] = extracted_context["desired_location"]
            
            # Merge interests
            if extracted_context.get("interests"):
                persistent_ctx["interests"] = extracted_context["interests"][:10]

            # Update total budget and travel preference
            if extracted_context.get("total_budget"):
                persistent_ctx["total_budget"] = extracted_context["total_budget"]
            if extracted_context.get("travel_preference"):
                persistent_ctx["travel_preference"] = extracted_context["travel_preference"]

            # Update current location based on query context
            if context and context.get('created_items'):
                persistent_ctx["created_items"] = context['created_items']
            if context and context.get('current_location'):
                persistent_ctx["current_location"] = context['current_location']

            if context and context.get('specific_activities'):
                persistent_ctx["specific_activities"] = context['specific_activities']

            if context and context.get('specific_places'):
                persistent_ctx["specific_places"] = context['specific_places']

            if context and context.get('number_of_days'):
                persistent_ctx["number_of_days"] = context['number_of_days']
            if context and context.get('number_of_pax'):
                persistent_ctx["number_of_pax"] = context['number_of_pax']

            session_data["persistent_context"] = persistent_ctx
            
            # Prepare context with defaults
            if not context:
                context = {}
            if 'current_location' not in context:
                context['current_location'] = {"name": None, "lat": None, "lng": None}
            
            # REQUIREMENT EXTRACTION
            logger.info("📊 Extracting requirements...")
            
            # Get previously stored requirements from persistent_ctx itself
            stored_requirements = persistent_ctx
            
            # Extract ALL requirements in ONE LLM call (merges with stored)
            extracted_requirements = await self._extract_all_requirements(
                message,
                persistent_ctx,
                context
            )
            
            # Merge with stored requirements (new values override stored)
            common_requirements = {**stored_requirements, **{k: v for k, v in extracted_requirements.items() if v is not None}}
            
            # Check requirements for all action types
            requirements_status = {}
            for action_type in ["checklist", "itinerary", "budget"]:
                requirements_status[action_type] = self._check_action_requirements(
                    action_type,
                    common_requirements
                )
            
            # Update persistent context with merged requirements
            session_data["persistent_context"] = common_requirements
            
            # Analyze what's ready and what's missing for each action type
            ready_actions = []
            missing_info = {}
            
            for action_key, status in requirements_status.items():
                action_data = status.get(action_key, {})
                compulsory = action_data.get("compulsory", {})
                is_ready = action_data.get("ready", False)
                
                if is_ready:
                    ready_actions.append(action_key)
                else:
                    # Collect missing fields for this action
                    missing_fields = []
                    for field, value in compulsory.items():
                        is_missing = (
                            value is None or 
                            value == "" or 
                            (isinstance(value, (list, dict)) and len(value) == 0)
                        )
                        if is_missing:
                            missing_fields.append(field.replace("_", " "))
                    
                    if missing_fields:
                        missing_info[action_key] = missing_fields
            
            # Build single flat requirement object for response
            flat_requirements = {}
            for key, value in common_requirements.items():
                # Store actual values (not boolean)
                flat_requirements[key] = value
            
            # Build AI response - guide users to complete requirements
            if ready_actions:
                # Some actions are ready
                ready_list = ", ".join(ready_actions)
                
                ai_response_prompt = f"""You are a friendly travel assistant AI. The user said: "{message}"

Current conversation context:
- Stored requirements: {json.dumps(common_requirements, indent=2)}
- Ready actions: {ready_list}

Generate a natural, helpful response that:
1. Answers their question or acknowledges their information
2. Mentions which tools are ready: {ready_list}
3. If not all tools are ready, naturally guide them to provide missing info

Keep response conversational and under 3 sentences."""

                try:
                    ai_response = await self.llm.ainvoke(ai_response_prompt)
                    response_msg = ai_response.content if hasattr(ai_response, 'content') else str(ai_response)
                except Exception as e:
                    logger.error(f"Error generating AI response: {e}")
                    response_msg = f"Great! I can help you create: {ready_list}. Send {{\"app_action\": \"{ready_actions[0]}\"}} to get started."
                    
            elif missing_info:
                # Missing info - guide to complete requirements for all actions
                # Collect all unique missing fields across all actions
                all_missing = set()
                for action_missing in missing_info.values():
                    all_missing.update(action_missing)
                
                ai_response_prompt = f"""You are a friendly travel assistant AI. The user said: "{message}"

Current conversation context:
- Stored requirements: {json.dumps(common_requirements, indent=2)}
- Missing information needed: {list(all_missing)}

Generate a natural, helpful response that:
1. Acknowledges what they shared
2. Naturally mentions 1-2 key pieces of missing information from the list
3. Briefly explains how this helps with travel planning

Keep response conversational and under 3 sentences. Make it sound natural, not like a form."""

                try:
                    ai_response = await self.llm.ainvoke(ai_response_prompt)
                    response_msg = ai_response.content if hasattr(ai_response, 'content') else str(ai_response)
                except Exception as e:
                    logger.error(f"Error generating AI response: {e}")
                    fields_text = ", ".join(list(all_missing)[:2])
                    response_msg = f"Thanks for that info! To help plan your trip, I'd love to know about your {fields_text}."
                    
            else:
                # No specific action - general travel assistant response
                ai_response_prompt = f"""You are a friendly travel assistant AI. The user said: "{message}"

Generate a natural, helpful response that:
1. Answers their question or greets them warmly
2. Mentions you can help with: travel checklists, itineraries, and budgets
3. Asks how you can assist

Keep response conversational and under 2 sentences."""

                try:
                    ai_response = await self.llm.ainvoke(ai_response_prompt)
                    response_msg = ai_response.content if hasattr(ai_response, 'content') else str(ai_response)
                except Exception as e:
                    logger.error(f"Error generating AI response: {e}")
                    response_msg = "Hello! I'm your travel assistant. I can help you create checklists, itineraries, and budgets for your trip. How can I assist you today?"
            
            logger.info(f"📋 Requirements: {len(ready_actions)} ready, {len(missing_info)} incomplete")
            
            # Update session history
            session_data["chat_history"].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            session_data["chat_history"].append({
                "role": "assistant",
                "content": response_msg,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Keep only last 10 messages
            session_data["chat_history"] = session_data["chat_history"][-10:]
            
            # Save session
            if self.redis:
                await self.redis.set_session(session_id, session_data)
            else:
                self._memory_sessions[session_id] = session_data
            
            return ChatResponse(
                session_id=session_id,
                message=response_msg,
                map_actions=[],
                app_actions=[],
                clarifications=[],
                suggestions=[],
                metadata={
                    "model": "gemini-2.5-flash",
                    "phase": "requirement_extraction",
                    "requirements": flat_requirements,
                    "ready_actions": ready_actions
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}", exc_info=True)
            return ChatResponse(
                session_id=session_id,
                message="I encountered an error. Please try again.",
                map_actions=[],
                app_actions=[],
                clarifications=[],
                suggestions=[],
                metadata={"error": True, "error_message": str(e)}
            )
