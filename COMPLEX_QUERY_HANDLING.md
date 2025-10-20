# Handling Complex Queries

## Overview

The AI agent can handle various types of queries, from simple location searches to complex service-specific requests. This document explains how different query types are processed.

---

## Query Types

### 1. **Simple Location Search** ✅ Fully Supported
**Example**: "Find restaurants near me"

**How it works**:
```
User Query → Agent extracts: query="restaurant", location=current
→ search_places tool → Returns places
→ Display markers on map
```

**Agent behavior**: Direct search, displays all results

---

### 2. **City-Wide Search** ✅ Fully Supported
**Example**: "Show me all malls across Singapore"

**How it works**:
```
User Query → Agent detects city-wide scope
→ search_places with radius=50000 (50km)
→ Returns many places across the city
→ Display all markers
```

**Agent behavior**: Uses large radius, one search covers the whole city

---

### 3. **Navigation/Directions** ✅ Fully Supported
**Example**: "Show me direction to Nanyang University"

**How it works**:
```
User Query → Agent extracts: origin=current, destination="Nanyang University"
→ compute_route tool → Returns route
→ Display polyline on map
```

**Agent behavior**: Geocodes destination if needed, shows route

---

### 4. **Specific Place by Name** ✅ Fully Supported
**Example**: "Find Al Amaan food shop"

**How it works**:
```
User Query → Agent detects specific place name
→ search_places (uses Text Search API)
→ Returns specific place
→ Display marker
```

**Agent behavior**: Uses Text Search instead of Nearby Search

---

### 5. **Business + Service Requirements** ⚠️ Partially Supported
**Example**: "Singtel shops that can activate permanent SIM for student-pass holder"

**Current Limitation**: Google Places API doesn't filter by specific services offered

**How it works**:
```
User Query → Agent extracts business type: "Singtel"
→ search_places query="Singtel"
→ Returns all Singtel locations
→ Agent provides guidance in response
```

**Agent Response**:
```
"I've found Singtel shops near you. For SIM card activation with a student pass, 
I recommend calling ahead to confirm they can process student pass documentation. 
Most Singtel stores offer SIM activation services, but it's best to verify they 
can handle student pass requirements."

+ [MAP shows all Singtel locations]
```

**Why this approach**:
- ❌ Cannot filter by service details (API limitation)
- ✅ Shows all relevant locations
- ✅ Provides helpful context
- ✅ Recommends verification step

---

### 6. **Multi-Criteria Filters** ⚠️ Limited Support
**Example**: "4-star hotels with gym and pool under $200"

**Current Limitation**: Some criteria can be filtered, others cannot

**What can be filtered**:
- ✅ `min_rating`: Minimum star rating
- ✅ `price_level`: Price range (1-4)
- ✅ `open_now`: Currently open

**What cannot be filtered**:
- ❌ Specific amenities (gym, pool, wifi)
- ❌ Specific services offered
- ❌ Exact price in currency

**How it works**:
```
User Query → Agent extracts filterable criteria
→ search_places with query="hotel", min_rating=4, price_level=3
→ Returns hotels
→ Agent advises checking amenities manually
```

**Agent Response**:
```
"I've found 4-star hotels in your price range. I recommend checking each hotel's 
website or calling to confirm they have gym and pool facilities."
```

---

### 7. **Time-Based Queries** ⚠️ Limited Support
**Example**: "Restaurants open now" or "24-hour pharmacies"

**What works**:
- ✅ `open_now=true`: Currently open businesses

**What doesn't work**:
- ❌ Specific hours ("open until 10pm")
- ❌ Future times ("open tomorrow at 6am")
- ❌ Days of week ("open on Sundays")

**How it works**:
```
User Query → Agent detects "open now"
→ search_places with open_now=true
→ Returns currently open places
```

---

### 8. **Comparative Queries** ❌ Not Supported
**Example**: "Which is closer, Nanyang University or NUS?"

**Limitation**: Agent can only process one query at a time

**Workaround**: Ask two separate questions:
1. "Show me direction to Nanyang University"
2. "Show me direction to NUS"

---

### 9. **Recommendation Queries** ⚠️ Basic Support
**Example**: "Best coffee shops in Singapore"

**Limitation**: "Best" is subjective, agent uses ratings

**How it works**:
```
User Query → Agent extracts: query="coffee shop", min_rating=4.0
→ search_places with rating filter
→ Returns highly-rated coffee shops
```

**Agent Response**:
```
"I've found highly-rated coffee shops near you (4+ stars). 
These are popular choices based on customer reviews."
```

