import type { HTMLAttributes, ReactNode } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** Alert visual variant */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Alert title */
  title?: string;
  /** Custom icon */
  icon?: ReactNode;
  /** Show close button */
  dismissible?: boolean;
  /** Close button callback */
  onDismiss?: () => void;
}

/**
 * Alert component for notifications and messages
 * - Proper ARIA roles for screen readers
 * - High contrast colors for accessibility
 */
export function Alert({
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  children,
  className = '',
  ...props
}: AlertProps): JSX.Element {
  const variantClasses: Record<string, string> = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
  };

  const defaultIcons: Record<string, ReactNode> = {
    info: <Info className="w-5 h-5 flex-shrink-0" />,
    success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 flex-shrink-0" />,
  };

  const iconColors: Record<string, string> = {
    info: 'text-primary-600 dark:text-primary-400',
    success: 'text-success-600 dark:text-success-400',
    warning: 'text-warning-600 dark:text-warning-400',
    error: 'text-error-600 dark:text-error-400',
  };

  const classes = ['alert', variantClasses[variant], className]
    .filter(Boolean)
    .join(' ');

  const role = variant === 'error' ? 'alert' : 'status';
  const ariaLive = variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      className={classes}
      role={role}
      aria-live={ariaLive}
      {...props}
    >
      <span className={iconColors[variant]} aria-hidden="true">
        {icon || defaultIcons[variant]}
      </span>
      <div className="flex-1">
        {title && (
          <h4 className="font-semibold mb-1">{title}</h4>
        )}
        <div className="text-sm">{children}</div>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
