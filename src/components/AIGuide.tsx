import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { generateAIResponse } from '../services/gemini';
import { useStore } from '../store/useStore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export const AIGuide: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI emergency preparedness assistant. I can help you create checklists, provide safety advice, and answer questions about disaster preparedness. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { destination, checklist } = useStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() && !loading) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: input,
        sender: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);

      try {
        const aiResponseText = await generateAIResponse(input, destination);
        
        const cleanedResponse = aiResponseText.replace(/\[CHECKLIST:[^\]]+\]/g, '').trim();
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: cleanedResponse,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('AI response error:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: '⚠️ Sorry, I encountered an error. Please try again.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="space-y-6">
      <div className="bg-neuro-ai-card rounded-3xl p-6 shadow-neuro-ai">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neuro-ai-text">AI Emergency Guide</h2>
          {checklist.length > 0 && (
            <div className="text-sm text-neuro-ai-textLight bg-neuro-ai-bg rounded-xl shadow-neuro-ai-sm px-3 py-1">
              {checklist.length} checklist items
            </div>
          )}
        </div>
        
        <div className="rounded-2xl shadow-neuro-inset p-4 mb-6 bg-neuro-ai-bg" style={{ height: '400px', overflowY: 'auto' }}>
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`rounded-xl shadow-neuro-ai-sm p-3 flex-shrink-0 ${
                  message.sender === 'ai' ? 'bg-gradient-to-br from-neuro-accent to-neuro-accentLight' : 'bg-neuro-ai-card'
                }`}>
                  {message.sender === 'ai' ? (
                    <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                  ) : (
                    <User className="w-5 h-5 text-neuro-ai-text" strokeWidth={2.5} />
                  )}
                </div>
                <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-2xl shadow-neuro-ai-sm p-4 max-w-[80%] ${
                    message.sender === 'user' ? 'bg-gradient-to-br from-neuro-accent to-neuro-accentLight' : 'bg-neuro-ai-card'
                  }`}>
                    <p className={`text-sm whitespace-pre-wrap ${
                      message.sender === 'user' ? 'text-white' : 'text-neuro-ai-text'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                  <p className="text-xs text-neuro-ai-textLight mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="rounded-xl shadow-neuro-ai-sm p-3 flex-shrink-0 bg-gradient-to-br from-neuro-accent to-neuro-accentLight">
                  <Loader className="w-5 h-5 text-white animate-spin" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <div className="inline-block rounded-2xl shadow-neuro-ai-sm p-4 bg-neuro-ai-card">
                    <p className="text-sm text-neuro-ai-textLight">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Ask about emergency preparedness..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-2xl shadow-neuro-inset bg-neuro-ai-bg text-neuro-ai-text placeholder-neuro-ai-textLight focus:outline-none disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-2xl shadow-neuro-ai-sm hover:shadow-neuro-hover active:shadow-neuro-active bg-gradient-to-br from-neuro-accent to-neuro-accentLight transition-all disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            'Create emergency checklist',
            'What should I prepare?',
            'Emergency contact info',
            'Disaster evacuation tips'
          ].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={loading}
              className="rounded-2xl shadow-neuro-ai-sm hover:shadow-neuro-hover active:shadow-neuro-active p-3 text-sm text-neuro-ai-text font-medium transition-all disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
