import React from 'react';
import { SpellCircle } from './SpellCircle';

interface LoadingRitualProps {
  message?: string;
  progress?: number;
}

export const LoadingRitual: React.FC<LoadingRitualProps> = ({ 
  message = 'Summoning spirits...',
  progress = 0
}) => {
  const messages = [
    'Summoning spirits...',
    'Channeling energy...',
    'Breathing life...',
    'Weaving magic...',
    'Casting spell...',
  ];

  const displayMessage = message || messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-12">
      <SpellCircle progress={progress} className="w-32 h-32" />
      <div className="text-center">
        <p className="text-primary-400 text-lg animate-pulse">
          {displayMessage}
        </p>
        {progress > 0 && (
          <p className="text-gray-500 text-sm mt-2">
            {Math.round(progress)}% complete
          </p>
        )}
      </div>
    </div>
  );
};
