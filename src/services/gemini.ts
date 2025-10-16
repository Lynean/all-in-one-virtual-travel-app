import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../store/useStore';
import { forwardGeocode, calculateDistance, reverseGeocode } from './geocoding';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'undefined') {
  console.warn('Gemini API key not found. Please add VITE_GEMINI_API_KEY to ChatAndBuild settings');
}

const genAI = API_KEY && API_KEY !== 'undefined' ? new GoogleGenerativeAI(API_KEY) : null;

export interface MapAction {
  type: 'search' | 'directions' | 'zoom' | 'marker' | 'confirm_location' | 'request_landmarks' | 'verify_location';
  data: {
    query?: string;
    location?: { lat: number; lng: number };
    zoom?: number;
    label?: string;
    userLocation?: { lat: number; lng: number; name: string };
    mapLocation?: { lat: number; lng: number; name: string };
    distance?: number;
  };
}

export interface AIResponse {
  text: string;
  mapActions: MapAction[];
  searchResults?: google.maps.places.PlaceResult[];
  directionsInfo?: {
    destination: string;
    distance?: string;
    duration?: string;
  };
}

const LOCATION_SEARCH_KEYWORDS = [
  'nearby', 'near me', 'around here', 'close to me', 'in the area',
  'restaurant', 'hotel', 'attraction', 'shop', 'store', 'cafe', 'bar',
  'hospital', 'pharmacy', 'bank', 'atm', 'gas station', 'parking',
  'show me', 'find', 'where', 'locate', 'search for', 'directions',
  'how to get', 'route to', 'way to', 'navigate to'
];

const LOCATION_DECLARATION_PATTERNS = [
  /i'?m (?:at|in|near) (.+)/i,
  /currently (?:at|in|near) (.+)/i,
  /located (?:at|in|near) (.+)/i,
  /my location is (.+)/i,
  /i'?m currently (.+)/i,
];

const LOCATION_CHANGE_PATTERNS = [
  /i'?m now (?:at|in|near) (.+)/i,
  /moved to (.+)/i,
  /i'?ve moved to (.+)/i,
  /now (?:at|in|near) (.+)/i,
  /changed location to (.+)/i,
];

