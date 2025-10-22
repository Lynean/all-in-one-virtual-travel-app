import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Calendar, CheckSquare, Sparkles, Wallet, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
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

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const renderView = () => {
    if (!isConfigLoaded) {
      return (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading configuration...</p>
          </div>
        </div>
      );
    }

    if (configError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
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

  const navItems = [
    { id: 'map' as View, icon: Navigation, label: 'Explore' },
    { id: 'itinerary' as View, icon: Calendar, label: 'Plan Trip' },
    { id: 'checklist' as View, icon: CheckSquare, label: 'Checklist' },
    { id: 'budget' as View, icon: Wallet, label: 'Budget' },
  ];

  return (
    <ChatProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header - Mobile Optimized */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TravelMate
                  </h1>
                  <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Your AI Travel Companion</p>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleViewChange(item.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                        currentView === item.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <nav className="md:hidden mt-3 pb-2 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleViewChange(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        currentView === item.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </header>

        {/* Main Content with Scrollbar - Mobile Optimized */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 sm:pb-6">
            {renderView()}
          </div>
        </main>

        {/* Footer - Mobile Optimized */}
        <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 py-2 sm:py-3">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                <span>Powered by AI & Google Maps</span>
              </div>
              <div className="text-[10px] sm:text-xs">
                © 2024 TravelMate - Built with ChatAndBuild
              </div>
            </div>
          </div>
        </footer>

        {/* Floating Chat Bubble - Mobile Optimized */}
        <FloatingChatBubble />
      </div>
    </ChatProvider>
  );
}

export default App;
