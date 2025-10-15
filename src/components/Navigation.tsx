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
    <nav className="bg-neuro-bg sticky top-28 z-40 mb-8">
      <div className="container mx-auto px-4">
        <div className="neuro-element p-2">
          <div className="grid grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'neuro-inset bg-gradient-to-br from-neuro-accent to-neuro-accentLight'
                      : 'neuro-button hover:scale-105'
                  }`}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon 
                    className={`w-6 h-6 mx-auto mb-2 ${
                      isActive ? 'text-white' : 'text-neuro-text'
                    }`} 
                    strokeWidth={2.5} 
                  />
                  <span 
                    className={`text-xs font-semibold block ${
                      isActive ? 'text-white' : 'text-neuro-text'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