function extractLocationFromMessage(message: string): string | null {
  for (const pattern of LOCATION_DECLARATION_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function detectLocationChange(message: string): string | null {
  for (const pattern of LOCATION_CHANGE_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function requiresLocationConfirmation(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return LOCATION_SEARCH_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

function formatLocationForAI(
  location: { lat: number; lng: number } | null,
  locationName: string | null
): string {
  if (!location) {
    return 'Location not available';
  }
  
  if (locationName) {
    return `Current Location: ${locationName}\nCoordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
  }
  
  return `Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
}

function formatChatHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  if (history.length === 0) {
    return 'No previous conversation';
  }

  const recentHistory = history.slice(-10);
  
  return recentHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
}

function formatSearchResultsForAI(results: google.maps.places.PlaceResult[]): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  return results.slice(0, 5).map((place, index) => {
    const rating = place.rating ? `⭐ ${place.rating}` : 'No rating';
    const reviews = place.user_ratings_total ? `(${place.user_ratings_total} reviews)` : '';
    const address = place.formatted_address || place.vicinity || 'Address not available';
    
    return `${index + 1}. **${place.name}**
   📍 ${address}
   ${rating} ${reviews}`;
  }).join('\n\n');
}

export async function generateAIResponse(
  userMessage: string, 
  destination?: string,
  currentLocation?: { lat: number; lng: number } | null
): Promise<AIResponse> {
  if (!genAI) {
    return {
      text: "⚠️ AI service is not configured. Please add your Gemini API key to ChatAndBuild settings.\n\nYou can get a free API key from: https://makersuite.google.com/app/apikey",
      mapActions: []
    };
  }

  const store = useStore.getState();
  
  store.addMessage('user', userMessage);
  
  // PROTOCOL STEP 1: Detect location changes
  const locationChange = detectLocationChange(userMessage);
  if (locationChange) {
    console.log('Location change detected:', locationChange);
    
    // Reset location confirmation state
    store.setLocationConfirmed(false);
    store.setAwaitingLandmarks(false);
    
    try {
      const geocodedLocation = await forwardGeocode(locationChange);
      
      if (geocodedLocation && geocodedLocation.coordinates) {
        const changeText = `I notice you've moved to a new location: **${geocodedLocation.formattedAddress}**.\n\nBefore I can help you with directions or recommendations, I need to confirm this is your current location. Are you currently at ${geocodedLocation.formattedAddress}?`;
        
        store.addMessage('assistant', changeText);
        store.setPendingSearchQuery(userMessage);
        
        // Update to new location temporarily
        store.setUserProvidedLocation({
          lat: geocodedLocation.coordinates.lat,
          lng: geocodedLocation.coordinates.lng,
          name: geocodedLocation.formattedAddress,
        });
        
        return {
          text: changeText,
          mapActions: [{ type: 'confirm_location', data: {} }]
        };
      }
    } catch (error) {
      console.error('Location change geocoding error:', error);
    }
  }
  
  // PROTOCOL STEP 2: Check if user is declaring their location
  const declaredLocation = extractLocationFromMessage(userMessage);
  
  if (declaredLocation && currentLocation) {
    console.log('User declared location:', declaredLocation);
    
    try {
      const geocodedLocation = await forwardGeocode(declaredLocation);
      
      if (geocodedLocation && geocodedLocation.coordinates) {
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          geocodedLocation.coordinates.lat,
          geocodedLocation.coordinates.lng
        );
        
        console.log('Distance between locations:', distance, 'km');
        
        if (distance > 5) {
          const mapLocationName = await reverseGeocode(currentLocation.lat, currentLocation.lng);
          
          store.setPendingLocationVerification({
            userLocation: {
              lat: geocodedLocation.coordinates.lat,
              lng: geocodedLocation.coordinates.lng,
              name: geocodedLocation.formattedAddress,
            },
            mapLocation: {
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              name: mapLocationName?.formattedAddress || 'Unknown location',
            },
            distance,
          });
          
          const verificationText = `I notice you mentioned being at **${geocodedLocation.formattedAddress}**, but the map is currently showing **${mapLocationName?.formattedAddress || 'a different location'}** (about ${distance.toFixed(1)} km away).\n\nBefore I can provide accurate directions or recommendations, I need to confirm your location. Are you currently at ${geocodedLocation.formattedAddress}?`;
          
          store.addMessage('assistant', verificationText);
          
          return {
            text: verificationText,
            mapActions: [{ 
              type: 'verify_location', 
              data: {
                userLocation: {
                  lat: geocodedLocation.coordinates.lat,
                  lng: geocodedLocation.coordinates.lng,
                  name: geocodedLocation.formattedAddress,
                },
                mapLocation: {
                  lat: currentLocation.lat,
                  lng: currentLocation.lng,
                  name: mapLocationName?.formattedAddress || 'Unknown location',
                },
                distance,
              }
            }]
          };
        } else {
          store.setUserProvidedLocation({
            lat: geocodedLocation.coordinates.lat,
            lng: geocodedLocation.coordinates.lng,
            name: geocodedLocation.formattedAddress,
          });
          store.setCurrentLocation(geocodedLocation.coordinates);
          store.setCurrentLocationName(geocodedLocation.formattedAddress);
          store.setLocationConfirmed(true);
          
          const confirmText = `Perfect! I've confirmed your location at **${geocodedLocation.formattedAddress}**. Now I can help you with accurate directions and recommendations. What would you like to explore?`;
          store.addMessage('assistant', confirmText);
          
          return {
            text: confirmText,
            mapActions: [{
              type: 'marker',
              data: {
                location: geocodedLocation.coordinates,
                label: 'Your Location',
              }
            }]
          };
        }
      }
    } catch (error) {
      console.error('Location geocoding error:', error);
    }
  }
  
  // PROTOCOL STEP 3: Check if request requires location and location isn't confirmed
  if (requiresLocationConfirmation(userMessage) && !store.locationConfirmed && !store.awaitingLandmarks) {
    store.setPendingSearchQuery(userMessage);
    
    const locationRequestText = "Before I can help you with directions or find nearby places, I need to confirm your current location.\n\n📍 **Location Verification Required**\n\nAre you currently at the location shown on the map?";
    
    store.addMessage('assistant', locationRequestText);
    
    return {
      text: locationRequestText,
      mapActions: [{ type: 'confirm_location', data: {} }]
    };
  }

  // PROTOCOL STEP 4: Handle landmark-based location identification
  if (store.awaitingLandmarks) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      const landmarkPrompt = `The user has provided these landmarks/shops within 100m of their location: "${userMessage}"

Please analyze these landmarks and provide:
1. A brief confirmation that you understand their location context
2. Suggest they can now proceed with their original search query

Keep the response conversational and helpful. Do not try to determine exact coordinates - just acknowledge the landmarks.`;

      const result = await model.generateContent(landmarkPrompt);
      const response = await result.response;
      const text = response.text();
      
      store.setAwaitingLandmarks(false);
      store.setLocationConfirmed(true);
      
      const fullResponse = text + "\n\n✅ **Location Confirmed**\n\nNow, what would you like to search for nearby?";
      store.addMessage('assistant', fullResponse);
      
      return {
        text: fullResponse,
        mapActions: []
      };
    } catch (error) {
      console.error('Landmark processing error:', error);
      store.setAwaitingLandmarks(false);
      const fallbackText = "Thank you for providing those landmarks. I understand your location better now.\n\n✅ **Location Confirmed**\n\nWhat would you like to search for nearby?";
      store.addMessage('assistant', fallbackText);
      return {
        text: fallbackText,
        mapActions: []
      };
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const currentChecklist = store.checklist;
    const checklistSummary = currentChecklist.length > 0 
      ? `\n\nCurrent Checklist (${currentChecklist.length} items):\n${currentChecklist.map(item => 
          `- [${item.completed ? 'x' : ' '}] ${item.text} (${item.category})`
        ).join('\n')}`
      : '\n\nCurrent Checklist: Empty';

    const effectiveLocation = store.userProvidedLocation || currentLocation;
    const effectiveLocationName = store.userProvidedLocation?.name || store.currentLocationName;

    const locationContext = effectiveLocation 
      ? `\n\n📍 **CONFIRMED User Location**:\n${formatLocationForAI(effectiveLocation, effectiveLocationName)}\nLocation Status: ${store.locationConfirmed ? '✅ CONFIRMED' : '⚠️ UNCONFIRMED'}\n\n${store.locationConfirmed ? 'You have verified access to the user\'s location. You may now provide directions and location-based recommendations.' : 'Location is NOT confirmed. You MUST request location confirmation before providing any directions or recommendations.'}`
      : '\n\n📍 User Location: ⚠️ NOT AVAILABLE - GPS access not granted';

    const conversationContext = store.chatHistory.length > 0
      ? `\n\n💬 Previous Conversation:\n${formatChatHistory(store.chatHistory)}`
      : '';

    const systemPrompt = `You are an expert travel guide assistant${destination ? ` for ${destination}` : ''} with STRICT location verification protocols.

🔒 **MANDATORY LOCATION VERIFICATION PROTOCOL** 🔒

BEFORE providing ANY directions, routes, or location-specific recommendations, you MUST:

1. **INITIAL VERIFICATION**:
   - Check if location is confirmed (see Location Status above)
   - If NOT confirmed, IMMEDIATELY request location confirmation
   - DO NOT provide directions or recommendations without confirmed location
   - Use this exact format: "Before I can help you with [request], I need to confirm your current location. Are you currently at [location shown on map]?"

2. **LOCATION CHANGE DETECTION**:
   - If user mentions moving to a new location (e.g., "I'm now in Paris", "I moved to downtown")
   - IMMEDIATELY acknowledge the change
   - Request fresh location confirmation
   - DO NOT use previous location data
   - Use format: "I notice you've moved to [new location]. Before I can provide updated directions, please confirm this is your current location."

3. **AMBIGUOUS LOCATION HANDLING**:
   - If location information is unclear or ambiguous
   - Ask clarifying questions: "Which [city/area/street] are you referring to?"
   - Wait for clarification before proceeding
   - DO NOT make assumptions or inferences

4. **CONFIRMED LOCATION ACKNOWLEDGMENT**:
   - Once location is confirmed, acknowledge it explicitly
   - Reference the confirmed location in your response
   - Example: "Based on your confirmed location at [location name], here are nearby restaurants..."

5. **RESPONSE CONSTRAINTS**:
   - NEVER assume location from previous conversations
   - NEVER infer location from context clues
   - NEVER provide directions without explicit location confirmation
   - ALWAYS reference confirmed location when providing recommendations

${locationContext}

${conversationContext}

MAP INTEGRATION:
You can interact with the map using these commands:
1. [MAP_SEARCH:query] - Search for places (ONLY if location is confirmed)
2. [MAP_DIRECTIONS:destination] - Get directions (ONLY if location is confirmed)
3. [MAP_MARKER:lat,lng,label] - Add a marker
4. [MAP_ZOOM:level] - Change map zoom (10-20)

CHECKLIST MANAGEMENT:
Format: [CHECKLIST:category:item_text]
Categories: before, arrival, during, departure

${checklistSummary}

CRITICAL RULES:
- ⚠️ NO directions without confirmed location
- ⚠️ NO nearby searches without confirmed location
- ⚠️ NO location assumptions or inferences
- ✅ ALWAYS request confirmation first
- ✅ ALWAYS acknowledge location changes
- ✅ ALWAYS reference confirmed location in responses

User question: ${userMessage}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    parseAndCreateChecklistItems(text);
    
    const mapActions = parseMapActions(text, effectiveLocation);
    
    const cleanedText = text
      .replace(/\[CHECKLIST:[^\]]+\]/g, '')
      .replace(/\[MAP_SEARCH:[^\]]+\]/g, '')
      .replace(/\[MAP_DIRECTIONS:[^\]]+\]/g, '')
      .replace(/\[MAP_MARKER:[^\]]+\]/g, '')
      .replace(/\[MAP_ZOOM:[^\]]+\]/g, '')
      .trim();
    
    store.addMessage('assistant', cleanedText);
    
    return {
      text: cleanedText,
      mapActions
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    let errorText = "⚠️ Sorry, I encountered an error connecting to the AI service. Please try again in a moment.";
    
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID')) {
        errorText = "⚠️ Invalid API key. Please check your Gemini API key in ChatAndBuild settings.\n\nGet a free API key from: https://makersuite.google.com/app/apikey";
      } else if (error.message.includes('quota')) {
        errorText = "⚠️ API quota exceeded. Please check your Gemini API usage limits.";
      }
    }
    
    store.addMessage('assistant', errorText);
    
    return {
      text: errorText,
      mapActions: []
    };
  }
}

function parseMapActions(text: string, currentLocation?: { lat: number; lng: number } | null): MapAction[] {
  const actions: MapAction[] = [];
  
  const searchRegex = /\[MAP_SEARCH:([^\]]+)\]/g;
  let match;
  while ((match = searchRegex.exec(text)) !== null) {
    actions.push({
      type: 'search',
      data: { query: match[1].trim() }
    });
  }
  
  const directionsRegex = /\[MAP_DIRECTIONS:([^\]]+)\]/g;
  while ((match = directionsRegex.exec(text)) !== null) {
    actions.push({
      type: 'directions',
      data: { query: match[1].trim() }
    });
  }
  
  const markerRegex = /\[MAP_MARKER:([0-9.-]+),([0-9.-]+),([^\]]+)\]/g;
  while ((match = markerRegex.exec(text)) !== null) {
    actions.push({
      type: 'marker',
      data: {
        location: { lat: parseFloat(match[1]), lng: parseFloat(match[2]) },
        label: match[3].trim()
      }
    });
  }
  
  const zoomRegex = /\[MAP_ZOOM:([0-9]+)\]/g;
  while ((match = zoomRegex.exec(text)) !== null) {
    actions.push({
      type: 'zoom',
      data: { zoom: parseInt(match[1]) }
    });
  }
  
  return actions;
}

function parseAndCreateChecklistItems(text: string): void {
  const checklistRegex = /\[CHECKLIST:(before|arrival|during|departure):([^\]]+)\]/g;
  const matches = text.matchAll(checklistRegex);
  
  const { addChecklistItem } = useStore.getState();
  
  for (const match of matches) {
    const category = match[1] as 'before' | 'arrival' | 'during' | 'departure';
    const itemText = match[2].trim();
    
    addChecklistItem({
      text: itemText,
      completed: false,
      category: category,
    });
  }
}

export { formatSearchResultsForAI };
