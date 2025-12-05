import React from 'react';

interface SpellCircleProps {
  progress?: number; // 0-100
  className?: string;
}

export const SpellCircle: React.FC<SpellCircleProps> = ({ 
  progress = 0,
  className = '' 
}) => {
  return (
    <div className={`relative w-32 h-32 ${className}`}>
      {/* Outer rotating circle */}
      <div className="absolute inset-0 spell-circle">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="text-primary-500/50"
          />
          {/* Pentagram points */}
          <circle cx="50" cy="5" r="3" fill="currentColor" className="text-primary-500" />
          <circle cx="90" cy="35" r="3" fill="currentColor" className="text-primary-500" />
          <circle cx="75" cy="85" r="3" fill="currentColor" className="text-primary-500" />
          <circle cx="25" cy="85" r="3" fill="currentColor" className="text-primary-500" />
          <circle cx="10" cy="35" r="3" fill="currentColor" className="text-primary-500" />
        </svg>
      </div>

      {/* Inner progress circle */}
      <div className="absolute inset-4">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-800"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${progress * 2.83} 283`}
            className="text-primary-500 transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Center glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-primary-500 rounded-full animate-pulse opacity-50 blur-md" />
      </div>
    </div>
  );
};
