import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Checklist } from './components/Checklist';
import { MapView } from './components/MapView';
import { AIGuide } from './components/AIGuide';
import { Emergency } from './components/Emergency';

function App() {
  const [activeTab, setActiveTab] = useState('checklist');

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="pb-8">
        {activeTab === 'checklist' && <Checklist />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'ai' && <AIGuide />}
        {activeTab === 'emergency' && <Emergency />}
      </main>
    </div>
  );
}

export default App;
