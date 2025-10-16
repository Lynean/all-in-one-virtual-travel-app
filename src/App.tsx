import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Checklist } from './components/Checklist';
import { MapView } from './components/MapView';
import { AIGuide } from './components/AIGuide';
import { Emergency } from './components/Emergency';

function App() {
  const [activeTab, setActiveTab] = useState('checklist');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getBackgroundClass = () => {
    switch (activeTab) {
      case 'checklist':
        return 'bg-neuro-checklist-bg';
      case 'map':
        return 'bg-neuro-map-bg';
      case 'ai':
        return 'bg-neuro-ai-bg';
      case 'emergency':
        return 'bg-neuro-emergency-bg';
      default:
        return 'bg-neuro-bg';
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${getBackgroundClass()}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 lg:ml-0' : 'ml-0'}`}>
        <div className="container mx-auto max-w-6xl p-4 lg:p-8">
          {activeTab === 'checklist' && <Checklist />}
          {activeTab === 'map' && <MapView />}
          {activeTab === 'ai' && <AIGuide />}
          {activeTab === 'emergency' && <Emergency />}
        </div>
      </main>
    </div>
  );
}

export default App;
