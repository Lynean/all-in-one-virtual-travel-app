# Checklist Debugging Guide

## Issue: Checklist items not appearing

### Changes Made

1. **Added detailed logging to AIGuide.tsx**
   - Logs when app_actions are received
   - Logs each item being added
   - Logs final store state after adding items

2. **Added detailed logging to useStore.ts**
   - Logs when `addChecklistItem` is called
   - Logs current and new checklist length

3. **Added logging to Checklist.tsx**
   - Logs whenever items change
   - Shows total item count

4. **Fixed persist middleware**
   - Added `checklist` to the partialize function
   - Checklist items now persist across page refreshes

### How to Debug

#### Step 1: Open Browser Console
Press F12 to open developer tools and go to the Console tab.

#### Step 2: Test with AI Query
In the AI Guide, type a query like:
```
Plan a 3-day trip to Singapore
```

#### Step 3: Check Console Logs
Look for these log messages in order:

1. **Backend Response**
   ```
   ✅ App actions received: [...]
   ```
   - If you DON'T see this, the backend isn't sending app_actions

2. **Processing Checklist**
   ```
   ✅ Processing checklist action: {...}
   ✅ Adding X checklist items to store
   ```
   - If you see "App actions received" but NOT this, the action type might not be 'checklist'

3. **Store Updates**
   ```
   🔄 Store: Adding checklist item: {...}
   🔄 Store: Current checklist length: 0
   🔄 Store: New checklist length: 1
   ```
   - If you see "Adding checklist items" but NOT this, there's an issue with the store

4. **Checklist Component Update**
   ```
   🔍 Checklist items updated: [...]
   🔍 Total items: X
   ```
   - If you see store updates but NOT this, the component isn't re-rendering

### Common Issues

#### Issue 1: Backend not sending app_actions
**Symptom:** No "App actions received" log
**Solution:** Check backend logs. The backend should log:
```
✨ Final response: X map actions, Y app actions
```

#### Issue 2: Wrong action type
**Symptom:** "App actions received" but not "Processing checklist action"
**Solution:** Check the action structure in console. It should be:
```javascript
{
  type: "checklist",
  data: {
    title: "...",
    items: [...]
  }
}
```

#### Issue 3: Store not updating
**Symptom:** "Adding checklist items" but no store logs
**Solution:** Check if `useStore.getState().addChecklistItem` is defined

#### Issue 4: Component not re-rendering
**Symptom:** Store logs show items added but component doesn't show them
**Solution:** 
- Clear localStorage: `localStorage.clear()` in console
- Refresh the page
- Try adding a manual item to test

### Manual Test
To test the Checklist tab independently:

1. Go to the Checklist tab
2. Type "Test item" in the input box
3. Click the + button
4. Check console for logs

You should see:
```
🔄 Store: Adding checklist item: {text: "Test item", completed: false, category: "during", id: "..."}
🔍 Checklist items updated: [{...}]
🔍 Total items: 1
```

### If Items Still Don't Appear

1. **Check React DevTools**
   - Install React DevTools browser extension
   - Check if Checklist component has the correct items prop

2. **Check localStorage**
   ```javascript
   // In browser console
   JSON.parse(localStorage.getItem('travel-guide-storage'))
   ```
   - Should show checklist array

3. **Clear all storage and try again**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

### Test Query Examples

Try these queries to generate checklists:

1. **Itinerary:**
   ```
   Plan a 3-day trip to Singapore
   ```

2. **Packing List:**
   ```
   What should I pack for a week in Thailand?
   ```

3. **Places to Visit:**
   ```
   List the top attractions in Bangkok
   ```

Each should generate app_actions with checklist items.

### Expected Flow

```
User Query
    ↓
Backend processes query
    ↓
Backend returns response with app_actions
    ↓
hybridRouter receives response
    ↓
hybridRouter passes appActions to AIGuide
    ↓
AIGuide processes appActions
    ↓
AIGuide calls useStore.getState().addChecklistItem()
    ↓
Store updates checklist array
    ↓
Checklist component re-renders with new items
```

### Next Steps

Based on which logs you see:
- **No logs at all:** Backend issue - check backend server
- **Backend logs but no frontend:** Check hybridRouter.ts
- **Frontend logs but no items:** Check Checklist component
- **Items added but disappear:** Check persist middleware
