import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface AgentContext {
  current_location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  location_confirmed?: boolean;
  budget?: string;
  destination?: string;
}

export interface MapAction {
  type: 'search' | 'directions' | 'marker' | 'zoom';
  data: {
    query?: string;
    location?: { lat: number; lng: number };
    zoom?: number;
    label?: string;
  };
}

export interface AppAction {
  type: string;
  data: any;
}

export interface AgentResponse {
  session_id: string;
  message: string;
  map_actions: MapAction[];
  app_actions: AppAction[];  // Added app_actions field
  metadata?: {
    location_confirmed?: boolean;
  };
  timestamp: string;
}

export interface SessionResponse {
  session_id: string;
  user_id: string;
  status: string;
  created_at?: string;
}

class AgentService {
  private userId: string;
  private sessionId: string | null = null;

  constructor() {
    // Generate or retrieve user ID
    this.userId = this.getUserId();
  }

  private getUserId(): string {
    let userId = localStorage.getItem('travelmate_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('travelmate_user_id', userId);
    }
    return userId;
  }

  async createSession(metadata?: Record<string, any>): Promise<string> {
    try {
      const response = await axios.post<SessionResponse>(
        `${BACKEND_URL}/api/session/create`,
        {
          user_id: this.userId,
          metadata: metadata || {}
        }
      );
      
      this.sessionId = response.data.session_id;
      localStorage.setItem('travelmate_session_id', this.sessionId);
      
      return this.sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async getOrCreateSession(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    // Try to retrieve from localStorage
    const storedSessionId = localStorage.getItem('travelmate_session_id');
    if (storedSessionId) {
      this.sessionId = storedSessionId;
      return storedSessionId;
    }

    // Create new session
    return await this.createSession();
  }

  async sendMessage(
    message: string,
    context?: AgentContext
  ): Promise<AgentResponse> {
    try {
      const sessionId = await this.getOrCreateSession();

      const response = await axios.post<AgentResponse>(
        `${BACKEND_URL}/api/chat`,
        {
          user_id: this.userId,
          session_id: sessionId,
          message,
          context: context || {}
        },
        {
          timeout: 30000 // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('Agent service error:', error);
      throw error;
    }
  }

  async deleteSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await axios.delete(
        `${BACKEND_URL}/api/session/${this.sessionId}`,
        {
          params: { user_id: this.userId }
        }
      );

      this.sessionId = null;
      localStorage.removeItem('travelmate_session_id');
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  // WebSocket support for real-time communication
  createWebSocket(
    onMessage: (response: AgentResponse) => void,
    onError?: (error: Event) => void
  ): WebSocket | null {
    if (!this.sessionId) {
      console.error('No session ID available for WebSocket');
      return null;
    }

    const wsUrl = BACKEND_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/${this.userId}/${this.sessionId}`);

    ws.onmessage = (event) => {
      try {
        const response: AgentResponse = JSON.parse(event.data);
        onMessage(response);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };

    return ws;
  }
}

export const agentService = new AgentService();
