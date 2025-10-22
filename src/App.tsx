import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Calendar, CheckSquare, Sparkles, Wallet } from 'lucide-react';
import { MapView } from './components/MapView';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { Checklist } from './components/Checklist';
import { BudgetPlanner } from './components/BudgetPlanner';
import { FloatingChatBubble } from './components/FloatingChatBubble';
import { ChatProvider } from './contexts/ChatContext';
import { configService } from './services/configService';

type View = 'map' | 'itinerary' | 'checklist' | 'budget';

function App() {
  const [currentView, setCurrentView] = useState<View>('map');
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Preload Google Maps configuration
    const loadConfig = async () => {
      try {
        await configService.getGoogleMapsConfig();
        setIsConfigLoaded(true);
      } catch (error) {
        console.error('Failed to load configuration:', error);
        setConfigError('Failed to load Google Maps configuration. Please try again later.');
      }
    };

    loadConfig();
  }, []);

  const renderView = () => {
    if (!isConfigLoaded) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading configuration...</p>
          </div>
        </div>
      );
    }

    if (configError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
            <p className="text-red-600 mb-4">{configError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'map':
        return <MapView />;
      case 'itinerary':
        return <ItineraryPlanner />;
      case 'checklist':
        return <Checklist />;
      case 'budget':
        return <BudgetPlanner />;
      default:
        return <MapView />;
    }
  };

  return (
    <ChatProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TravelMate
                  </h1>
                  <p className="text-xs text-gray-500">Your AI Travel Companion</p>
                </div>
              </div>
              
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView('map')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    currentView === 'map'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  <span className="hidden sm:inline">Explore</span>
                </button>
                
                <button
                  onClick={() => setCurrentView('itinerary')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    currentView === 'itinerary'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Plan Trip</span>
                </button>

                <button
                  onClick={() => setCurrentView('checklist')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    currentView === 'checklist'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Checklist</span>
                </button>

                <button
                  onClick={() => setCurrentView('budget')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    currentView === 'budget'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Budget</span>
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content with Scrollbar */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderView()}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Powered by AI & Google Maps</span>
              </div>
              <div className="text-xs">
                © 2024 TravelMate - Built with ChatAndBuild
              </div>
            </div>
          </div>
        </footer>

        {/* Floating Chat Bubble - Persists across all tabs */}
        <FloatingChatBubble />
      </div>
    </ChatProvider>
  );
}

export default App;
