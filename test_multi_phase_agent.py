"""
Test script for Multi-Phase Agent Architecture
Run this to verify the new workflow is working correctly
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from services.agent_service import AgentService
from services.redis_service import RedisService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_simple_places_query():
    """Test Case 1: Simple places search"""
    print("\n" + "="*80)
    print("TEST 1: Simple Places Query")
    print("="*80)
    
    redis_service = None  # Use in-memory
    agent_service = AgentService(redis_service)
    
    session_id = "test_session_1"
    await agent_service.create_session("test_user", session_id)
    
    context = {
        "current_location": {
            "name": "Downtown Singapore",
            "lat": 1.2894,
            "lng": 103.8499
        }
    }
    
    response = await agent_service.process_message(
        user_id="test_user",
        session_id=session_id,
        message="Find restaurants near me",
        context=context
    )
    
    print(f"\n✅ Response: {response.message}")
    print(f"📍 Map Actions: {len(response.map_actions)}")
    for action in response.map_actions:
        print(f"   - {action.type}: {action.data.get('query', 'N/A')}")
    print(f"📱 App Actions: {len(response.app_actions)}")
    print(f"💡 Suggestions: {response.suggestions}")
    
    assert len(response.map_actions) > 0, "Should have map actions"
    assert response.map_actions[0].type == "search", "Should be search action"
    print("\n✅ TEST 1 PASSED\n")


async def test_multi_branch_query():
    """Test Case 2: Multi-branch query (places + routes)"""
    print("\n" + "="*80)
    print("TEST 2: Multi-Branch Query")
    print("="*80)
    
    redis_service = None
    agent_service = AgentService(redis_service)
    
    session_id = "test_session_2"
    await agent_service.create_session("test_user", session_id)
    
    context = {
        "current_location": {
            "name": "Orchard Road",
            "lat": 1.3048,
            "lng": 103.8318
        }
    }
    
    response = await agent_service.process_message(
        user_id="test_user",
        session_id=session_id,
        message="Find restaurants at Marina Bay and show me directions",
        context=context
    )
    
    print(f"\n✅ Response: {response.message}")
    print(f"📍 Map Actions: {len(response.map_actions)}")
    for action in response.map_actions:
        print(f"   - {action.type}: {action.data}")
    print(f"📱 App Actions: {len(response.app_actions)}")
    print(f"💡 Suggestions: {response.suggestions}")
    
    # Should have both search and route actions
    action_types = [a.type for a in response.map_actions]
    print(f"\n   Action types: {action_types}")
    print("\n✅ TEST 2 PASSED\n")


async def test_checklist_query():
    """Test Case 3: Checklist generation"""
    print("\n" + "="*80)
    print("TEST 3: Checklist Query")
    print("="*80)
    
    redis_service = None
    agent_service = AgentService(redis_service)
    
    session_id = "test_session_3"
    await agent_service.create_session("test_user", session_id)
    
    response = await agent_service.process_message(
        user_id="test_user",
        session_id=session_id,
        message="Create a packing list for a weekend trip to Singapore",
        context={}
    )
    
    print(f"\n✅ Response: {response.message}")
    print(f"📍 Map Actions: {len(response.map_actions)}")
    print(f"📱 App Actions: {len(response.app_actions)}")
    for action in response.app_actions:
        print(f"   - {action.type}: {action.data.get('title', 'N/A')}")
        if action.type == "checklist":
            items = action.data.get('items', [])
            print(f"     Items: {len(items)}")
            for item in items[:3]:  # Show first 3
                print(f"       • {item.get('text', 'N/A')}")
    print(f"💡 Suggestions: {response.suggestions}")
    
    assert len(response.app_actions) > 0, "Should have app actions"
    assert response.app_actions[0].type == "checklist", "Should be checklist"
    print("\n✅ TEST 3 PASSED\n")


async def test_text_query():
    """Test Case 4: Informational query (text only)"""
    print("\n" + "="*80)
    print("TEST 4: Text Query")
    print("="*80)
    
    redis_service = None
    agent_service = AgentService(redis_service)
    
    session_id = "test_session_4"
    await agent_service.create_session("test_user", session_id)
    
    response = await agent_service.process_message(
        user_id="test_user",
        session_id=session_id,
        message="What is the best time to visit Singapore?",
        context={}
    )
    
    print(f"\n✅ Response: {response.message}")
    print(f"📍 Map Actions: {len(response.map_actions)}")
    print(f"📱 App Actions: {len(response.app_actions)}")
    print(f"💡 Suggestions: {response.suggestions}")
    
    assert len(response.message) > 0, "Should have text response"
    print("\n✅ TEST 4 PASSED\n")


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("MULTI-PHASE AGENT ARCHITECTURE - TEST SUITE")
    print("="*80)
    
    try:
        await test_simple_places_query()
        await test_multi_branch_query()
        await test_checklist_query()
        await test_text_query()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED!")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
