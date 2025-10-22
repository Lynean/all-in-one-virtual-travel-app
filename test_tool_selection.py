"""
Test script for intelligent tool selection system
Tests various user queries to verify the agent selects the correct tools
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from services.agent_service import AgentService
from services.redis_service import RedisService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_tool_selection():
    """Test different query types and tool selection"""
    
    # Initialize services
    redis_service = RedisService()
    try:
        await redis_service.connect()
        logger.info("✅ Redis connected")
    except Exception:
        logger.warning("⚠️ Running without Redis")
        redis_service = None
    
    agent_service = AgentService(redis_service)
    
    # Test cases
    test_queries = [
        {
            "query": "Find good Italian restaurants near me",
            "expected_tool": "search_places",
            "context": {
                "current_location": {
                    "name": "Times Square, NYC",
                    "lat": 40.758,
                    "lng": -73.9855
                },
                "location_confirmed": True
            }
        },
        {
            "query": "How do I get from Times Square to Central Park?",
            "expected_tool": "compute_route",
            "context": {
                "current_location": {
                    "name": "Times Square, NYC",
                    "lat": 40.758,
                    "lng": -73.9855
                },
                "location_confirmed": True
            }
        },
        {
            "query": "What's the weather like today?",
            "expected_tool": "get_weather",
            "context": {
                "current_location": {
                    "name": "New York",
                    "lat": 40.7128,
                    "lng": -74.0060
                }
            }
        },
        {
            "query": "Convert 100 USD to EUR",
            "expected_tool": "convert_currency",
            "context": None
        },
        {
            "query": "Show me museums within 2km",
            "expected_tool": "search_places",
            "context": {
                "current_location": {
                    "name": "Manhattan",
                    "lat": 40.7831,
                    "lng": -73.9712
                },
                "location_confirmed": True
            }
        }
    ]
    
    print("\n" + "="*70)
    print("🧪 TESTING INTELLIGENT TOOL SELECTION")
    print("="*70 + "\n")
    
    user_id = "test_user_001"
    session_id = await agent_service.create_session(user_id)
    
    for i, test_case in enumerate(test_queries, 1):
        print(f"\n{'─'*70}")
        print(f"Test Case {i}/{len(test_queries)}")
        print(f"{'─'*70}")
        print(f"📝 Query: \"{test_case['query']}\"")
        print(f"🎯 Expected Tool: {test_case['expected_tool']}")
        
        try:
            response = await agent_service.process_message(
                user_id=user_id,
                session_id=session_id,
                message=test_case['query'],
                context=test_case['context']
            )
            
            print(f"\n🤖 Agent Response:")
            print(f"{response.message[:200]}..." if len(response.message) > 200 else response.message)
            
            if response.map_actions:
                print(f"\n🗺️  Map Actions Generated:")
                for action in response.map_actions:
                    print(f"   • Type: {action.type}")
                    print(f"     Data: {action.data}")
            
            print(f"\n✅ Test passed!")
            
        except Exception as e:
            print(f"\n❌ Test failed: {str(e)}")
            logger.error(f"Error in test case {i}", exc_info=True)
        
        # Add delay between requests
        await asyncio.sleep(2)
    
    print(f"\n{'='*70}")
    print("✅ All tests completed!")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(test_tool_selection())
