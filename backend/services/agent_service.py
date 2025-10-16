import logging
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config import settings
from services.redis_service import RedisService
from tools.weather_tool import WeatherTool
from tools.currency_tool import CurrencyTool
from tools.maps_tool import MapsTool
from models.responses import ChatResponse, MapAction

logger = logging.getLogger(__name__)


class AgentService:
    """Main service for LangChain agent operations with Gemini"""
    
    def __init__(self, redis_service: RedisService):
        self.redis = redis_service
        self.llm = self._initialize_llm()
        self.tools = self._initialize_tools()
        self.agent_executor = self._create_agent()
    
    def _initialize_llm(self) -> ChatGoogleGenerativeAI:
        """Initialize Gemini LLM"""
        try:
            return ChatGoogleGenerativeAI(
                model=settings.primary_model,
                temperature=settings.temperature,
                max_output_tokens=settings.max_tokens,
                google_api_key=settings.gemini_api_key,
                convert_system_message_to_human=True  # Gemini compatibility
            )
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {str(e)}")
            raise
    
    def _initialize_tools(self) -> List:
        """Initialize all agent tools"""
        return [
            WeatherTool(),
            CurrencyTool(),
            MapsTool()
        ]
    
    def _create_agent(self) -> AgentExecutor:
        """Create the LangChain agent with Gemini and tools"""
        
        system_message = """You are an expert AI travel guide assistant with strict location verification protocols.

🔒 MANDATORY LOCATION VERIFICATION PROTOCOL:
1. ALWAYS verify user location before providing directions or location-specific recommendations
2. If location is unconfirmed, request confirmation immediately
3. NEVER assume or infer location from context
4. Detect location changes and request fresh confirmation

CAPABILITIES:
- Multi-day trip planning with day-by-day itineraries
- Budget optimization and cost tracking
- Weather-based activity recommendations
- Real-time directions and place searches
- Currency conversion for international travel

TOOLS AVAILABLE:
- get_weather: Fetch current weather and forecasts
- convert_currency: Convert between currencies
- search_places: Find nearby places and attractions
- get_directions: Calculate routes and travel times

RESPONSE GUIDELINES:
- Be conversational and helpful
- Reference confirmed location in responses
- Provide structured itineraries when planning trips
- Include budget breakdowns when relevant
- Suggest alternatives when weather is unfavorable
- Always ask for approval before major changes

MAP COMMANDS:
Use these special commands in your responses to trigger map actions:
- [MAP_SEARCH:query] - Search for places
- [MAP_DIRECTIONS:destination] - Get directions
- [MAP_MARKER:lat,lng,label] - Add custom marker
- [MAP_ZOOM:level] - Adjust zoom level

Remember: User safety and data accuracy are paramount. Never proceed without proper verification."""

        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_message),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessage(content="{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            max_iterations=5,
            handle_parsing_errors=True,
            return_intermediate_steps=False
        )
    
    async def create_session(self, user_id: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a new chat session
        
        Args:
            user_id: User identifier
            metadata: Optional session metadata
        
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        
        session_data = {
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "chat_history": [],
            "metadata": metadata or {},
            "location_confirmed": False
        }
        
        await self.redis.set_session(session_id, session_data)
        logger.info(f"Created session {session_id} for user {user_id}")
        
        return session_id
    
    async def delete_session(self, session_id: str, user_id: str):
        """
        Delete a chat session
        
        Args:
            session_id: Session identifier
            user_id: User identifier for authorization
        """
        session_data = await self.redis.get_session(session_id)
        
        if not session_data:
            raise ValueError(f"Session {session_id} not found")
        
        if session_data.get("user_id") != user_id:
            raise ValueError("Unauthorized session access")
        
        await self.redis.delete_session(session_id)
        logger.info(f"Deleted session {session_id}")
    
    async def process_message(
        self,
        user_id: str,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ChatResponse:
        """
        Process user message with the Gemini-powered agent
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            message: User's message
            context: Additional context (location, preferences, etc.)
        
        Returns:
            ChatResponse with agent's reply and actions
        """
        try:
            # Retrieve session
            session_data = await self.redis.get_session(session_id)
            if not session_data:
                # Create new session if not found
                await self.create_session(user_id)
                session_data = await self.redis.get_session(session_id)
            
            # Build chat history
            chat_history = self._build_chat_history(session_data.get("chat_history", []))
            
            # Add context to message if provided
            enhanced_message = self._enhance_message_with_context(message, context)
            
            # Run agent with Gemini
            result = await self.agent_executor.ainvoke({
                "input": enhanced_message,
                "chat_history": chat_history
            })
            
            agent_response = result.get("output", "I apologize, but I encountered an error processing your request.")
            
            # Update session history
            session_data["chat_history"].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            session_data["chat_history"].append({
                "role": "assistant",
                "content": agent_response,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Keep only last 10 messages
            session_data["chat_history"] = session_data["chat_history"][-10:]
            
            # Update location confirmation status if context provided
            if context and context.get("location_confirmed"):
                session_data["location_confirmed"] = True
            
            # Save session
            await self.redis.set_session(session_id, session_data)
            
            # Parse map actions from response
            map_actions = self._parse_map_actions(agent_response)
            
            return ChatResponse(
                session_id=session_id,
                message=agent_response,
                map_actions=map_actions,
                metadata={
                    "location_confirmed": session_data.get("location_confirmed", False),
                    "model": "gemini-2.5-flash"
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing message with Gemini agent: {str(e)}", exc_info=True)
            return ChatResponse(
                session_id=session_id,
                message=f"⚠️ I encountered an error: {str(e)}. Please try again.",
                map_actions=[],
                metadata={"error": True}
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
    
    def _enhance_message_with_context(self, message: str, context: Optional[Dict[str, Any]]) -> str:
        """Add context information to user message"""
        if not context:
            return message
        
        context_parts = []
        
        if context.get("current_location"):
            loc = context["current_location"]
            context_parts.append(f"Current Location: {loc.get('name', 'Unknown')} ({loc.get('lat')}, {loc.get('lng')})")
        
        if context.get("location_confirmed"):
            context_parts.append("Location Status: ✅ CONFIRMED")
        else:
            context_parts.append("Location Status: ⚠️ UNCONFIRMED")
        
        if context.get("budget"):
            context_parts.append(f"Budget: {context['budget']}")
        
        if context_parts:
            return f"{message}\n\n[Context: {' | '.join(context_parts)}]"
        
        return message
    
    def _parse_map_actions(self, response: str) -> List[MapAction]:
        """Parse map action commands from agent response"""
        actions = []
        
        # Search for [MAP_SEARCH:query] pattern
        import re
        search_pattern = r'\[MAP_SEARCH:([^\]]+)\]'
        for match in re.finditer(search_pattern, response):
            actions.append(MapAction(
                type="search",
                data={"query": match.group(1).strip()}
            ))
        
        # Search for [MAP_DIRECTIONS:destination] pattern
        directions_pattern = r'\[MAP_DIRECTIONS:([^\]]+)\]'
        for match in re.finditer(directions_pattern, response):
            actions.append(MapAction(
                type="directions",
                data={"query": match.group(1).strip()}
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
        
        return actions
