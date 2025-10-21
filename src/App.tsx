import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Checklist } from './components/Checklist';
import { MapView } from './components/MapView';
import { Emergency } from './components/Emergency';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const [activeTab, setActiveTab] = useState('checklist');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const getBackgroundClass = () => {
    switch (activeTab) {
      case 'checklist':
        return 'bg-neuro-checklist-bg';
      case 'map':
        return 'bg-neuro-map-bg';
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
        onAdminClick={() => setShowAdminPanel(true)}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 lg:ml-0' : 'ml-0'}`}>
        <div className="container mx-auto max-w-6xl p-4 lg:p-8">
          {/* Conditionally render components to properly cleanup Google Maps */}
          {activeTab === 'checklist' && <Checklist key="checklist" />}
          {activeTab === 'map' && <MapView key="map" />}
          {activeTab === 'emergency' && <Emergency key="emergency" />}
        </div>
      </main>

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

export default App;
