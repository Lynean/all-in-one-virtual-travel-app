import { agentService, AgentContext, AgentResponse } from './agentService';

/**
 * Agent Router - Routes all queries to LangChain Agent backend
 * 
 * All queries are processed by the Gemini-powered LangChain agent
 * for consistent, autonomous responses with tool usage.
 */

interface HybridResponse {
  message: string;
  mapActions: any[];
  appActions?: any[];  // Added for checklist and other app actions
  source: 'langchain';
  searchResults?: any[];
  directionsInfo?: any;
}

export class HybridRouter {
  private useBackend: boolean;

  constructor() {
    // Check if backend is available
    this.useBackend = this.checkBackendAvailability();
    
    if (!this.useBackend) {
      console.warn('⚠️ Backend not configured. Agent will not work.');
    }
  }

  private checkBackendAvailability(): boolean {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    return !!(backendUrl && backendUrl !== 'undefined');
  }

  /**
   * Route all queries to LangChain agent
   */
  async routeQuery(
    message: string,
    destination?: string,
    currentLocation?: { lat: number; lng: number } | null,
    locationConfirmed?: boolean
  ): Promise<HybridResponse> {
    if (!this.useBackend) {
      throw new Error('Backend not available. Please configure VITE_BACKEND_URL in .env');
    }

    console.log('🤖 Routing to: LangChain Agent (Gemini-powered)');
    console.log(`📝 Query: ${message.substring(0, 50)}...`);

    try {
      return await this.routeToLangChain(message, destination, currentLocation, locationConfirmed);
    } catch (error) {
      console.error('Error with LangChain Agent:', error);
      throw new Error(`Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Route to LangChain agent
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
      appActions: response.app_actions,  // Pass app_actions from backend
      source: 'langchain',
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
