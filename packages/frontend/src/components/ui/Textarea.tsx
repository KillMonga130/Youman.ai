import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text */
  label?: string;
  /** Helper text below textarea */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Full width textarea */
  fullWidth?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Show character count */
  showCount?: boolean;
  /** Maximum character count */
  maxLength?: number;
}

/**
 * Textarea component with WCAG AAA compliance
 * - Proper label association
 * - Character count for screen readers
 * - Error state announcements
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      fullWidth = true,
      required,
      showCount,
      maxLength,
      value,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;
    const countId = `${textareaId}-count`;

    const currentLength = typeof value === 'string' ? value.length : 0;

    const textareaClasses = [
      'textarea',
      error ? 'input-error' : '',
      success ? 'input-success' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const describedBy = [
      error ? errorId : helperText ? helperId : null,
      showCount ? countId : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={textareaId}
            className={`label ${required ? 'label-required' : ''}`}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          required={required}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        <div className="flex justify-between items-center mt-1.5">
          <div>
            {error && (
              <p id={errorId} className="error-text mt-0" role="alert">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperId} className="helper-text mt-0">
                {helperText}
              </p>
            )}
          </div>
          {showCount && maxLength && (
            <p
              id={countId}
              className={`text-sm ${
                currentLength >= maxLength
                  ? 'text-error-600 dark:text-error-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
