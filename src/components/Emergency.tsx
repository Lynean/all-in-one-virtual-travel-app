import React from 'react';
import { Phone, MapPin, AlertCircle, Cross, Shield, Navigation, Clock, Zap, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  type: 'police' | 'medical' | 'fire' | 'embassy';
  description: string;
}

export const Emergency: React.FC = () => {
  const { currentLocation, currentLocationName } = useStore();

  const contacts: EmergencyContact[] = [
    { 
      id: '1', 
      name: 'Police', 
      number: '911', 
      type: 'police',
      description: 'For crimes, accidents, and immediate danger'
    },
    { 
      id: '2', 
      name: 'Medical Emergency', 
      number: '911', 
      type: 'medical',
      description: 'For medical emergencies and ambulance'
    },
    { 
      id: '3', 
      name: 'Fire Department', 
      number: '911', 
      type: 'fire',
      description: 'For fires and rescue operations'
    },
    { 
      id: '4', 
      name: 'US Embassy', 
      number: '+1-202-501-4444', 
      type: 'embassy',
      description: 'For passport issues and citizen services'
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return <Cross className="w-6 h-6" strokeWidth={2.5} />;
      case 'police':
        return <Shield className="w-6 h-6" strokeWidth={2.5} />;
      case 'fire':
        return <AlertCircle className="w-6 h-6" strokeWidth={2.5} />;
      default:
        return <Phone className="w-6 h-6" strokeWidth={2.5} />;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'medical':
        return 'from-red-500 to-pink-600';
      case 'police':
        return 'from-blue-500 to-indigo-600';
      case 'fire':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-purple-500 to-pink-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Alert Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-orange-500 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
              <AlertCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Emergency Contacts</h2>
              <p className="text-red-100 mt-1">Quick access to important numbers</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-sm font-semibold">⚠️ In case of emergency, stay calm and call the appropriate number below</p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Emergency Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contacts.map((contact) => {
          const gradient = getGradient(contact.type);
          return (
            <div key={contact.id} className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg`}>
                  {getIcon(contact.type)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {contact.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{contact.description}</p>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">
                      {contact.number}
                    </p>
                  </div>
                </div>
              </div>
              <button className={`w-full py-3 rounded-2xl bg-gradient-to-br ${gradient} text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2`}>
                <Phone className="w-5 h-5" strokeWidth={2.5} />
                Call Now
              </button>
            </div>
          );
        })}
      </div>

      {/* Location Card */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
            <MapPin className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Your Location</h3>
            <p className="text-sm text-gray-500">Share with emergency services</p>
          </div>
        </div>
        
        {currentLocation && currentLocationName ? (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-blue-600 mt-0.5" strokeWidth={2.5} />
                <div className="flex-1">
                  <p className="text-sm text-blue-600 font-semibold mb-1">Current Location</p>
                  <p className="text-sm font-medium text-blue-900">{currentLocationName}</p>
                  <p className="text-xs text-blue-600 font-mono mt-2">
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
            <button className="w-full py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Share Location with Emergency Services
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-3">Location services not enabled</p>
            <button className="px-6 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all">
              Enable Location
            </button>
          </div>
        )}
      </div>

      {/* Safety Tips */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
            <Info className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Safety Tips</h3>
            <p className="text-sm text-gray-500">Important guidelines for emergencies</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Phone, text: 'Keep emergency contacts saved in your phone', color: 'from-blue-500 to-cyan-600' },
            { icon: MapPin, text: 'Know your exact location before calling', color: 'from-green-500 to-emerald-600' },
            { icon: Clock, text: 'Stay calm and speak clearly', color: 'from-purple-500 to-pink-600' },
            { icon: Shield, text: 'Follow local emergency procedures', color: 'from-orange-500 to-red-600' },
          ].map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200 flex items-start gap-3 hover:shadow-md transition-all">
                <div className={`p-2 bg-gradient-to-br ${tip.color} rounded-xl shadow-md flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm text-gray-700 font-medium flex-1">{tip.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="font-bold text-gray-900">Quick Dial</h4>
          </div>
          <p className="text-sm text-gray-600">One-tap emergency calling</p>
        </button>

        <button className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
              <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="font-bold text-gray-900">Find Hospital</h4>
          </div>
          <p className="text-sm text-gray-600">Nearest medical facilities</p>
        </button>

        <button className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="font-bold text-gray-900">Safety Info</h4>
          </div>
          <p className="text-sm text-gray-600">Local safety guidelines</p>
        </button>
      </div>

      {/* Pro Tip */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-900 mb-2">Important Reminder</h3>
            <p className="text-sm text-amber-700">
              Before traveling, research local emergency numbers for your destination. Numbers may vary by country. Save them in your phone and keep a written copy as backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
