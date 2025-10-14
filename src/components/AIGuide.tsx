import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Loader, Sparkles, AlertCircle, ListChecks } from 'lucide-react';
import { generateAIResponse } from '../services/gemini';

export const AIGuide: React.FC = () => {
  const { chatHistory, addMessage, destination, checklist } = useStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(userMessage, destination);
      // Remove checklist tags from display
      const displayResponse = aiResponse.replace(/\[CHECKLIST:[^\]]+\]/g, '').trim();
      addMessage('assistant', displayResponse);
    } catch (error) {
      console.error('Error getting AI response:', error);
      addMessage('assistant', '⚠️ Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Create a checklist for my trip',
    'What should I do before arriving?',
    'Best apps to download?',
    'How much should a taxi cost?',
    'Where are the best local markets?',
    'Emergency contacts and hospitals',
  ];

  const hasApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-white neo-border neo-shadow-lg flex flex-col h-[calc(100vh-250px)]">
        <div className="bg-[#FF005C] p-4 neo-border border-t-0 border-l-0 border-r-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#00F0FF] neo-border p-2">
              <Sparkles className="w-6 h-6" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold uppercase text-white">AI Tour Guide</h2>
              <p className="text-xs text-white uppercase">Powered by Google Gemini AI</p>
            </div>
            {checklist.length > 0 && (
              <div className="bg-[#00F0FF] neo-border px-3 py-1 flex items-center gap-2">
                <ListChecks className="w-4 h-4" strokeWidth={3} />
                <span className="text-xs font-bold">{checklist.length}</span>
              </div>
            )}
            {!hasApiKey && (
              <div className="bg-[#FFD700] neo-border p-2">
                <AlertCircle className="w-5 h-5" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>

        {!hasApiKey && (
          <div className="bg-[#FFD700] neo-border border-t-0 border-l-0 border-r-0 p-4">
            <p className="font-mono text-sm font-bold">
              ⚠️ API KEY REQUIRED: Add your Gemini API key to .env file to enable AI features
            </p>
          </div>
        )}

        {chatHistory.length === 0 && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="bg-[#00F0FF] neo-border p-6 mb-6">
              <h3 className="font-bold uppercase mb-3 text-lg">👋 Welcome to Your AI Travel Assistant!</h3>
              <p className="font-mono text-sm mb-4">
                I can help you with:
              </p>
              <ul className="font-mono text-sm space-y-2 list-none">
                <li>✓ Create personalized travel checklists</li>
                <li>✓ Pre-arrival requirements and visa info</li>
                <li>✓ Local transportation and app recommendations</li>
                <li>✓ Price verification to avoid scams</li>
                <li>✓ Navigation assistance with GPS integration</li>
                <li>✓ Local marketplace reviews and alternatives</li>
                <li>✓ Cultural tips and etiquette</li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="font-bold uppercase mb-3">Quick Questions:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="bg-white neo-border p-3 text-left font-mono text-sm hover:bg-[#FFD700] hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow-sm transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {chatHistory.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 neo-border neo-shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#00F0FF]'
                      : 'bg-white'
                  }`}
                >
                  <p className="font-mono text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white neo-border neo-shadow-sm p-4">
                  <Loader className="w-5 h-5 animate-spin" strokeWidth={3} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="p-4 neo-border border-b-0 border-l-0 border-r-0 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything or request a checklist..."
              className="flex-1 px-4 py-3 neo-border bg-white text-black font-mono focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-[#FF005C] neo-border px-6 py-3 font-bold uppercase hover:translate-x-1 hover:translate-y-1 hover:shadow-none neo-shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
            >
              <Send className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
