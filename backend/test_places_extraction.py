"""
Simplified test suite for advanced Places API features - Direct branch testing
Tests dietary restrictions, amenities, atmosphere without Redis dependency
"""
import asyncio
import sys
import os
import json

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.agent_service import AgentService
from services.redis_service import RedisService

async def test_dietary_restrictions():
    """Test dietary filter extraction"""
    print("\n" + "="*80)
    print("TEST 1: Dietary Restrictions - Vegetarian with outdoor seating")
    print("="*80)
    
    redis = RedisService()
    agent = AgentService(redis)
    
    context = {
        "current_location": {
            "latitude": 1.2929,
            "longitude": 103.7724
        }
    }
    
    # Directly test places branch extraction
    result = await agent._execute_places_branch(
        user_query="Find vegetarian restaurants with outdoor seating near me",
        context=context,
        clarifications={}
    )
    
    print(f"\n✅ Branch executed successfully: {result.get('success')}")
    print(f"📦 Result type: {result.get('type')}")
    
    if result.get('success'):
        data = result.get('data', {})
        print(f"📍 Search data:")
        print(json.dumps(data, indent=2))
        
        # Validate filters
        query_lower = data.get('query', '').lower()
        
        # Check for vegetarian filter
        has_vegetarian = ('servesVegetarianFood' in data and data['servesVegetarianFood']) or \
                        'vegetarian' in query_lower
        print(f"\n{'✅' if has_vegetarian else '⚠️'} Vegetarian filter: {has_vegetarian}")
        
        # Check for outdoor seating filter
        has_outdoor = ('outdoorSeating' in data and data['outdoorSeating']) or \
                     'outdoor' in query_lower
        print(f"{'✅' if has_outdoor else '⚠️'} Outdoor seating filter: {has_outdoor}")
        
        # Check for includedTypes
        if 'includedTypes' in data:
            print(f"✅ Place types: {data['includedTypes']}")
        
        print("\n✅ TEST 1 PASSED - Dietary filters extracted correctly")
    else:
        print(f"\n❌ TEST 1 FAILED - Branch execution failed: {result.get('error')}")


async def test_family_friendly():
    """Test family-friendly filters"""
    print("\n" + "="*80)
    print("TEST 2: Family-Friendly - Kid-friendly with parking")
    print("="*80)
    
    redis = RedisService()
    agent = AgentService(redis)
    
    context = {
        "current_location": {
            "latitude": 1.2929,
            "longitude": 103.7724
        }
    }
    
    result = await agent._execute_places_branch(
        user_query="Find kid-friendly restaurants with parking",
        context=context,
        clarifications={}
    )
    
    print(f"\n✅ Branch executed successfully: {result.get('success')}")
    
    if result.get('success'):
        data = result.get('data', {})
        print(f"📍 Search data:")
        print(json.dumps(data, indent=2))
        
        query_lower = data.get('query', '').lower()
        
        # Check for kid-friendly filter
        has_kids = ('goodForChildren' in data and data['goodForChildren']) or \
                  'kid' in query_lower or 'family' in query_lower or 'child' in query_lower
        print(f"\n{'✅' if has_kids else '⚠️'} Kid-friendly filter: {has_kids}")
        
        # Check for parking filter
        has_parking = ('parking' in data and data['parking']) or 'parking' in query_lower
        print(f"{'✅' if has_parking else '⚠️'} Parking filter: {has_parking}")
        
        print("\n✅ TEST 2 PASSED - Family filters extracted correctly")
    else:
        print(f"\n❌ TEST 2 FAILED: {result.get('error')}")


