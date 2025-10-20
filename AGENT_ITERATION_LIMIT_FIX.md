# Agent Iteration Limit Fix

## Problem

You were getting the error: **"Agent stopped due to iteration limit or time limit"**

This happens when the LangChain agent exceeds the maximum number of tool calls (iterations) or takes too long to complete.

## Root Causes

### 1. Low Iteration Limit
```python
# OLD (line 141)
max_iterations=5  # Too low!
```

**Problem**: Complex queries like "Find restaurants, then give me directions to the best one" require multiple tool calls:
1. Call `search_places` (1 iteration)
2. Parse results (1 iteration)  
3. Call `get_place_details` (1 iteration)
4. Call `compute_route` (1 iteration)
5. Format final answer (1 iteration)

Total: 5 iterations = **LIMIT REACHED** ❌

### 2. Inefficient Tool Usage
Agent was calling multiple tools unnecessarily:
- Calling `search_places` multiple times
- Calling `get_place_details` for every result
- Not providing final answer immediately after getting results

### 3. No Timeout Protection
No `max_execution_time` set, so agent could hang indefinitely on slow API calls.

## Solutions Implemented

### ✅ Fix 1: Increased Iteration Limit

```python
# NEW (line 141-143)
max_iterations=15,  # Increased from 5 to 15
max_execution_time=60,  # 60 seconds timeout
```

**Why 15?**
- Simple queries: 3-5 iterations
- Complex queries: 7-10 iterations
- Buffer for retries: +5 iterations

### ✅ Fix 2: Better Error Handling

```python
# NEW (lines 257-272)
try:
    result = await self.agent_executor.ainvoke(agent_input)
    agent_response = result.get("output", "...")
except Exception as agent_error:
    error_str = str(agent_error)
    
    # Check if it's an iteration limit error
    if "iteration limit" in error_str.lower() or "time limit" in error_str.lower():
        agent_response = (
            "I apologize, but your request is taking longer than expected to process. "
            "This might be due to complex queries or multiple tool calls. "
            "Could you try breaking your request into smaller, more specific questions? "
            "For example, ask about one place or one route at a time."
        )
    else:
        agent_response = f"I encountered an error: {error_str}. Please try rephrasing your question."
```

**Benefits**:
- User-friendly error messages
- Helpful suggestions to break down complex queries
- Prevents cryptic error messages

### ✅ Fix 3: Optimized Agent Prompt

Added efficiency guidelines to system prompt:

```python
IMPORTANT - TOOL USAGE EFFICIENCY:
- Use ONLY ONE tool per user request when possible
- Provide your final answer immediately after getting tool results
- Don't call multiple tools unless absolutely necessary
- If a tool returns results, use them to answer - don't call another tool
```

**Effect**: Guides Gemini to be more efficient with tool calls.

## Testing

### Test Case 1: Simple Query (Should use 3-5 iterations)

```
User: "Find restaurants near me"
```

**Expected Flow**:
1. Thought: "I need to search for restaurants using the user's location"
2. Action: search_places(query="restaurants", lat=40.758, lng=-73.9855)
3. Observation: [List of restaurants]
4. Thought: "I now have the results, I can provide the final answer"
5. Final Answer: "Here are restaurants near Times Square: ..."

✅ **Total: 5 iterations** (well under 15 limit)

### Test Case 2: Complex Query (Should use 7-10 iterations)

```
User: "Find Italian restaurants near me, then give me directions to the highest rated one"
```

**Expected Flow**:
1. Thought: "Search for Italian restaurants"
2. Action: search_places(query="Italian restaurants", ...)
3. Observation: [List of restaurants]
4. Thought: "Find the highest rated one"
5. Action: get_place_details(place_id="...")
6. Observation: [Restaurant details]
7. Thought: "Now compute directions"
8. Action: compute_route(origin=..., destination=...)
9. Observation: [Route data]
10. Thought: "I have everything, provide final answer"
11. Final Answer: "The highest rated Italian restaurant is... Here are directions..."

✅ **Total: 11 iterations** (under 15 limit)

### Test Case 3: Very Complex Query (Edge case)

```
User: "Compare weather, hotels, and restaurants in Paris, Rome, and Barcelona"
```

**Expected Flow**: 9+ tool calls (3 cities × 3 queries)

⚠️ **This might still hit the limit!** But now the error message will be helpful:

```
"I apologize, but your request is taking longer than expected to process. 
This might be due to complex queries or multiple tool calls. 
Could you try breaking your request into smaller, more specific questions? 
For example, ask about one place or one route at a time."
```

## Monitoring

### How to Check Agent Iterations

Look at backend logs (with `verbose=True`):

```
[Agent] Entering new AgentExecutor chain...
[Agent] Thought: I need to search for restaurants
[Agent] Action: search_places
[Agent] Action Input: {"query": "restaurants", "latitude": 40.758, ...}
[Agent] Observation: Found 10 restaurants near Times Square
[Agent] Thought: I now know the final answer
[Agent] Final Answer: Here are the top restaurants...
[Agent] Finished chain. (iterations: 3)
```

### Warning Signs

🚨 **High iteration count** (>10 iterations for simple queries):
- Agent is being inefficient
- Calling same tool multiple times
- Not using SYSTEM CONTEXT location

🚨 **Timeout errors** (>60 seconds):
- API calls are slow
- Network issues
- Need to increase timeout or optimize tools

## Recommendations

### For Users
✅ **Do**: Ask specific, focused questions
- ✅ "Find Italian restaurants near me"
- ✅ "Directions to Central Park"
- ✅ "Weather in Paris"

❌ **Don't**: Ask multi-part, complex queries
- ❌ "Find restaurants, then hotels, then give me weather and directions to each"
- ❌ "Compare 5 different cities with multiple criteria"

### For Developers

#### If Iterations Still Too High:

1. **Increase limit further**:
   ```python
   max_iterations=20  # or higher
   ```

2. **Optimize tool descriptions**:
   - Make tool purposes clearer
   - Reduce ambiguity
   - Add more examples

3. **Simplify system prompt**:
   - Remove unnecessary instructions
   - Focus on most common use cases

4. **Add tool result caching**:
   - Cache place search results
   - Cache route computations
   - Reduce redundant API calls

#### If Timeout Issues:

1. **Increase timeout**:
   ```python
   max_execution_time=120  # 2 minutes
   ```

2. **Add streaming responses**:
   - Return partial results
   - Show progress to user

3. **Optimize API calls**:
   - Use parallel requests
   - Reduce payload size
   - Add request timeouts

## Summary

### Changes Made:
✅ `max_iterations`: 5 → 15 (3x increase)  
✅ Added `max_execution_time`: 60 seconds  
✅ Better error handling with helpful messages  
✅ Optimized system prompt for efficiency  

### Expected Results:
✅ No more iteration limit errors for normal queries  
✅ User-friendly error messages for complex queries  
✅ More efficient tool usage by agent  
✅ Timeout protection for slow API calls  

### Next Steps:
1. Test with various query types
2. Monitor iteration counts in logs
3. Adjust limits if needed
4. Consider adding tool result caching for performance
