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
1. CHECKLIST: Create task lists, itineraries, packing lists
   - Examples: "create packing list", "plan my day", "things to do in Singapore", "create itinerary"
2. TEXT: Provide information, recommendations, and general assistance
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
      "branch": "text",
      "enabled": true,
      "confidence": 0.9,
      "needs_clarification": false,
      "clarification": null,
      "priority": 2,
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
                
                logger.info(f"✅ Branch decisions: {[f'{b.branch}({b.enabled})' for b in branches]}")
                return branches
            else:
                raise ValueError("No JSON found in response")
                
        except Exception as e:
            logger.error(f"Error in intent classification: {e}")
            # Fallback: enable TEXT branch only
            return [
                BranchDecision(branch="checklist", enabled=False, confidence=0.0, priority=1),
                BranchDecision(branch="text", enabled=True, confidence=1.0, priority=2,
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
- Include country-specific requirements (e.g., SG Arrival Card for Singapore, ESTA for USA)
- Output ONLY valid JSON, no markdown

Format:
{{
  "title": "[Destination] Trip Checklist",
  "categories": [
    {{
      "category": "Category Name",
      "items": [
        {{"text": "Brief item description", "checked": false}}
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
                if branch.branch == "checklist":
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
                logger.info(f"  ✅ Added checklist action with {len(data.get('items', []))} items")
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
        
        # Add checklist acknowledgment if present
        if app_actions:
            checklist_msg = "I've created a checklist for you. Check it out below!"
            message_parts.append(checklist_msg)
            logger.info(f"📋 Added checklist acknowledgment")
        
        # Combine all parts or use fallback
        if message_parts:
            final_message = '\n\n'.join(message_parts)
        else:
            final_message = "I'm here to help with your travel planning. Let me know if you need anything!"
            logger.info(f"❓ Using fallback message")
        
        # Generate suggestions
        suggestions = []
        if app_actions and text_responses:
            # Both present
            suggestions.append("Would you like to customize this checklist?")
            suggestions.append("Need more details about anything?")
        elif app_actions:
            # Only checklist
            suggestions.append("Would you like to customize this checklist?")
            suggestions.append("Need recommendations for your trip?")
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
    
    # ==================== UTILITY METHODS ====================