"""
Quick test script to debug agent message processing
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_agent():
    from services.agent_service import AgentService
    from services.redis_service import RedisService
    import logging
    
    logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    
    # Initialize
    redis_service = RedisService()
    try:
        await redis_service.connect()
        logger.info("✅ Redis connected")
    except:
        logger.warning("⚠️ Redis not available, using in-memory storage")
        redis_service = None
    
    agent_service = AgentService(redis_service)
    logger.info("✅ Agent service initialized")
    
    # Create session
    user_id = "test_user"
    session_id = await agent_service.create_session(user_id)
    logger.info(f"✅ Session created: {session_id}")
    
    # Test message
    test_message = "Find restaurants near me"
    logger.info(f"\n{'='*60}")
    logger.info(f"TEST: Sending message: '{test_message}'")
    logger.info(f"{'='*60}\n")
    
    context = {
        "current_location": {
            "name": "Times Square, NYC",
            "lat": 40.758,
            "lng": -73.9855
        }
    }
    
    try:
        response = await agent_service.process_message(
            user_id=user_id,
            session_id=session_id,
            message=test_message,
            context=context
        )
        
        print(f"\n{'='*60}")
        print(f"RESPONSE:")
        print(f"{'='*60}")
        print(f"Message: {response.message}")
        print(f"Map Actions: {response.map_actions}")
        print(f"Metadata: {response.metadata}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(test_agent())
