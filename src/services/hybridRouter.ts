import { agentService, AgentContext, AgentResponse } from './agentService';
import { generateAIResponse, AIResponse } from './gemini';

/**
 * Hybrid Router - Intelligently routes queries between Gemini and LangChain
 * 
 * ROUTING LOGIC:
 * - Simple queries → Gemini (fast, cheap)
 * - Complex queries → LangChain Agent (powerful, autonomous)
 */

// Keywords that indicate complex queries requiring LangChain
const COMPLEX_QUERY_INDICATORS = [
  // Multi-day planning
  'itinerary', 'trip plan', 'day by day', 'schedule', 'multi-day', 'week trip',
  '3 days', '4 days', '5 days', 'weekend trip', 'vacation plan',
  
  // Budget optimization
  'budget', 'cost', 'price', 'expensive', 'cheap', 'affordable', 'save money',
  'how much', 'total cost', 'breakdown',
  
  // Weather-based planning
  'weather forecast', 'rain', 'sunny', 'temperature', 'climate', 'best time',
  'weather dependent', 'if it rains', 'weather alternative',
  
  // Currency conversion
  'convert', 'exchange rate', 'currency', 'dollars to', 'euros to', 'usd', 'eur',
  
  // Complex multi-step workflows
  'first', 'then', 'after that', 'next', 'finally', 'step by step',
  'optimize', 'best route', 'most efficient', 'compare',
];

// Keywords for simple queries that Gemini handles well
const SIMPLE_QUERY_INDICATORS = [
  'nearby', 'near me', 'around here', 'close to',
  'restaurant', 'hotel', 'cafe', 'shop', 'store',
  'directions to', 'how to get to', 'route to',
  'what is', 'tell me about', 'information about',
];

interface HybridResponse {
  message: string;
  mapActions: any[];
  source: 'gemini' | 'langchain';
  searchResults?: any[];
  directionsInfo?: any;
}

export class HybridRouter {
  private useBackend: boolean;

  constructor() {
    // Check if backend is available
    this.useBackend = this.checkBackendAvailability();
  }

  private checkBackendAvailability(): boolean {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    return !!(backendUrl && backendUrl !== 'undefined');
  }

  /**
   * Determine if query should use LangChain agent
   */
  private shouldUseLangChain(message: string): boolean {
    if (!this.useBackend) {
      return false; // Backend not available, use Gemini
    }

    const lowerMessage = message.toLowerCase();

    // Check for complex query indicators
    const hasComplexIndicator = COMPLEX_QUERY_INDICATORS.some(
      keyword => lowerMessage.includes(keyword)
    );

    // Check for simple query indicators
    const hasSimpleIndicator = SIMPLE_QUERY_INDICATORS.some(
      keyword => lowerMessage.includes(keyword)
    );

    // Decision logic
    if (hasComplexIndicator && !hasSimpleIndicator) {
      return true; // Definitely complex
    }

    if (hasSimpleIndicator && !hasComplexIndicator) {
      return false; // Definitely simple
    }

    // Check message length and complexity
    const wordCount = message.split(/\s+/).length;
    const hasMultipleSentences = message.split(/[.!?]+/).length > 2;
    const hasNumbers = /\d+/.test(message);

    // Use LangChain for longer, multi-sentence queries with numbers
    if (wordCount > 20 && hasMultipleSentences && hasNumbers) {
      return true;
    }

    // Default to Gemini for speed
    return false;
  }

  /**
   * Route query to appropriate service
   */
  async routeQuery(
    message: string,
    destination?: string,
    currentLocation?: { lat: number; lng: number } | null,
    locationConfirmed?: boolean
  ): Promise<HybridResponse> {
    const useLangChain = this.shouldUseLangChain(message);

    console.log(`🔀 Routing to: ${useLangChain ? 'LangChain Agent' : 'Gemini'}`);
    console.log(`📝 Query: ${message.substring(0, 50)}...`);

    try {
      if (useLangChain) {
        return await this.routeToLangChain(message, destination, currentLocation, locationConfirmed);
      } else {
        return await this.routeToGemini(message, destination, currentLocation);
      }
    } catch (error) {
      console.error(`Error with ${useLangChain ? 'LangChain' : 'Gemini'}:`, error);
      
      // Fallback to the other service
      if (useLangChain) {
        console.log('⚠️ LangChain failed, falling back to Gemini');
        return await this.routeToGemini(message, destination, currentLocation);
      } else {
        console.log('⚠️ Gemini failed, trying LangChain');
        return await this.routeToLangChain(message, destination, currentLocation, locationConfirmed);
      }
    }
  }

  /**
   * Route to LangChain agent (complex queries)
   */
  private async routeToLangChain(
    message: string,
    destination?: string,
    currentLocation?: { lat: number; lng: number } | null,
    locationConfirmed?: boolean
  ): Promise<HybridResponse> {
    const context: AgentContext = {};

    if (currentLocation) {
      context.current_location = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      };
    }

    if (locationConfirmed !== undefined) {
      context.location_confirmed = locationConfirmed;
    }

    if (destination) {
      context.destination = destination;
    }

    const response: AgentResponse = await agentService.sendMessage(message, context);

    return {
      message: response.message,
      mapActions: response.map_actions,
      source: 'langchain',
    };
  }

  /**
   * Route to Gemini (simple queries)
   */
  private async routeToGemini(
    message: string,
    destination?: string,
    currentLocation?: { lat: number; lng: number } | null
  ): Promise<HybridResponse> {
    const response: AIResponse = await generateAIResponse(
      message,
      destination,
      currentLocation
    );

    return {
      message: response.text,
      mapActions: response.mapActions,
      source: 'gemini',
      searchResults: response.searchResults,
      directionsInfo: response.directionsInfo,
    };
  }

  /**
   * Clear session (for LangChain)
   */
  async clearSession(): Promise<void> {
    if (this.useBackend) {
      try {
        await agentService.deleteSession();
      } catch (error) {
        console.error('Failed to clear agent session:', error);
      }
    }
  }
}

export const hybridRouter = new HybridRouter();
