import React from 'react';
import { Phone, AlertTriangle, Cross, Shield } from 'lucide-react';

export const Emergency: React.FC = () => {
  const emergencyContacts = [
    { id: 1, name: 'Emergency Services', number: '112', icon: AlertTriangle, color: 'from-red-400 to-red-600' },
    { id: 2, name: 'Police', number: '110', icon: Shield, color: 'from-blue-400 to-blue-600' },
    { id: 3, name: 'Medical Emergency', number: '911', icon: Cross, color: 'from-green-400 to-green-600' },
    { id: 4, name: 'Embassy', number: '+1-555-0123', icon: Phone, color: 'from-purple-400 to-purple-600' },
  ];

  const safetyTips = [
    'Keep copies of important documents',
    'Share your location with trusted contacts',
    'Know the local emergency numbers',
    'Keep emergency cash in a safe place',
    'Register with your embassy',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-neuro-emergency-card rounded-3xl p-6 shadow-neuro-emergency border-2 border-neuro-emergency">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl shadow-neuro-emergency-sm p-3 bg-gradient-to-br from-red-400 to-red-600">
            <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-neuro-emergency-text">Emergency Contacts</h2>
        </div>

        <div className="grid gap-4 mb-6">
          {emergencyContacts.map(contact => {
            const Icon = contact.icon;
            return (
              <a
                key={contact.id}
                href={`tel:${contact.number}`}
                className="bg-neuro-emergency-card rounded-3xl shadow-neuro-emergency p-5 flex items-center gap-4 hover:shadow-neuro-hover active:shadow-neuro-active transition-all"
                aria-label={`Call ${contact.name}`}
              >
                <div className={`rounded-xl shadow-neuro-emergency-sm p-4 bg-gradient-to-br ${contact.color}`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-neuro-emergency-text">{contact.name}</h3>
                  <p className="text-2xl font-bold text-neuro-accent mt-1">{contact.number}</p>
                </div>
                <Phone className="w-5 h-5 text-neuro-emergency-textLight" strokeWidth={2.5} />
              </a>
            );
          })}
        </div>
      </div>

      <div className="bg-neuro-emergency-card rounded-3xl p-6 shadow-neuro-emergency">
        <h3 className="text-xl font-bold text-neuro-emergency-text mb-4">Safety Tips</h3>
        <div className="space-y-3">
          {safetyTips.map((tip, index) => (
            <div key={index} className="bg-neuro-emergency-bg rounded-2xl shadow-neuro-emergency-sm p-4 flex items-start gap-3">
              <div className="rounded-xl shadow-neuro-emergency-sm w-8 h-8 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-neuro-accent to-neuro-accentLight">
                <span className="text-white font-bold text-sm">{index + 1}</span>
              </div>
              <p className="text-neuro-emergency-text flex-1">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-neuro-emergency-card rounded-3xl p-6 shadow-neuro-emergency bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" strokeWidth={2.5} />
          <div>
            <h4 className="font-bold text-amber-900 mb-2">Important Notice</h4>
            <p className="text-sm text-amber-800">
              In case of emergency, always call local emergency services first. These numbers are for reference and may vary by location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
