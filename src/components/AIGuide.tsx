import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Loader, Sparkles } from 'lucide-react';

export const AIGuide: React.FC = () => {
  const { chatHistory, addMessage, destination } = useStore();
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

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        `Great question about ${destination || 'your destination'}! Based on local forums and travel guides, here's what I found:\n\n• Most travelers recommend getting a local SIM card at the airport for better rates\n• Public transportation is reliable and affordable - consider getting a multi-day pass\n• Popular areas to visit include the historic district and waterfront\n• Local markets are best visited in the morning for fresh produce and better prices\n\nWould you like specific recommendations for accommodations or restaurants?`,
        
        `Here's a comprehensive checklist for your arrival:\n\n1. Download these essential apps:\n   • Local transit app for real-time schedules\n   • Translation app for communication\n   • Food delivery apps (popular local ones)\n\n2. Transportation tips:\n   • Airport to city: Express train is fastest (30 min, $15)\n   • Taxi meters should start at $3-5\n   • Ride-sharing apps are widely available\n\n3. First-day essentials:\n   • Get local currency from ATM (better rates than exchange)\n   • Purchase transit card at convenience stores\n   • Register at your embassy if staying long-term`,
        
        `Regarding local marketplace prices, here's what the community says:\n\n• Tourist areas typically charge 30-50% more\n• Bargaining is expected at street markets\n• Reasonable prices for common items:\n  - Street food: $2-5\n  - Local restaurant meal: $8-15\n  - Taxi per km: $0.50-1\n  - Bottled water: $0.50-1\n\nBetter alternatives nearby:\n• Local market 2 blocks east (20% cheaper)\n• Neighborhood shopping district (authentic prices)\n• Supermarkets for packaged goods\n\nWould you like directions to any of these locations?`,
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addMessage('assistant', randomResponse);
      setIsLoading(false);
    }, 1500);
  };

  const quickPrompts = [
    'What should I do before arriving?',
    'Best apps to download?',
    'How much should a taxi cost?',
    'Where are the best local markets?',
    'Is this price reasonable?',
    'Emergency contacts and hospitals',
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-white neo-border neo-shadow-lg flex flex-col h-[calc(100vh-250px)]">
        <div className="bg-[#FF005C] p-4 neo-border border-t-0 border-l-0 border-r-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#00F0FF] neo-border p-2">
              <Sparkles className="w-6 h-6" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase text-white">AI Tour Guide</h2>
              <p className="text-xs text-white uppercase">Powered by local insights & forums</p>
            </div>
          </div>
        </div>

        {chatHistory.length === 0 && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="bg-[#00F0FF] neo-border p-6 mb-6">
              <h3 className="font-bold uppercase mb-3 text-lg">👋 Welcome to Your AI Travel Assistant!</h3>
              <p className="font-mono text-sm mb-4">
                I can help you with:
              </p>
              <ul className="font-mono text-sm space-y-2 list-none">
                <li>✓ Pre-arrival checklists and visa requirements</li>
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
              placeholder="Ask me anything about your destination..."
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
