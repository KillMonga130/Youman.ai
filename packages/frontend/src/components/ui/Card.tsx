import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Enable hover effect */
  hover?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card component for content containers
 * - Consistent styling across light/dark modes
 * - Optional hover effects
 */
export function Card({
  hover = false,
  padding = 'none',
  children,
  className = '',
  ...props
}: CardProps): JSX.Element {
  const paddingClasses: Record<string, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const classes = [
    hover ? 'card-hover' : 'card',
    paddingClasses[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Header title */
  title?: string;
  /** Header subtitle */
  subtitle?: string;
  /** Action element (button, etc.) */
  action?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  children,
  className = '',
  ...props
}: CardHeaderProps): JSX.Element {
  return (
    <div className={`card-header ${className}`} {...props}>
      {(title || subtitle) ? (
        <div className="flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function CardBody({
  children,
  className = '',
  ...props
}: CardBodyProps): JSX.Element {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function CardFooter({
  children,
  className = '',
  ...props
}: CardFooterProps): JSX.Element {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  );
}
