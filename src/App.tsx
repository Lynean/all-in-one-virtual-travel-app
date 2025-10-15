import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Checklist } from './components/Checklist';
import { MapView } from './components/MapView';
import { AIGuide } from './components/AIGuide';
import { Emergency } from './components/Emergency';

function App() {
  const [activeTab, setActiveTab] = useState('checklist');

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
    <div className={`min-h-screen transition-colors duration-500 ${getBackgroundClass()}`}>
      <Header />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="pb-8 px-4">
        <div className="container mx-auto max-w-6xl">
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
