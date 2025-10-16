import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Zap, Brain } from 'lucide-react';
import { hybridRouter } from '../services/hybridRouter';
import { useStore } from '../store/useStore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  source?: 'gemini' | 'langchain';
}

export const AIGuide: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI travel guide. I can help you with:\n\n• Finding places and directions\n• Planning multi-day itineraries\n• Budget optimization\n• Weather forecasts\n• Currency conversions\n\nHow can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
      source: 'gemini',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    destination, 
    currentLocation, 
    locationConfirmed,
    chatHistory,
    addMessage 
  } = useStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() && !isProcessing) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: input,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      addMessage('user', input);
      setInput('');
      setIsProcessing(true);

      try {
        const response = await hybridRouter.routeQuery(
          input,
          destination,
          currentLocation,
          locationConfirmed
        );

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.message,
          sender: 'ai',
          timestamp: new Date(),
          source: response.source,
        };

        setMessages(prev => [...prev, aiMessage]);
        addMessage('assistant', response.message);

        // Handle map actions if any
        if (response.mapActions && response.mapActions.length > 0) {
          console.log('Map actions received:', response.mapActions);
          // Map actions will be handled by MapView component through store
        }

        // Handle search results if any
        if (response.searchResults && response.searchResults.length > 0) {
          const resultsMessage: Message = {
            id: (Date.now() + 2).toString(),
            text: formatSearchResults(response.searchResults),
            sender: 'ai',
            timestamp: new Date(),
            source: response.source,
          };
          setMessages(prev => [...prev, resultsMessage]);
        }

      } catch (error) {
        console.error('AI Guide error:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error processing your request. Please try again.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const formatSearchResults = (results: any[]): string => {
    let formatted = '📍 **Search Results:**\n\n';
    results.slice(0, 5).forEach((result, index) => {
      formatted += `${index + 1}. **${result.name}**\n`;
      if (result.vicinity) formatted += `   ${result.vicinity}\n`;
      if (result.rating) formatted += `   ⭐ ${result.rating}\n`;
      formatted += '\n';
    });
    return formatted;
  };

  const getSourceIcon = (source?: 'gemini' | 'langchain') => {
    if (source === 'langchain') {
      return <Brain className="w-4 h-4 text-purple-500" strokeWidth={2.5} />;
    }
    return <Zap className="w-4 h-4 text-yellow-500" strokeWidth={2.5} />;
  };

  const getSourceLabel = (source?: 'gemini' | 'langchain') => {
    if (source === 'langchain') {
      return 'LangChain Agent 🧠';
    }
    return 'Gemini ⚡';
  };

  return (
    <div className="space-y-6">
      <div className="neuro-element p-6 h-[600px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neuro-text">AI Travel Assistant</h2>
          {isProcessing && (
            <div className="flex items-center gap-2 text-neuro-accent">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
              <span className="text-sm font-medium">Thinking...</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className={`neuro-element-sm p-3 ${
                message.sender === 'user' 
                  ? 'bg-gradient-to-br from-neuro-accent to-neuro-accentLight' 
                  : ''
              }`}>
                {message.sender === 'ai' ? (
                  <Bot className="w-5 h-5 text-neuro-accent" strokeWidth={2.5} />
                ) : (
                  <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                )}
              </div>
              
              <div className={`flex-1 max-w-[80%] ${
                message.sender === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`neuro-element-sm p-4 inline-block ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-br from-neuro-accent to-neuro-accentLight' 
                    : ''
                }`}>
                  <p className={`text-sm whitespace-pre-wrap ${
                    message.sender === 'user' ? 'text-white' : 'text-neuro-text'
                  }`}>
                    {message.text}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-neuro-textLight">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  {message.sender === 'ai' && message.source && (
                    <div className="flex items-center gap-1 text-xs text-neuro-textLight">
                      {getSourceIcon(message.source)}
                      <span>{getSourceLabel(message.source)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isProcessing && sendMessage()}
            placeholder="Ask me anything about your trip..."
            className="flex-1 neuro-input px-4 py-3 text-neuro-text placeholder-neuro-textLight"
            disabled={isProcessing}
          />
          <button
            onClick={sendMessage}
            className="neuro-button px-6 py-3 bg-gradient-to-br from-neuro-accent to-neuro-accentLight"
            aria-label="Send message"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={2.5} />
            ) : (
              <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          'Find restaurants near me',
          'Plan a 3-day trip to Paris',
          'What\'s the weather like?',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="neuro-button p-4 text-sm text-neuro-text hover:scale-105 transition-transform"
            disabled={isProcessing}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="neuro-element p-6">
        <h3 className="text-lg font-semibold text-neuro-text mb-4">AI Routing Info</h3>
        <div className="space-y-3 text-sm text-neuro-textLight">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div>
              <p className="font-semibold text-neuro-text">Gemini ⚡ (Fast)</p>
              <p>Simple queries: nearby places, directions, basic info</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div>
              <p className="font-semibold text-neuro-text">LangChain Agent 🧠 (Powerful)</p>
              <p>Complex queries: multi-day planning, budget optimization, weather-based decisions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
