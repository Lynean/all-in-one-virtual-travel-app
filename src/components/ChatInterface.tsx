import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useStore } from '../store/useStore';

export const ChatInterface: React.FC = () => {
  const { messages } = useStore();
  const { sendMessage, isLoading } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    await sendMessage(textToSend);
  };

  const handleSuggestionClick = (suggestion: string) => {
    console.log('🎯 Suggestion clicked:', suggestion);
    handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show welcome message if no messages
  const displayMessages = messages.length === 0 ? [{
    id: 'welcome',
    role: 'assistant' as const,
    content: "Hi! I'm your AI travel assistant. I can help you with:\n\n• Finding places and attractions\n• Getting directions\n• Creating travel checklists\n• Recommending activities\n• Answering travel questions\n\nWhat would you like to know?",
    timestamp: new Date(),
    suggestions: [
      'Find restaurants near me',
      'Plan a 3-day itinerary',
      'Show tourist attractions',
      'Create packing checklist'
    ]
  }] : messages;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Chat Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Travel Assistant</h2>
            <p className="text-sm text-gray-500">Ask me anything about your trip</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {displayMessages.map((message) => {
            console.log('🎨 Rendering message:', message.id, 'Has suggestions:', !!message.suggestions, 'Count:', message.suggestions?.length);
            console.log('🎨 Suggestions data:', message.suggestions);
            
            return (
              <div key={message.id}>
                <div
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-600'
                        : 'bg-gradient-to-br from-purple-600 to-pink-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div
                    className={`flex-1 max-w-2xl ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block p-4 rounded-2xl shadow-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {/* DEBUG: Show suggestions info */}
                      {message.role === 'assistant' && (
                        <div className="mt-2 text-xs text-gray-400 border-t border-gray-200 pt-2">
                          DEBUG: Has suggestions: {message.suggestions ? 'YES' : 'NO'} | 
                          Count: {message.suggestions?.length || 0} | 
                          Data: {JSON.stringify(message.suggestions)}
                        </div>
                      )}
                      
                      {/* Suggestions within message bubble */}
                      {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <p className="text-sm font-semibold text-gray-700">Try asking:</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => {
                              console.log('🔘 Rendering suggestion button:', index, suggestion);
                              return (
                                <button
                                  key={index}
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  disabled={isLoading}
                                  className="group px-3 py-2 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 rounded-xl text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-purple-200"
                                >
                                  <Sparkles className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                  {suggestion}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 max-w-2xl">
                <div className="inline-block p-4 rounded-2xl shadow-lg bg-white">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-md border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your trip..."
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none resize-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleSend('Find popular restaurants near me')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🍽️ Find restaurants
            </button>
            <button
              onClick={() => handleSend('Create a 3-day itinerary for Paris')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📅 Plan itinerary
            </button>
            <button
              onClick={() => handleSend('What should I pack for a beach vacation?')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎒 Packing tips
            </button>
            <button
              onClick={() => handleSend('Show me tourist attractions nearby')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗺️ Find attractions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
