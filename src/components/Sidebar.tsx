import React from 'react';
import { 
  CheckSquare, 
  Map, 
  AlertCircle, 
  Menu, 
  X, 
  Shield, 
  Home,
  Sparkles 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAdminClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  setIsOpen,
  onAdminClick 
}) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', color: 'from-blue-500 to-purple-500' },
    { id: 'checklist', icon: CheckSquare, label: 'Checklist', color: 'from-green-500 to-emerald-500' },
    { id: 'map', icon: Map, label: 'Map', color: 'from-blue-500 to-cyan-500' },
    { id: 'emergency', icon: AlertCircle, label: 'Emergency', color: 'from-red-500 to-orange-500' },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white shadow-2xl transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-72 border-r border-gray-100`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TravelMate
              </h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-11">AI Travel Companion</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105`
                    : 'text-gray-600 hover:bg-gray-50 hover:scale-102'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-semibold">{tab.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Feature Highlights */}
        <div className="mx-4 my-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">AI Features</span>
          </div>
          <p className="text-xs text-purple-700">
            Click the chat bubble to ask AI for help with planning, directions, and recommendations!
          </p>
        </div>

        {/* Admin Panel */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <button
            onClick={onAdminClick}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-50 transition-all group"
          >
            <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-all">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-semibold">Admin Panel</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
