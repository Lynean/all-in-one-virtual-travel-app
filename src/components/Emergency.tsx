import React from 'react';
import { Phone, MapPin, AlertCircle, Cross } from 'lucide-react';

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  type: 'police' | 'medical' | 'fire' | 'embassy';
}

export const Emergency: React.FC = () => {
  const contacts: EmergencyContact[] = [
    { id: '1', name: 'Police', number: '911', type: 'police' },
    { id: '2', name: 'Medical Emergency', number: '911', type: 'medical' },
    { id: '3', name: 'Fire Department', number: '911', type: 'fire' },
    { id: '4', name: 'US Embassy', number: '+1-202-501-4444', type: 'embassy' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return <Cross className="w-6 h-6" strokeWidth={2.5} />;
      case 'police':
      case 'fire':
        return <AlertCircle className="w-6 h-6" strokeWidth={2.5} />;
      default:
        return <Phone className="w-6 h-6" strokeWidth={2.5} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="neuro-element p-6 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="flex items-center gap-4 mb-4">
          <div className="neuro-element p-4 bg-gradient-to-br from-red-500 to-orange-500">
            <AlertCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neuro-text">Emergency Contacts</h2>
            <p className="text-sm text-neuro-textLight mt-1">
              Quick access to important numbers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="neuro-element p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="neuro-element-sm p-3 text-neuro-accent">
                {getIcon(contact.type)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neuro-text">
                  {contact.name}
                </h3>
                <p className="text-2xl font-bold text-neuro-accent mt-1">
                  {contact.number}
                </p>
              </div>
            </div>
            <button className="w-full neuro-button py-3 bg-gradient-to-br from-neuro-accent to-neuro-accentLight text-white font-semibold hover:scale-105 transition-transform">
              Call Now
            </button>
          </div>
        ))}
      </div>

      <div className="neuro-element p-6">
        <h3 className="text-xl font-bold text-neuro-text mb-4">Your Location</h3>
        <div className="neuro-element-sm p-4 flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-neuro-accent" strokeWidth={2.5} />
          <div>
            <p className="text-sm text-neuro-textLight">Current Location</p>
            <p className="text-sm font-semibold text-neuro-text">
              Location services required
            </p>
          </div>
        </div>
        <button className="w-full neuro-button py-3 text-neuro-text font-semibold hover:scale-105 transition-transform">
          Share Location with Emergency Services
        </button>
      </div>

      <div className="neuro-element p-6">
        <h3 className="text-xl font-bold text-neuro-text mb-4">Safety Tips</h3>
        <div className="space-y-3">
          {[
            'Keep emergency contacts saved in your phone',
            'Know your exact location before calling',
            'Stay calm and speak clearly',
            'Follow local emergency procedures',
          ].map((tip, index) => (
            <div key={index} className="neuro-element-sm p-4 flex items-start gap-3">
              <div className="neuro-element-sm p-2 bg-gradient-to-br from-neuro-accent to-neuro-accentLight text-white font-bold text-sm min-w-[32px] text-center">
                {index + 1}
              </div>
              <p className="text-sm text-neuro-text flex-1">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
