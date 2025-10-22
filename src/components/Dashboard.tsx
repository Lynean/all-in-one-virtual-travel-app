import React from 'react';
import { 
  CheckSquare, 
  Map, 
  AlertCircle, 
  MessageSquare, 
  TrendingUp,
  MapPin,
  Clock,
  Star,
  Zap,
  Globe,
  Navigation,
  Calendar
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { checklist, destination, currentLocation } = useStore();

  // Calculate checklist statistics
  const totalItems = checklist.length;
  const completedItems = checklist.filter(item => item.completed).length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Category breakdown
  const categoryStats = {
    before: checklist.filter(item => item.category === 'before').length,
    arrival: checklist.filter(item => item.category === 'arrival').length,
    during: checklist.filter(item => item.category === 'during').length,
    departure: checklist.filter(item => item.category === 'departure').length,
  };

  const features = [
    {
      id: 'checklist',
      title: 'Smart Checklist',
      description: 'AI-powered packing and planning lists',
      icon: CheckSquare,
      color: 'from-green-500 to-emerald-600',
      stats: `${completedItems}/${totalItems} completed`,
      action: 'View Checklist',
    },
    {
      id: 'map',
      title: 'Interactive Map',
      description: 'Explore destinations with AI guidance',
      icon: Map,
      color: 'from-blue-500 to-cyan-600',
      stats: currentLocation ? 'Location active' : 'Enable location',
      action: 'Open Map',
    },
    {
      id: 'emergency',
      title: 'Emergency Info',
      description: 'Quick access to important contacts',
      icon: AlertCircle,
      color: 'from-red-500 to-orange-600',
      stats: 'Always ready',
      action: 'View Contacts',
    },
  ];

  const quickActions = [
    { icon: MessageSquare, label: 'Ask AI', color: 'bg-purple-500', action: () => {} },
    { icon: MapPin, label: 'Find Places', color: 'bg-blue-500', action: () => onNavigate('map') },
    { icon: Calendar, label: 'Plan Trip', color: 'bg-green-500', action: () => {} },
    { icon: Navigation, label: 'Get Directions', color: 'bg-cyan-500', action: () => onNavigate('map') },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Globe className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome to TravelMate</h1>
              <p className="text-blue-100 mt-1">Your AI-powered travel companion</p>
            </div>
          </div>
          
          {destination && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">Current Destination</span>
              </div>
              <p className="text-2xl font-bold">{destination}</p>
            </div>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Progress Overview */}
      {totalItems > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Trip Progress</h3>
                <p className="text-sm text-gray-500">Keep track of your preparation</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{completionPercentage}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">{categoryStats.before}</div>
              <div className="text-xs text-gray-600 mt-1">Pre-Departure</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{categoryStats.arrival}</div>
              <div className="text-xs text-gray-600 mt-1">Arrival</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{categoryStats.during}</div>
              <div className="text-xs text-gray-600 mt-1">During Trip</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">{categoryStats.departure}</div>
              <div className="text-xs text-gray-600 mt-1">Departure</div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              onClick={() => onNavigate(feature.id)}
              className="group relative bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">{feature.stats}</span>
                <span className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  {feature.action} →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500">Common tasks at your fingertips</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className={`${action.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Assistant Promo */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">AI Travel Assistant</h3>
              <p className="text-purple-100 mb-4">
                Get personalized recommendations, create checklists, find places, and get directions - all through natural conversation.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  🗺️ Find places
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  ✅ Create checklists
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  🚇 Get directions
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  💡 Get tips
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-500 rounded-xl">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pro Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Use the AI assistant to create comprehensive checklists for your destination</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Enable location services for personalized nearby recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Save emergency contacts before your trip for quick access</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
