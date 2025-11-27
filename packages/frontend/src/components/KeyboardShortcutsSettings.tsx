/**
 * Keyboard Shortcuts Settings Component
 * Allows users to customize keyboard shortcuts
 * Requirement 64: Full keyboard accessibility
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';
import {
  DEFAULT_SHORTCUTS,
  formatShortcutKey,
  isValidKeyCombination,
} from '../hooks/useKeyboardShortcuts';

interface ShortcutEditorProps {
  name: string;
  description: string;
  currentKey: string;
  defaultKey: string;
  onSave: (key: string) => void;
  onReset: () => void;
  isCustomized: boolean;
}

function ShortcutEditor({
  name,
  description,
  currentKey,
  defaultKey,
  onSave,
  onReset,
  isCustomized,
}: ShortcutEditorProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [recordedKey, setRecordedKey] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Build key combination
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      if (e.metaKey) parts.push('meta');

      // Add the actual key (ignore modifier-only presses)
      const key = e.key.toLowerCase();
      if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
        parts.push(key);
      }

      if (parts.length > 0) {
        const combination = parts.join('+');
        setRecordedKey(combination);
        setError('');
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!recordedKey) {
      setError('Please press a key combination');
      return;
    }

    if (!isValidKeyCombination(recordedKey)) {
      setError('Must include a modifier key (Ctrl, Alt, Shift)');
      return;
    }

    onSave(recordedKey);
    setIsEditing(false);
    setRecordedKey('');
    setError('');
  }, [recordedKey, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setRecordedKey('');
    setError('');
  }, []);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setRecordedKey('');
    setError('');
  }, []);

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">{name}</p>
          {isCustomized && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              Custom
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {isEditing ? (
          <>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={recordedKey ? formatShortcutKey(recordedKey) : ''}
                onKeyDown={handleKeyDown}
                placeholder="Press keys..."
                readOnly
                className="w-40 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={`Recording new shortcut for ${name}`}
              />
              {error && (
                <div className="absolute top-full left-0 mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              aria-label="Save shortcut"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <kbd className="shortcut-key">{formatShortcutKey(currentKey)}</kbd>
            <button
              onClick={handleStartEdit}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={`Edit shortcut for ${name}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {isCustomized && (
              <button
                onClick={onReset}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={`Reset ${name} to default`}
                title={`Reset to ${formatShortcutKey(defaultKey)}`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function KeyboardShortcutsSettings(): JSX.Element {
  const {
    customBindings,
    setCustomBinding,
    resetBinding,
    resetAllBindings,
    shortcutsEnabled,
    setShortcutsEnabled,
  } = useKeyboardShortcuts();

  const editorShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'editor');
  const navigationShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'navigation');
  const generalShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'general');

  const hasCustomBindings = Object.keys(customBindings).length > 0;

  const renderCategory = (
    title: string,
    shortcuts: typeof DEFAULT_SHORTCUTS
  ): JSX.Element => (
    <div className="mb-6 last:mb-0">
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <ShortcutEditor
            key={shortcut.id}
            name={shortcut.name}
            description={shortcut.description}
            currentKey={customBindings[shortcut.id] || shortcut.defaultKey}
            defaultKey={shortcut.defaultKey}
            onSave={(key) => setCustomBinding(shortcut.id, key)}
            onReset={() => resetBinding(shortcut.id)}
            isCustomized={!!customBindings[shortcut.id]}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Keyboard Shortcuts</h2>
          <div className="flex items-center gap-3">
            {hasCustomBindings && (
              <button
                onClick={resetAllBindings}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Enable/Disable toggle */}
        <label className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium">Enable Keyboard Shortcuts</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Turn off to disable all keyboard shortcuts
            </p>
          </div>
          <button
            onClick={() => setShortcutsEnabled(!shortcutsEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              shortcutsEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            role="switch"
            aria-checked={shortcutsEnabled}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                shortcutsEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {shortcutsEnabled && (
          <>
            {renderCategory('Editor', editorShortcuts)}
            {renderCategory('Navigation', navigationShortcuts)}
            {renderCategory('General', generalShortcuts)}

            {/* Help text */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>How to customize:</strong> Click the edit button next to any shortcut,
                then press your desired key combination. Shortcuts must include at least one
                modifier key (Ctrl, Alt, or Shift).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
