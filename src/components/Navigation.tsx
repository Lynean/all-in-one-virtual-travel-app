import React from 'react';
import { CheckSquare, Map, MessageSquare, Phone } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'ai', label: 'AI Guide', icon: MessageSquare },
    { id: 'emergency', label: 'Emergency', icon: Phone },
  ];

  return (
    <nav className="bg-white neo-border-thick border-t-0 border-b-0">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-4 gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 neo-border border-t-0 border-b-0 border-l-0 last:border-r-0 transition-colors ${
                  isActive
                    ? 'bg-[#00F0FF] text-black'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-1" strokeWidth={3} />
                <span className="text-xs font-bold uppercase block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
