import React, { useMemo } from 'react';

interface GhostParticlesProps {
  count?: number;
  className?: string;
}

/**
 * Lightweight ghost particles using CSS-only animations.
 * Reduced count and simplified for better performance.
 */
export const GhostParticles: React.FC<GhostParticlesProps> = ({ 
  count = 6, // Reduced default for performance
  className = '' 
}) => {
  // Pre-compute particle positions to avoid re-renders
  const particles = useMemo(() => {
    return Array.from({ length: Math.min(count, 10) }, (_, i) => ({
      id: i,
      left: `${15 + (i * 70 / count)}%`,
      top: `${10 + (i * 15) % 80}%`,
      delay: `${i * 0.5}s`,
      duration: `${4 + (i % 3)}s`,
      opacity: 0.15 + (i % 3) * 0.1,
    }));
  }, [count]);

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 bg-primary-500/20 rounded-full animate-float-ghost"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};
