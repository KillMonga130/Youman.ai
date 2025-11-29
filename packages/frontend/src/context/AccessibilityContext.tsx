import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAppStore, type AccessibilitySettings, type ColorBlindnessMode } from '../store';

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  setHighContrast: (enabled: boolean) => void;
  setFontSize: (size: number) => void;
  setColorBlindnessMode: (mode: ColorBlindnessMode) => void;
  setReduceMotion: (enabled: boolean) => void;
  setScreenReaderOptimized: (enabled: boolean) => void;
  resetAccessibility: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const defaultAccessibilitySettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: 100,
  colorBlindnessMode: 'none',
  reduceMotion: false,
  screenReaderOptimized: false,
};

// CSS filter values for color blindness simulation (used via data attributes in CSS)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _colorBlindnessFilters: Record<ColorBlindnessMode, string> = {
  none: 'none',
  // Deuteranopia (red-green, most common)
  deuteranopia: 'url(#deuteranopia-filter)',
  // Protanopia (red-green)
  protanopia: 'url(#protanopia-filter)',
  // Tritanopia (blue-yellow)
  tritanopia: 'url(#tritanopia-filter)',
};

export interface AccessibilityProviderProps {
  children: ReactNode;
}

/**
 * Accessibility provider for WCAG AAA compliance
 * - High contrast mode
 * - Font size adjustment (up to 200%)
 * - Color blindness modes (deuteranopia, protanopia, tritanopia)
 * - Reduced motion support
 * - Screen reader optimization
 */
export function AccessibilityProvider({
  children,
}: AccessibilityProviderProps): JSX.Element {
  const { settings, updateSettings } = useAppStore();
  const accessibilitySettings = settings.accessibility;

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast mode
    if (accessibilitySettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size (CSS custom property)
    const fontScale = accessibilitySettings.fontSize / 100;
    root.style.setProperty('--accessibility-font-scale', String(fontScale));

    // Color blindness mode
    if (accessibilitySettings.colorBlindnessMode !== 'none') {
      root.setAttribute('data-color-blindness', accessibilitySettings.colorBlindnessMode);
    } else {
      root.removeAttribute('data-color-blindness');
    }

    // Reduced motion
    if (accessibilitySettings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Screen reader optimized
    if (accessibilitySettings.screenReaderOptimized) {
      root.classList.add('sr-optimized');
    } else {
      root.classList.remove('sr-optimized');
    }
  }, [accessibilitySettings]);

  // Respect system preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent): void => {
      if (e.matches && !accessibilitySettings.reduceMotion) {
        updateSettings({
          accessibility: { ...accessibilitySettings, reduceMotion: true },
        });
      }
    };

    // Set initial value from system preference
    if (mediaQuery.matches && !accessibilitySettings.reduceMotion) {
      updateSettings({
        accessibility: { ...accessibilitySettings, reduceMotion: true },
      });
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setHighContrast = useCallback(
    (enabled: boolean) => {
      updateSettings({
        accessibility: { highContrast: enabled },
      });
    },
    [updateSettings]
  );

  const setFontSize = useCallback(
    (size: number) => {
      // Clamp between 100% and 200%
      const clampedSize = Math.min(200, Math.max(100, size));
      updateSettings({
        accessibility: { fontSize: clampedSize },
      });
    },
    [updateSettings]
  );

  const setColorBlindnessMode = useCallback(
    (mode: ColorBlindnessMode) => {
      updateSettings({
        accessibility: { colorBlindnessMode: mode },
      });
    },
    [updateSettings]
  );

  const setReduceMotion = useCallback(
    (enabled: boolean) => {
      updateSettings({
        accessibility: { reduceMotion: enabled },
      });
    },
    [updateSettings]
  );

  const setScreenReaderOptimized = useCallback(
    (enabled: boolean) => {
      updateSettings({
        accessibility: { screenReaderOptimized: enabled },
      });
    },
    [updateSettings]
  );

  const resetAccessibility = useCallback(() => {
    updateSettings({ accessibility: defaultAccessibilitySettings });
  }, [updateSettings]);

  // Announce messages to screen readers via live region
  const announceToScreenReader = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const liveRegion = document.getElementById(`sr-live-${priority}`);
      if (liveRegion) {
        liveRegion.textContent = '';
        // Small delay to ensure screen readers pick up the change
        setTimeout(() => {
          liveRegion.textContent = message;
        }, 100);
      }
    },
    []
  );

  return (
    <AccessibilityContext.Provider
      value={{
        settings: accessibilitySettings,
        setHighContrast,
        setFontSize,
        setColorBlindnessMode,
        setReduceMotion,
        setScreenReaderOptimized,
        resetAccessibility,
        announceToScreenReader,
      }}
    >
      {/* SVG filters for color blindness simulation */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          {/* Deuteranopia filter (red-green color blindness) */}
          <filter id="deuteranopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0
                      0.7 0.3 0 0 0
                      0 0.3 0.7 0 0
                      0 0 0 1 0"
            />
          </filter>
          {/* Protanopia filter (red-green color blindness) */}
          <filter id="protanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0
                      0.558 0.442 0 0 0
                      0 0.242 0.758 0 0
                      0 0 0 1 0"
            />
          </filter>
          {/* Tritanopia filter (blue-yellow color blindness) */}
          <filter id="tritanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.95 0.05 0 0 0
                      0 0.433 0.567 0 0
                      0 0.475 0.525 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Live regions for screen reader announcements */}
      <div
        id="sr-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="sr-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />

      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook to access accessibility context
 */
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
