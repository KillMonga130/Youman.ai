import React, { useEffect, useRef, useState } from 'react';
import { X, Lightbulb, HelpCircle } from 'lucide-react';
import { useOnboarding, CONTEXTUAL_TOOLTIPS } from '../context/OnboardingContext';

interface ContextualTooltipProps {
  tooltipId: string;
  targetRef?: React.RefObject<HTMLElement>;
  children?: React.ReactNode;
}

export function ContextualTooltip({ tooltipId, targetRef, children }: ContextualTooltipProps): JSX.Element | null {
  const { showTooltip, dismissTooltip, progress } = useOnboarding();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const tooltip = CONTEXTUAL_TOOLTIPS[tooltipId];
  const isActive = showTooltip === tooltipId && !progress.dismissedTooltips.includes(tooltipId);

  useEffect(() => {
    if (isActive && targetRef?.current && tooltipRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const placement = tooltip?.placement || 'bottom';

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 12;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + 12;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 12;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 12;
          break;
      }

      // Keep tooltip within viewport
      const padding = 16;
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));

      setPosition({ top, left });
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isActive, targetRef, tooltip?.placement]);

  if (!tooltip || !isActive) {
    return children ? <>{children}</> : null;
  }

  return (
    <>
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-fade-in"
          style={{ top: position.top, left: position.left }}
          role="tooltip"
          aria-live="polite"
        >
          {/* Arrow indicator */}
          <div
            className={`absolute w-3 h-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform rotate-45 ${
              tooltip.placement === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-b border-r' :
              tooltip.placement === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2 border-t border-l' :
              tooltip.placement === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2 border-t border-r' :
              'left-[-6px] top-1/2 -translate-y-1/2 border-b border-l'
            }`}
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {tooltip.title}
              </h4>
            </div>
            <button
              onClick={() => dismissTooltip(tooltipId)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss tooltip"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {tooltip.content}
          </p>

          {/* Actions */}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => dismissTooltip(tooltipId)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Inline help icon with tooltip
interface HelpTooltipProps {
  tooltipId: string;
  className?: string;
}

export function HelpTooltip({ tooltipId, className = '' }: HelpTooltipProps): JSX.Element {
  const { showContextualTooltip, dismissTooltip, showTooltip, progress } = useOnboarding();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const tooltip = CONTEXTUAL_TOOLTIPS[tooltipId];
  const isDismissed = progress.dismissedTooltips.includes(tooltipId);

  const handleClick = () => {
    if (isOpen) {
      dismissTooltip(tooltipId);
      setIsOpen(false);
    } else {
      showContextualTooltip(tooltipId);
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (showTooltip !== tooltipId) {
      setIsOpen(false);
    }
  }, [showTooltip, tooltipId]);

  if (!tooltip) return <></>;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`p-1 rounded-full transition-colors ${
          isOpen 
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        aria-label={`Help: ${tooltip.title}`}
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && !isDismissed && (
        <div
          className={`absolute z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 ${
            tooltip.placement === 'top' ? 'bottom-full mb-2' :
            tooltip.placement === 'bottom' ? 'top-full mt-2' :
            tooltip.placement === 'left' ? 'right-full mr-2' :
            'left-full ml-2'
          }`}
          role="tooltip"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              {tooltip.title}
            </h4>
            <button
              onClick={() => {
                dismissTooltip(tooltipId);
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {tooltip.content}
          </p>
        </div>
      )}
    </div>
  );
}
