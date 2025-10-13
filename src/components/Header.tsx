import React from 'react';
import { Plane } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-[#FF005C] neo-border-thick border-b-0 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#00F0FF] neo-border p-2">
            <Plane className="w-8 h-8" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">TravelMate</h1>
            <p className="text-xs text-white uppercase">AI-Powered Travel Guide</p>
          </div>
        </div>
      </div>
    </header>
  );
};
