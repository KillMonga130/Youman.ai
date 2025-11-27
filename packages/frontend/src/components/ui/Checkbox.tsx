import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label text */
  label?: string;
  /** Helper text below checkbox */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Indeterminate state */
  indeterminate?: boolean;
}

/**
 * Checkbox component with WCAG AAA compliance
 * - Proper label association
 * - Visible focus indicators
 * - Minimum touch target size
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      error,
      indeterminate,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = `${checkboxId}-helper`;
    const errorId = `${checkboxId}-error`;

    return (
      <div className="flex flex-col">
        <label
          htmlFor={checkboxId}
          className="inline-flex items-center gap-3 cursor-pointer min-h-touch"
        >
          <div className="relative flex items-center justify-center">
            <input
              ref={(el) => {
                if (typeof ref === 'function') {
                  ref(el);
                } else if (ref) {
                  ref.current = el;
                }
                if (el) {
                  el.indeterminate = indeterminate || false;
                }
              }}
              type="checkbox"
              id={checkboxId}
              className={`checkbox peer ${error ? 'border-error-500' : ''} ${className}`}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : helperText ? helperId : undefined}
              {...props}
            />
            <Check
              className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
              strokeWidth={3}
              aria-hidden="true"
            />
          </div>
          {label && (
            <span className="text-base text-gray-700 dark:text-gray-300 select-none">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p id={errorId} className="error-text ml-8" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="helper-text ml-8">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
