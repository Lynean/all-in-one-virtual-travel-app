import asyncio
import httpx
import json

async def test_agent():
    """Test the agent API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing TravelMate AI Agent Backend...\n")
    
    # Test 1: Health check
    print("1️⃣ Testing health endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{base_url}/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}\n")
    
    # Test 2: Create session
    print("2️⃣ Creating new session...")
    async with httpx.AsyncClient() as client:
        session_data = {
            "user_id": "test_user_123",
            "metadata": {
                "test": True
            }
        }
        response = await client.post(f"{base_url}/api/session/create", json=session_data)
        session_response = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Full Response: {json.dumps(session_response, indent=2)}")
        
        # Check if session_id exists in response
        if "session_id" not in session_response:
            print(f"   ❌ Error: 'session_id' not in response")
            print(f"   Response keys: {list(session_response.keys())}")
            return
        
        session_id = session_response["session_id"]
        print(f"   Session ID: {session_id}\n")
    
    # Test 3: Simple chat message
    print("3️⃣ Testing simple query...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        chat_data = {
            "user_id": "test_user_123",
            "session_id": session_id,
            "message": "Find restaurants near me",
            "context": {
                "current_location": {
                    "lat": 1.290270,
                    "lng": 103.851959,
                    "name": "Singapore"
                },
                "location_confirmed": True
            }
        }
        response = await client.post(f"{base_url}/api/chat", json=chat_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}\n")
    
    # Test 4: Complex query
    print("4️⃣ Testing complex query...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        chat_data = {
            "user_id": "test_user_123",
            "session_id": session_id,
            "message": "Plan a 3-day budget trip to Tokyo with weather considerations",
            "context": {
                "current_location": {
                    "lat": 1.290270,
                    "lng": 103.851959,
                    "name": "Singapore"
                },
                "location_confirmed": True
            }
        }
        response = await client.post(f"{base_url}/api/chat", json=chat_data)
        print(f"   Status: {response.status_code}")
        chat_response = response.json()
        print(f"   Message: {chat_response['message'][:200]}...")
        print(f"   Map Actions: {chat_response.get('map_actions', [])}\n")
    
    print("✅ All tests completed!")

if __name__ == "__main__":
    asyncio.run(test_agent())
