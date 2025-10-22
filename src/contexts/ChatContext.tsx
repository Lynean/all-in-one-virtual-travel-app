import React, { createContext, useContext, useState, useCallback } from 'react';
import { agentService, AgentResponse } from '../services/agentService';
import { useStore } from '../store/useStore';
import { ChecklistAppAction } from '../types/checklist';

interface ChatContextType {
  isExpanded: boolean;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    addMessage, 
    currentLocation, 
    locationConfirmed,
    addChecklistItem,
    removeChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    setAiChecklist,
  } = useStore();

  const toggleChat = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);
    
    // Add user message immediately
    addMessage('user', message);

    try {
      const context = {
        current_location: currentLocation || undefined,
        location_confirmed: locationConfirmed,
      };

      const response: AgentResponse = await agentService.sendMessage(message, context);
      
      // Add assistant response with suggestions
      addMessage('assistant', response.message, response.suggestions);

      // Process app actions
      if (response.app_actions) {
        response.app_actions.forEach(action => {
          // Handle AI-generated checklist
          if (action.type === 'checklist') {
            const checklistAction = action as ChecklistAppAction;
            console.log('📋 Received checklist data:', checklistAction.data);
            // Convert ChecklistData to AiChecklistData format
            setAiChecklist(checklistAction.data);
            return;
          }

          // Handle legacy checklist actions
          switch (action.type) {
            case 'add_checklist_item':
              addChecklistItem({
                text: action.data.text,
                category: action.data.category || 'during',
                completed: false,
              });
              break;

            case 'remove_checklist_item':
              removeChecklistItem(action.data.id);
              break;

            case 'toggle_checklist_item':
              toggleChecklistItem(action.data.id);
              break;

            case 'update_checklist_item':
              updateChecklistItem(action.data.id, action.data.text);
              break;
          }
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      addMessage('assistant', `Sorry, I encountered an error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, locationConfirmed, addMessage, addChecklistItem, removeChecklistItem, toggleChecklistItem, updateChecklistItem, setAiChecklist]);

  return (
    <ChatContext.Provider value={{ 
      isExpanded, 
      toggleChat, 
      sendMessage, 
      isLoading, 
      error 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
