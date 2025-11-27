import type { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge visual variant */
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'teal' | 'gray';
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon to display before text */
  icon?: ReactNode;
  /** Make badge rounded pill */
  pill?: boolean;
  /** Dot indicator only */
  dot?: boolean;
}

/**
 * Badge component for status indicators and labels
 * - High contrast colors for accessibility
 * - Multiple variants for different states
 */
export function Badge({
  variant = 'gray',
  size = 'md',
  icon,
  pill = true,
  dot = false,
  children,
  className = '',
  ...props
}: BadgeProps): JSX.Element {
  const variantClasses: Record<string, string> = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    teal: 'badge-teal',
    gray: 'badge-gray',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  const dotColors: Record<string, string> = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    teal: 'bg-teal-500',
    gray: 'bg-gray-500',
  };

  if (dot) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        {...props}
      >
        <span
          className={`w-2 h-2 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
        {children}
      </span>
    );
  }

  const classes = [
    'badge',
    variantClasses[variant],
    sizeClasses[size],
    pill ? 'rounded-full' : 'rounded',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span className="mr-1" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
