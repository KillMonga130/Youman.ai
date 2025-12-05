import React from 'react';
import { Ghost, Skull, Sparkles } from 'lucide-react';

interface GhostDetectorProps {
  score: number; // 0-100, where 100 is fully AI detected
  className?: string;
}

export const GhostDetector: React.FC<GhostDetectorProps> = ({ 
  score, 
  className = '' 
}) => {
  const getScoreColor = (score: number): string => {
    if (score <= 30) return 'text-accent-500';
    if (score <= 70) return 'text-warning-500';
    return 'text-error-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score <= 30) return 'Fully Human';
    if (score <= 70) return 'Partially Possessed';
    return 'Soulless AI';
  };

  const getIcon = (score: number) => {
    if (score <= 30) return <Sparkles className="w-16 h-16" />;
    if (score <= 70) return <Ghost className="w-16 h-16" />;
    return <Skull className="w-16 h-16" />;
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`ghost-detector ${className}`}>
      {/* Circular progress */}
      <svg 
        className="transform -rotate-90 w-full h-full" 
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-800"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${getScoreColor(score)} transition-all duration-500 ease-out`}
          strokeLinecap="round"
        />
      </svg>

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${getScoreColor(score)} transition-colors duration-500`}>
          {getIcon(score)}
        </div>
      </div>

      {/* Score label */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <p className={`text-3xl font-bold ${getScoreColor(score)}`}>
          {Math.round(score)}%
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {getScoreLabel(score)}
        </p>
      </div>
    </div>
  );
};
