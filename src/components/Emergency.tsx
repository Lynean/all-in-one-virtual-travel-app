import React, { useState } from 'react';
import { emergencyContacts } from '../data/emergencyContacts';
import { Phone, Search, AlertTriangle } from 'lucide-react';

export const Emergency: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = emergencyContacts.filter((contact) =>
    contact.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-[#FF005C] neo-border neo-shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white neo-border p-3">
            <AlertTriangle className="w-8 h-8" strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase text-white">Emergency Contacts</h2>
            <p className="text-sm text-white uppercase">Quick access to help</p>
          </div>
        </div>

        <div className="bg-white neo-border p-4">
          <p className="font-mono text-sm font-bold">
            ⚠️ IN CASE OF EMERGENCY: Always call local emergency services first. Keep this information accessible offline.
          </p>
        </div>
      </div>

      <div className="bg-white neo-border neo-shadow-lg p-6 mb-6">
        <div className="flex gap-2 mb-6">
          <Search className="w-6 h-6 mt-3" strokeWidth={3} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search country..."
            className="flex-1 px-4 py-3 neo-border bg-white text-black font-mono focus:outline-none"
          />
        </div>

        <div className="space-y-4">
          {filteredContacts.map((contact) => (
            <div key={contact.country} className="neo-border bg-white">
              <div className="bg-[#00F0FF] neo-border border-t-0 border-l-0 border-r-0 p-4">
                <h3 className="text-xl font-bold uppercase">{contact.country}</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF005C] neo-border p-2 w-12 h-12 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase text-sm">Police</p>
                    <a
                      href={`tel:${contact.police}`}
                      className="text-2xl font-bold font-mono hover:text-[#FF005C]"
                    >
                      {contact.police}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#FF005C] neo-border p-2 w-12 h-12 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase text-sm">Ambulance</p>
                    <a
                      href={`tel:${contact.ambulance}`}
                      className="text-2xl font-bold font-mono hover:text-[#FF005C]"
                    >
                      {contact.ambulance}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#FF005C] neo-border p-2 w-12 h-12 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase text-sm">Fire</p>
                    <a
                      href={`tel:${contact.fire}`}
                      className="text-2xl font-bold font-mono hover:text-[#FF005C]"
                    >
                      {contact.fire}
                    </a>
                  </div>
                </div>

                {contact.touristHotline && (
                  <div className="flex items-center gap-3">
                    <div className="bg-[#00F0FF] neo-border p-2 w-12 h-12 flex items-center justify-center">
                      <Phone className="w-6 h-6" strokeWidth={3} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold uppercase text-sm">Tourist Hotline</p>
                      <a
                        href={`tel:${contact.touristHotline}`}
                        className="text-2xl font-bold font-mono hover:text-[#00F0FF]"
                      >
                        {contact.touristHotline}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#FFD700] neo-border neo-shadow p-4">
        <p className="font-mono text-sm font-bold">
          💡 TIP: Save these numbers in your phone contacts before traveling. Consider taking a screenshot for offline access.
        </p>
      </div>
    </div>
  );
};
