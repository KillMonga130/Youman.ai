import { Eye, Type, Palette, Zap, Volume2, RotateCcw } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import type { ColorBlindnessMode } from '../store';

const colorBlindnessModes: { value: ColorBlindnessMode; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Standard color vision' },
  { value: 'deuteranopia', label: 'Deuteranopia', description: 'Red-green (most common)' },
  { value: 'protanopia', label: 'Protanopia', description: 'Red-green color blindness' },
  { value: 'tritanopia', label: 'Tritanopia', description: 'Blue-yellow color blindness' },
];

const fontSizeOptions = [
  { value: 100, label: '100%', description: 'Default size' },
  { value: 125, label: '125%', description: 'Slightly larger' },
  { value: 150, label: '150%', description: 'Large' },
  { value: 175, label: '175%', description: 'Very large' },
  { value: 200, label: '200%', description: 'Maximum size' },
];

/**
 * Accessibility settings panel for WCAG AAA compliance
 * Implements Requirements 65 and 112
 */
export function AccessibilitySettings(): JSX.Element {
  const {
    settings,
    setHighContrast,
    setFontSize,
    setColorBlindnessMode,
    setReduceMotion,
    setScreenReaderOptimized,
    resetAccessibility,
    announceToScreenReader,
  } = useAccessibility();

  const handleHighContrastChange = (enabled: boolean): void => {
    setHighContrast(enabled);
    announceToScreenReader(
      `High contrast mode ${enabled ? 'enabled' : 'disabled'}`,
      'polite'
    );
  };

  const handleFontSizeChange = (size: number): void => {
    setFontSize(size);
    announceToScreenReader(`Font size set to ${size}%`, 'polite');
  };

  const handleColorBlindnessChange = (mode: ColorBlindnessMode): void => {
    setColorBlindnessMode(mode);
    const modeLabel = colorBlindnessModes.find((m) => m.value === mode)?.label || mode;
    announceToScreenReader(`Color blindness mode set to ${modeLabel}`, 'polite');
  };

  const handleReduceMotionChange = (enabled: boolean): void => {
    setReduceMotion(enabled);
    announceToScreenReader(
      `Reduced motion ${enabled ? 'enabled' : 'disabled'}`,
      'polite'
    );
  };

  const handleScreenReaderChange = (enabled: boolean): void => {
    setScreenReaderOptimized(enabled);
    announceToScreenReader(
      `Screen reader optimization ${enabled ? 'enabled' : 'disabled'}`,
      'polite'
    );
  };

  const handleReset = (): void => {
    resetAccessibility();
    announceToScreenReader('Accessibility settings reset to defaults', 'polite');
  };

  return (
    <div role="region" aria-labelledby="accessibility-heading">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 id="accessibility-heading" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
            <Eye className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          Accessibility
        </h2>
        <button
          onClick={handleReset}
          className="btn btn-outline btn-sm flex items-center gap-2"
          aria-label="Reset accessibility settings to defaults"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Reset
        </button>
      </div>
      <div className="p-6 space-y-6">
        {/* High Contrast Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 mt-0.5 text-gray-500" aria-hidden="true" />
            <div>
              <label htmlFor="high-contrast-toggle" className="font-medium cursor-pointer">
                High Contrast Mode
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Increase contrast ratios to meet WCAG AAA standards
              </p>
            </div>
          </div>
          <button
            id="high-contrast-toggle"
            role="switch"
            aria-checked={settings.highContrast}
            onClick={() => handleHighContrastChange(!settings.highContrast)}
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              settings.highContrast ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.highContrast ? 'translate-x-7' : 'translate-x-1'
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">
              {settings.highContrast ? 'Disable' : 'Enable'} high contrast mode
            </span>
          </button>
        </div>

        {/* Font Size Adjustment */}
        <div>
          <div className="flex items-start gap-3 mb-3">
            <Type className="w-5 h-5 mt-0.5 text-gray-500" aria-hidden="true" />
            <div>
              <span className="font-medium">Font Size</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adjust text size up to 200% without breaking layouts
              </p>
            </div>
          </div>
          <div
            className="flex flex-wrap gap-2 ml-8"
            role="radiogroup"
            aria-label="Font size selection"
          >
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={settings.fontSize === option.value}
                onClick={() => handleFontSizeChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  settings.fontSize === option.value
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Blindness Mode */}
        <div>
          <div className="flex items-start gap-3 mb-3">
            <Palette className="w-5 h-5 mt-0.5 text-gray-500" aria-hidden="true" />
            <div>
              <label htmlFor="color-blindness-select" className="font-medium">
                Color Blindness Mode
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adjust color scheme for different types of color vision
              </p>
            </div>
          </div>
          <select
            id="color-blindness-select"
            value={settings.colorBlindnessMode}
            onChange={(e) => handleColorBlindnessChange(e.target.value as ColorBlindnessMode)}
            className="select ml-8 max-w-xs"
            aria-describedby="color-blindness-description"
          >
            {colorBlindnessModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label} - {mode.description}
              </option>
            ))}
          </select>
          <p id="color-blindness-description" className="sr-only">
            Select a color blindness mode to adjust the interface colors for better visibility
          </p>
        </div>

        {/* Reduce Motion */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 mt-0.5 text-gray-500" aria-hidden="true" />
            <div>
              <label htmlFor="reduce-motion-toggle" className="font-medium cursor-pointer">
                Reduce Motion
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Minimize animations and transitions
              </p>
            </div>
          </div>
          <button
            id="reduce-motion-toggle"
            role="switch"
            aria-checked={settings.reduceMotion}
            onClick={() => handleReduceMotionChange(!settings.reduceMotion)}
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              settings.reduceMotion ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.reduceMotion ? 'translate-x-7' : 'translate-x-1'
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">
              {settings.reduceMotion ? 'Disable' : 'Enable'} reduced motion
            </span>
          </button>
        </div>

        {/* Screen Reader Optimization */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 mt-0.5 text-gray-500" aria-hidden="true" />
            <div>
              <label htmlFor="screen-reader-toggle" className="font-medium cursor-pointer">
                Screen Reader Optimization
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enhanced ARIA labels and navigation for screen readers
              </p>
            </div>
          </div>
          <button
            id="screen-reader-toggle"
            role="switch"
            aria-checked={settings.screenReaderOptimized}
            onClick={() => handleScreenReaderChange(!settings.screenReaderOptimized)}
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              settings.screenReaderOptimized ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.screenReaderOptimized ? 'translate-x-7' : 'translate-x-1'
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">
              {settings.screenReaderOptimized ? 'Disable' : 'Enable'} screen reader optimization
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
