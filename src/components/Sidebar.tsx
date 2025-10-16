import React from 'react';
import { CheckSquare, Map, MessageSquare, Phone, Plane, Menu, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const tabs = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'ai', label: 'AI Guide', icon: MessageSquare },
    { id: 'emergency', label: 'Emergency', icon: Phone },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 neuro-button p-3 bg-neuro-bg"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-neuro-text" strokeWidth={2.5} />
        ) : (
          <Menu className="w-6 h-6 text-neuro-text" strokeWidth={2.5} />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-neuro-bg z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="neuro-element-lg h-full w-72 lg:w-80 flex flex-col p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="neuro-element p-4 bg-gradient-to-br from-neuro-accent to-neuro-accentLight mb-4">
              <Plane className="w-10 h-10 text-white mx-auto" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-neuro-text text-center tracking-tight">
              TravelMate
            </h1>
            <p className="text-xs text-neuro-textLight text-center mt-2">
              AI-Powered Travel Companion
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (window.innerWidth < 1024) {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full py-4 px-6 rounded-2xl transition-all duration-300 flex items-center gap-4 ${
                    isActive
                      ? 'neuro-inset bg-gradient-to-br from-neuro-accent to-neuro-accentLight'
                      : 'neuro-button hover:scale-105'
                  }`}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon 
                    className={`w-6 h-6 ${
                      isActive ? 'text-white' : 'text-neuro-text'
                    }`} 
                    strokeWidth={2.5} 
                  />
                  <span 
                    className={`text-base font-semibold ${
                      isActive ? 'text-white' : 'text-neuro-text'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-6 border-t border-neuro-textLight/20">
            <p className="text-xs text-neuro-textLight text-center">
              Version 1.0.0
            </p>
            <p className="text-xs text-neuro-textLight text-center mt-1">
              © 2024 TravelMate
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
