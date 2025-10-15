import React from 'react';
import { Plane } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-neuro-bg sticky top-0 z-50 py-6 mb-6">
      <div className="container mx-auto px-4">
        <div className="neuro-element-lg p-6">
          <div className="flex items-center gap-4">
            <div className="neuro-element p-4 bg-gradient-to-br from-neuro-accent to-neuro-accentLight">
              <Plane className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neuro-text tracking-tight">
                TravelMate
              </h1>
              <p className="text-sm text-neuro-textLight mt-1">
                AI-Powered Travel Companion
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
