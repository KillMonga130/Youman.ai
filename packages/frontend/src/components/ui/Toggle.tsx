import { forwardRef, type InputHTMLAttributes } from 'react';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Toggle size */
  size?: 'sm' | 'md' | 'lg';
  /** Label position */
  labelPosition?: 'left' | 'right';
}

/**
 * Toggle switch component
 * - Accessible keyboard navigation
 * - Proper ARIA attributes
 * - Minimum touch target size
 */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      label,
      helperText,
      size = 'md',
      labelPosition = 'right',
      id,
      checked,
      className = '',
      ...props
    },
    ref
  ) => {
    const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: {
        track: 'h-5 w-9',
        thumb: 'h-3 w-3',
        translate: 'translate-x-4',
      },
      md: {
        track: 'h-6 w-11',
        thumb: 'h-4 w-4',
        translate: 'translate-x-5',
      },
      lg: {
        track: 'h-7 w-14',
        thumb: 'h-5 w-5',
        translate: 'translate-x-7',
      },
    } as const;

    const { track, thumb, translate } = sizeClasses[size];

    const labelElement = label && (
      <div className="flex flex-col">
        <span className="text-base text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {helperText && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </span>
        )}
      </div>
    );

    return (
      <label
        htmlFor={toggleId}
        className={`inline-flex items-center gap-3 cursor-pointer min-h-touch ${className}`}
      >
        {labelPosition === 'left' && labelElement}
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={toggleId}
            checked={checked}
            className="sr-only peer"
            role="switch"
            aria-checked={checked}
            {...props}
          />
          <div
            className={`${track} rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 transition-colors`}
          />
          <div
            className={`absolute top-1 left-1 ${thumb} bg-white rounded-full shadow transition-transform peer-checked:${translate}`}
            style={{
              transform: checked ? `translateX(${size === 'sm' ? '16px' : size === 'md' ? '20px' : '28px'})` : 'translateX(0)',
            }}
          />
        </div>
        {labelPosition === 'right' && labelElement}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';