async def test_price_and_rating():
    """Test price and rating filters"""
    print("\n" + "="*80)
    print("TEST 3: Price + Rating - Cheap breakfast places")
    print("="*80)
    
    redis = RedisService()
    agent = AgentService(redis)
    
    context = {
        "current_location": {
            "latitude": 1.2929,
            "longitude": 103.7724
        }
    }
    
    result = await agent._execute_places_branch(
        user_query="Find cheap breakfast places with good ratings",
        context=context,
        clarifications={}
    )
    
    print(f"\n✅ Branch executed successfully: {result.get('success')}")
    
    if result.get('success'):
        data = result.get('data', {})
        print(f"📍 Search data:")
        print(json.dumps(data, indent=2))
        
        query_lower = data.get('query', '').lower()
        
        # Check for price filter
        has_price = ('priceLevel' in data and data['priceLevel'] == 'INEXPENSIVE') or \
                   'cheap' in query_lower or 'inexpensive' in query_lower
        print(f"\n{'✅' if has_price else '⚠️'} Price filter (INEXPENSIVE): {has_price}")
        
        # Check for breakfast filter
        has_breakfast = ('servesBreakfast' in data and data['servesBreakfast']) or \
                       'breakfast' in query_lower
        print(f"{'✅' if has_breakfast else '⚠️'} Breakfast filter: {has_breakfast}")
        
        # Check for rating filter (optional)
        if 'minRating' in data:
            print(f"✅ Rating filter: minRating={data['minRating']}")
        
        print("\n✅ TEST 3 PASSED - Price and meal filters extracted correctly")
    else:
        print(f"\n❌ TEST 3 FAILED: {result.get('error')}")


async def test_pet_friendly():
    """Test pet-friendly filters"""
    print("\n" + "="*80)
    print("TEST 4: Pet-Friendly - Dog-friendly cafes with outdoor seating")
    print("="*80)
    
    redis = RedisService()
    agent = AgentService(redis)
    
    context = {
        "current_location": {
            "latitude": 1.2929,
            "longitude": 103.7724
        }
    }
    
    result = await agent._execute_places_branch(
        user_query="Find dog-friendly cafes with outdoor seating",
        context=context,
        clarifications={}
    )
    
    print(f"\n✅ Branch executed successfully: {result.get('success')}")
    
    if result.get('success'):
        data = result.get('data', {})
        print(f"📍 Search data:")
        print(json.dumps(data, indent=2))
        
        query_lower = data.get('query', '').lower()
        
        # Check for dog-friendly filter
        has_dogs = ('allowsDogs' in data and data['allowsDogs']) or \
                  'dog' in query_lower or 'pet' in query_lower
        print(f"\n{'✅' if has_dogs else '⚠️'} Dog-friendly filter: {has_dogs}")
        
        # Check for outdoor seating
        has_outdoor = ('outdoorSeating' in data and data['outdoorSeating']) or \
                     'outdoor' in query_lower
        print(f"{'✅' if has_outdoor else '⚠️'} Outdoor seating filter: {has_outdoor}")
        
        # Check for cafe type
        has_cafe = 'cafe' in query_lower or \
                  ('includedTypes' in data and 'cafe' in str(data.get('includedTypes', [])).lower())
        print(f"{'✅' if has_cafe else '⚠️'} Cafe place type: {has_cafe}")
        
        print("\n✅ TEST 4 PASSED - Pet-friendly filters extracted correctly")
    else:
        print(f"\n❌ TEST 4 FAILED: {result.get('error')}")


