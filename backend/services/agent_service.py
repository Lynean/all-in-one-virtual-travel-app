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
    
    def _detect_execution_trigger(self, message: str) -> Dict[str, Any]:
        """Detect if user wants to execute app actions"""
        
        # Try parsing as JSON
        try:
            if message.strip().startswith('{'):
                data = json.loads(message)
                if "app_action" in data or "app_actions" in data:
                    actions = data.get("app_action") or data.get("app_actions")
                    if isinstance(actions, str):
                        actions = [actions]
                    
                    logger.info(f"🎯 JSON execution command: {actions}")
                    return {"execute": True, "actions": actions, "format": "json"}
        except json.JSONDecodeError:
            pass
        
        # Check text triggers
        message_lower = message.lower()
        triggers = ["create the checklist", "generate checklist", "create itinerary", "generate itinerary", 
                   "create budget", "generate budget", "create it now", "generate it now"]
        
        for trigger in triggers:
            if trigger in message_lower:
                logger.info(f"🎯 Text execution trigger: '{trigger}'")
                actions = []
                if "checklist" in trigger:
                    actions = ["checklist"]
                elif "itinerary" in trigger:
                    actions = ["itinerary"]
                elif "budget" in trigger:
                    actions = ["budget"]
                else:
                    actions = None
                
                return {"execute": True, "actions": actions, "format": "text"}
        
        return {"execute": False, "actions": None, "format": "text"}
    
    # ==================== REQUIREMENT EXTRACTION ====================
    
    async def _extract_all_requirements(
        self,
        user_query: str,
        persistent_context: Dict[str, Any],
        current_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract ALL travel requirements in ONE LLM call"""
        
        prompt = f"""Extract ALL travel planning information from the conversation.

User Query: "{user_query}"

Persistent Context:
- Destinations: {persistent_context.get('destinations_mentioned', [])}
- Interests: {persistent_context.get('interests', [])}
- Travel style: {persistent_context.get('travel_style')}
- Budget level: {persistent_context.get('budget_level')}

Current Context:
- Current location: {current_context.get('current_location', {})}

EXTRACT and return ONLY valid JSON:

{{
  "requirements": {{
    "desired_location": "destination (null if not mentioned)",
    "current_location": "user's location (null if not available)",
    "number_of_days": "trip duration (null if not mentioned)",
    "number_of_pax": "number of people (null if not mentioned, 1 if solo)",
    "interests": ["food", "scenery"] or null,
    "total_budget": "amount with currency (null if not mentioned)",
    "accommodation": "hotel/hostel/airbnb (null if not mentioned)",
    "dietary_restrictions": "halal/vegetarian/none (null if not mentioned)",
    "travel_preference": {{
      "max_distance_km": 10,
      "transport_mode": "bus/taxi/rental/walking",
      "max_travel_time_hours": null
    }},
    "specific_places": ["place1"] or null,
    "specific_attractions": ["attraction1"] or null
  }}
}}"""

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
  "destinations": ["city1", "city2"],
  "interests": ["food", "culture"],
  "budget_level": "budget"/"mid-range"/"luxury",
  "travel_style": "relaxed"/"packed"/"family"/"solo"/"group"
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
    
    def _build_chat_history_string(self, history: List[Dict[str, str]], persistent_context: Dict[str, Any] = None) -> str:
        """Convert history to string with persistent context"""
        context_parts = []
        
        if persistent_context:
            if persistent_context.get("current_location"):
                loc = persistent_context["current_location"]
                context_parts.append(f"Location: {loc.get('name', 'Unknown')}")
            
            if persistent_context.get("destinations_mentioned"):
                dests = ", ".join(persistent_context["destinations_mentioned"])
                context_parts.append(f"Destinations: {dests}")
            
            if persistent_context.get("interests"):
                interests = ", ".join(persistent_context["interests"])
                context_parts.append(f"Interests: {interests}")
        
        result = []
        if context_parts:
            result.append("=== CONTEXT ===")
            result.extend(context_parts)
            result.append("=== CONVERSATION ===")
        
        for msg in (history[-5:] if history else []):
            role = "Human" if msg["role"] == "user" else "AI"
            result.append(f"{role}: {msg['content']}")
        
        return "\n".join(result) if result else "No previous conversation."
    
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
                "destinations_mentioned": [],
                "interests": [],
                "travel_dates": None,
                "budget_level": None,
                "travel_style": None,
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
            
            # Merge destinations
            if extracted_context.get("destinations"):
                current_dests = persistent_ctx.get("destinations_mentioned", [])
                for dest in extracted_context["destinations"]:
                    if dest and dest not in current_dests:
                        current_dests.append(dest)
                persistent_ctx["destinations_mentioned"] = current_dests[:5]
            
            # Merge interests
            if extracted_context.get("interests"):
                current_interests = persistent_ctx.get("interests", [])
                for interest in extracted_context["interests"]:
                    if interest and interest not in current_interests:
                        current_interests.append(interest)
                persistent_ctx["interests"] = current_interests[:10]
            
            # Update budget level and travel style
            if extracted_context.get("budget_level"):
                persistent_ctx["budget_level"] = extracted_context["budget_level"]
            if extracted_context.get("travel_style"):
                persistent_ctx["travel_style"] = extracted_context["travel_style"]
            
            # Update current location
            if context and context.get('current_location'):
                persistent_ctx["current_location"] = context['current_location']
            
            session_data["persistent_context"] = persistent_ctx
            
            # Prepare context with defaults
            if not context:
                context = {}
            if 'current_location' not in context:
                context['current_location'] = {"name": "Unknown", "lat": 1.2894, "lng": 103.8499}
            
            # REQUIREMENT EXTRACTION
            logger.info("📊 Extracting requirements...")
            
            # Extract ALL requirements in ONE LLM call
            common_requirements = await self._extract_all_requirements(
                message,
                persistent_ctx,
                context
            )
            
            # Check requirements for all action types
            requirements_status = {}
            for action_type in ["checklist", "itinerary", "budget"]:
                requirements_status[action_type] = self._check_action_requirements(
                    action_type,
                    common_requirements
                )
            
            # Generate follow-up questions
            follow_up_questions = []
            ready_actions = []
            
            for action_key, status in requirements_status.items():
                action_data = status.get(action_key, {})
                compulsory = action_data.get("compulsory", {})
                is_ready = action_data.get("ready", False)
                
                if is_ready:
                    ready_actions.append(action_key)
                else:
                    # Find first missing field
                    for field, value in compulsory.items():
                        is_missing = (
                            value is None or 
                            value == "" or 
                            (isinstance(value, (list, dict)) and len(value) == 0)
                        )
                        if is_missing:
                            field_name = field.replace("_", " ").title()
                            follow_up_questions.append(f"What is your {field_name}?")
                            break
            
            # Build response
            if ready_actions:
                ready_list = ", ".join(ready_actions)
                response_msg = f"✅ I have all information for: {ready_list}. "
                response_msg += f"Send {{\"app_action\": \"{ready_actions[0]}\"}} to create it."
            elif follow_up_questions:
                response_msg = follow_up_questions[0]
            else:
                response_msg = "How can I help you plan your trip?"
            
            logger.info(f"📋 Requirements: {len(ready_actions)} ready, {len(follow_up_questions)} missing")
            
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
                    "requirements_status": requirements_status
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
