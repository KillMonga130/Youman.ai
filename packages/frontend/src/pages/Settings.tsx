import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { useAppStore, UserSettings } from '../store';
import { KeyboardShortcutsSettings } from '../components/KeyboardShortcutsSettings';
import { AccessibilitySettings } from '../components/AccessibilitySettings';

const defaultSettings: UserSettings = {
  defaultLevel: 3,
  defaultStrategy: 'auto',
  defaultLanguage: 'en',
  darkMode: false,
  autoSave: true,
  accessibility: {
    highContrast: false,
    fontSize: 100,
    colorBlindnessMode: 'none',
    reduceMotion: false,
    screenReaderOptimized: false,
  },
};

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
];

const strategies = [
  { value: 'auto', label: 'Auto-detect', description: 'Automatically detect the best strategy based on content' },
  { value: 'casual', label: 'Casual', description: 'Conversational tone with contractions and colloquialisms' },
  { value: 'professional', label: 'Professional', description: 'Formal tone suitable for business content' },
  { value: 'academic', label: 'Academic', description: 'Scholarly language with hedging and citations' },
];

export function Settings(): JSX.Element {
  const { settings, updateSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = (): void => {
    updateSettings(localSettings);
    
    // Apply dark mode
    document.documentElement.classList.toggle('dark', localSettings.darkMode);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = (): void => {
    setLocalSettings(defaultSettings);
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure your default preferences for humanization
        </p>
      </div>

      {/* Transformation defaults */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Transformation Defaults</h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Default level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Default Humanization Level
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                value={localSettings.defaultLevel}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, defaultLevel: Number(e.target.value) })
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="w-8 text-center font-medium">{localSettings.defaultLevel}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Level 1 = minimal changes, Level 5 = aggressive transformation
            </p>
          </div>

          {/* Default strategy */}
          <div>
            <label className="block text-sm font-medium mb-2">Default Strategy</label>
            <div className="space-y-2">
              {strategies.map((strategy) => (
                <label
                  key={strategy.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    localSettings.defaultStrategy === strategy.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.value}
                    checked={localSettings.defaultStrategy === strategy.value}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        defaultStrategy: e.target.value as UserSettings['defaultStrategy'],
                      })
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{strategy.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {strategy.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Default language */}
          <div>
            <label className="block text-sm font-medium mb-2">Default Language</label>
            <select
              value={localSettings.defaultLanguage}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, defaultLanguage: e.target.value })
              }
              className="input"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Appearance</h2>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use dark theme for the interface
              </p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({ ...localSettings, darkMode: !localSettings.darkMode })
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Editor preferences */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Editor Preferences</h2>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-save</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically save drafts every 2 minutes
              </p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({ ...localSettings, autoSave: !localSettings.autoSave })
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.autoSave ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.autoSave ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsSettings />

      {/* Accessibility */}
      <AccessibilitySettings />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handleReset} className="btn btn-outline flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-green-600 dark:text-green-400 text-sm">Settings saved!</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