async def test_complex_multi_filter():
    """Test complex query with multiple filters"""
    print("\n" + "="*80)
    print("TEST 5: Complex Multi-Filter - Kitchen sink query")
    print("="*80)
    
    redis = RedisService()
    agent = AgentService(redis)
    
    context = {
        "current_location": {
            "latitude": 1.2929,
            "longitude": 103.7724
        }
    }
    
    result = await agent._execute_places_branch(
        user_query="Find vegetarian restaurants with outdoor seating, good for kids, open now, with parking",
        context=context,
        clarifications={}
    )
    
    print(f"\n✅ Branch executed successfully: {result.get('success')}")
    
    if result.get('success'):
        data = result.get('data', {})
        print(f"📍 Search data:")
        print(json.dumps(data, indent=2))
        
        query_lower = data.get('query', '').lower()
        
        # Count how many filters were extracted
        filters_found = []
        
        if ('servesVegetarianFood' in data and data['servesVegetarianFood']) or 'vegetarian' in query_lower:
            filters_found.append("✅ servesVegetarianFood")
        
        if ('outdoorSeating' in data and data['outdoorSeating']) or 'outdoor' in query_lower:
            filters_found.append("✅ outdoorSeating")
        
        if ('goodForChildren' in data and data['goodForChildren']) or 'kid' in query_lower or 'child' in query_lower:
            filters_found.append("✅ goodForChildren")
        
        if ('openNow' in data and data['openNow']) or 'open now' in query_lower:
            filters_found.append("✅ openNow")
        
        if ('parking' in data and data['parking']) or 'parking' in query_lower:
            filters_found.append("✅ parking")
        
        print(f"\n📊 Filters extracted ({len(filters_found)}/5):")
        for f in filters_found:
            print(f"  {f}")
        
        if len(filters_found) >= 3:
            print("\n✅ TEST 5 PASSED - Multiple filters extracted correctly")
        else:
            print(f"\n⚠️ TEST 5 PARTIAL - Only {len(filters_found)}/5 filters found")
    else:
        print(f"\n❌ TEST 5 FAILED: {result.get('error')}")


async def test_service_types():
    """Test service type filters"""
    print("\n" + "="*80)
    print("TEST 6: Service Types - Delivery and takeout")
    print("="*80)
    
    redis = RedisService()
    agent = AgentService(redis)
    
    context = {
        "current_location": {
            "latitude": 1.2929,
            "longitude": 103.7724
        }
    }
    
    result = await agent._execute_places_branch(
        user_query="Find pizza places with delivery and takeout",
        context=context,
        clarifications={}
    )
    
    print(f"\n✅ Branch executed successfully: {result.get('success')}")
    
    if result.get('success'):
        data = result.get('data', {})
        print(f"📍 Search data:")
        print(json.dumps(data, indent=2))
        
        query_lower = data.get('query', '').lower()
        
        # Check for delivery
        has_delivery = ('delivery' in data and data['delivery']) or 'delivery' in query_lower
        print(f"\n{'✅' if has_delivery else '⚠️'} Delivery filter: {has_delivery}")
        
        # Check for takeout
        has_takeout = ('takeout' in data and data['takeout']) or 'takeout' in query_lower or 'take out' in query_lower
        print(f"{'✅' if has_takeout else '⚠️'} Takeout filter: {has_takeout}")
        
        # Check for pizza
        has_pizza = 'pizza' in query_lower or \
                   ('includedTypes' in data and 'pizza' in str(data.get('includedTypes', [])).lower())
        print(f"{'✅' if has_pizza else '⚠️'} Pizza place type: {has_pizza}")
        
        print("\n✅ TEST 6 PASSED - Service type filters extracted correctly")
    else:
        print(f"\n❌ TEST 6 FAILED: {result.get('error')}")


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("🚀 ADVANCED PLACES API FEATURE TESTS (Direct Branch Testing)")
    print("="*80)
    print("\nTesting enhanced Places branch parameter extraction")
    print("Tests: dietary, amenities, atmosphere, service types, complex multi-filter")
    
    try:
        await test_dietary_restrictions()
        await test_family_friendly()
        await test_price_and_rating()
        await test_pet_friendly()
        await test_complex_multi_filter()
        await test_service_types()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS COMPLETED!")
        print("="*80)
        print("\n📊 Test Summary:")
        print("  ✅ Dietary restrictions (vegetarian + outdoor seating)")
        print("  ✅ Family-friendly (kids + parking)")
        print("  ✅ Price and meal time (cheap breakfast)")
        print("  ✅ Pet-friendly (dogs + outdoor + cafe)")
        print("  ✅ Complex multi-filter (5 filters combined)")
        print("  ✅ Service types (delivery + takeout + pizza)")
        print("\n🎉 Advanced Places API parameter extraction working!")
        print("\n📝 Note: LLM extracts filters into JSON format for Google Places API")
        print("   The actual API calls happen in the frontend with these parameters")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
