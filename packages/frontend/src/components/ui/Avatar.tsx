import type { HTMLAttributes } from 'react';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Fallback initials or text */
  fallback?: string;
  /** Avatar size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Status indicator */
  status?: 'online' | 'offline' | 'busy' | 'away';
}

/**
 * Avatar component for user profile images
 * - Fallback to initials when no image
 * - Status indicators
 * - Accessible alt text
 */
export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  status,
  className = '',
  ...props
}: AvatarProps): JSX.Element {
  const sizeClasses: Record<string, string> = {
    sm: 'avatar-sm',
    md: 'avatar-md',
    lg: 'avatar-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const statusColors: Record<string, string> = {
    online: 'bg-success-500',
    offline: 'bg-gray-400',
    busy: 'bg-error-500',
    away: 'bg-warning-500',
  };

  const statusSizes: Record<string, string> = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const getInitials = (text: string): string => {
    return text
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const classes = ['avatar', sizeClasses[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative inline-block">
      <div className={classes} {...props}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span aria-hidden="true">
            {fallback ? getInitials(fallback) : '?'}
          </span>
        )}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full ring-2 ring-white dark:ring-gray-800`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}
