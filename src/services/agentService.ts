import { ChecklistAppAction } from '../types/checklist';

export interface AgentContext {
  location?: string;
  preferences?: string;
  current_location?: { lat: number; lng: number };
  location_confirmed?: boolean;
  destination?: string;
}

export interface AgentResponse {
  session_id: string;
  message: string;
  map_actions: any[];
  app_actions: (ChecklistAppAction | any)[];
  clarifications: string[];
  suggestions: string[];
  metadata: {
    model: string;
    phase: string;
    branches_executed: string[];
  };
  timestamp: string;
}

class AgentService {
  private backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://all-in-one-virtual-travel-guide-production.up.railway.app';
  private sessionId: string;
  private userId: string;

  constructor() {
    // Get or create user ID from localStorage
    let userId = localStorage.getItem('travel_guide_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('travel_guide_user_id', userId);
    }
    this.userId = userId;

    // Get or create session ID from localStorage
    let sessionId = localStorage.getItem('travel_guide_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('travel_guide_session_id', sessionId);
    }
    this.sessionId = sessionId;

    console.log('🔑 Agent Service initialized:', { userId: this.userId, sessionId: this.sessionId });
  }

  async sendMessage(message: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      console.log('📤 Sending message to agent:', { message, context });

      // Prepare context with location and preferences
      const requestContext: { location?: string; preferences?: string } = {};
      
      if (context) {
        // Format location data if available
        if (context.current_location) {
          requestContext.location = `${context.current_location.lat},${context.current_location.lng}`;
        } else if (context.location) {
          requestContext.location = context.location;
        }

        // Add preferences if available
        if (context.preferences) {
          requestContext.preferences = context.preferences;
        }

        // Add destination as preference if available
        if (context.destination) {
          requestContext.preferences = requestContext.preferences 
            ? `${requestContext.preferences}, destination: ${context.destination}`
            : `destination: ${context.destination}`;
        }
      }

      // CRITICAL: Backend REQUIRES session_id in ALL requests
      const requestBody = {
        user_id: this.userId,
        session_id: this.sessionId,
        message,
        context: requestContext,
      };

      console.log('📦 Request body:', requestBody);

      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Agent service error:', errorText);
        throw new Error(`Agent service error: ${response.status}`);
      }

      const data: AgentResponse = await response.json();
      console.log('✅ Agent response:', data);

      // Update session ID if backend provides a new one
      if (data.session_id && data.session_id !== this.sessionId) {
        console.log('🔄 Updating session ID:', data.session_id);
        this.sessionId = data.session_id;
        localStorage.setItem('travel_guide_session_id', data.session_id);
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  async deleteSession(): Promise<void> {
    try {
      console.log('🗑️ Deleting session:', this.sessionId);

      const response = await fetch(`${this.backendUrl}/api/session/${this.sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to delete session:', response.statusText);
      } else {
        console.log('✅ Session deleted successfully');
      }
    } catch (error) {
      console.error('❌ Error deleting session:', error);
    } finally {
      // Generate new session ID after deletion
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('travel_guide_session_id', this.sessionId);
      console.log('🆕 New session ID generated:', this.sessionId);
    }
  }

  clearSession() {
    // Generate new session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('travel_guide_session_id', this.sessionId);
    console.log('🆕 Session cleared, new ID:', this.sessionId);
  }

  getUserId(): string {
    return this.userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export const agentService = new AgentService();
