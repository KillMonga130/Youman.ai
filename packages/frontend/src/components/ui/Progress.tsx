import type { HTMLAttributes } from 'react';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Progress bar variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Progress bar size */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
  /** Animated striped effect */
  animated?: boolean;
}

/**
 * Progress bar component
 * - Accessible progress announcements
 * - Multiple variants and sizes
 */
export function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  className = '',
  ...props
}: ProgressProps): JSX.Element {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses: Record<string, string> = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantColorClasses: Record<string, string> = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    error: 'bg-error-600',
  };

  const barClasses = [
    'h-full rounded-full transition-all duration-300',
    variantColorClasses[variant],
    animated ? 'animate-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || 'Progress'}
          </span>
          {showLabel && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`progress ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <div
          className={barClasses}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