---

## Improvement Strategies

### For Service-Specific Queries

**Option 1: Enhanced Agent Guidance** (Current Approach) ✅
- Agent finds all locations of the business type
- Provides context about service requirements
- Recommends calling ahead

**Option 2: External Database Integration** (Future Enhancement)
- Maintain a database of services offered by specific locations
- Agent queries both Places API + custom database
- Returns only locations that match service criteria
- **Requires**: Custom backend database, manual data entry/scraping

**Option 3: Web Scraping + LLM Analysis** (Advanced)
- Agent searches for locations
- Scrapes website/reviews for each location
- Uses LLM to analyze if service is mentioned
- Returns filtered results
- **Requires**: Web scraping infrastructure, additional API calls

**Option 4: User Reviews Analysis** (Moderate)
- Use Places API to get place details with reviews
- Agent analyzes reviews for mentions of specific services
- Returns locations with relevant review mentions
- **Requires**: Review text analysis, more complex prompting

---

## Current Architecture Strengths

✅ **What works really well**:
1. Location-based searches (nearby, city-wide)
2. Navigation and directions
3. Specific place name searches
4. Basic filtering (rating, price level, open now)
5. General business type searches

⚠️ **What has limitations**:
1. Service-specific filtering (workaround: show all + guidance)
2. Amenity filtering (workaround: agent provides advice)
3. Time-specific queries beyond "open now"
4. Comparative analysis
5. Subjective recommendations

---

## Best Practices for Complex Queries

### For Users:
1. **Break down complex queries** into simpler parts
2. **Be specific about location** ("near me" vs "across Singapore")
3. **Understand limitations** - agent will provide guidance when exact filtering isn't possible
4. **Verify service availability** - always call ahead for specific services

### For Developers:
1. **Teach agent to decompose** complex queries into searchable parts
2. **Provide helpful context** when exact filtering isn't possible
3. **Be transparent** about limitations in agent responses
4. **Suggest verification steps** for service-specific queries

---

## Example Query Handling Matrix

| Query | What Agent Does | What User Sees |
|-------|----------------|----------------|
| "Restaurants near me" | Search + Display | Map with restaurant markers |
| "Singtel shops with SIM activation" | Search "Singtel" + Guidance | Map with all Singtel + advice to call |
| "Best hotels under $200" | Search + Filter price + Suggest | Map with affordable hotels + context |
| "24-hour pharmacies" | Search + Filter open_now | Map with currently open pharmacies |
| "Malls across Singapore" | Search + Large radius | Map with many malls city-wide |
| "Which is closer, A or B?" | Process one at a time | Suggest asking separately |

---

## Recommended User Prompts

### Good Prompts (Clear, Actionable):
- ✅ "Find Starbucks near me"
- ✅ "Show malls across Singapore"
- ✅ "Restaurants open now"
- ✅ "4-star hotels nearby"
- ✅ "Direction to Changi Airport"

### Complex Prompts (Agent will provide guidance):
- ⚠️ "Singtel shops that activate SIM for student pass" → Shows all Singtel + advice
- ⚠️ "Hotels with swimming pool" → Shows hotels + suggests checking amenities
- ⚠️ "Best dim sum in town" → Shows highly-rated Chinese restaurants

### Problematic Prompts (Need rephrasing):
- ❌ "Which is better, A or B?" → Ask about each separately
- ❌ "Open tomorrow at 9am" → Can only check "open now"
- ❌ "Cheapest hotel" → Use "affordable hotels" or specify budget

---

## Future Enhancements

### Phase 1: Enhanced Filtering (Easy)
- Add more filter parameters to `search_places` tool
- Support: `max_price`, `distance_sort`, `opening_hours`

### Phase 2: Service Database (Medium)
- Build custom database of business services
- Integrate with Places API results
- Enable true service-specific filtering

### Phase 3: Review Analysis (Medium)
- Fetch and analyze place reviews
- Extract service mentions from reviews
- Rank results by service relevance

### Phase 4: Multi-Step Reasoning (Hard)
- Enable agent to make multiple searches
- Compare and rank results
- Provide comparative analysis

### Phase 5: Real-Time Verification (Advanced)
- Call business websites/APIs
- Verify service availability in real-time
- Update results dynamically

---

## Summary

The current system excels at **location-based searches** and **navigation**, with smart handling of **complex service queries** through guidance and recommendations. For queries requiring service-specific filtering, the agent provides transparency about limitations and suggests verification steps, maintaining user trust while working within API constraints.
