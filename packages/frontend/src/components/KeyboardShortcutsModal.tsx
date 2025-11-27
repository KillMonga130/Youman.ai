/**
 * Keyboard Shortcuts Reference Modal
 * Displays all available shortcuts organized by category
 * Requirement 64: Full keyboard accessibility
 */

import { X, Keyboard, Navigation, Edit3, Settings } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';
import { DEFAULT_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface ShortcutCategoryProps {
  title: string;
  icon: React.ReactNode;
  shortcuts: typeof DEFAULT_SHORTCUTS;
  getFormattedKey: (id: string) => string;
}

function ShortcutCategory({
  title,
  icon,
  shortcuts,
  getFormattedKey,
}: ShortcutCategoryProps): JSX.Element {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{shortcut.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{shortcut.description}</p>
            </div>
            <kbd className="shortcut-key">{getFormattedKey(shortcut.id)}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsModal(): JSX.Element | null {
  const { isShortcutsModalOpen, closeShortcutsModal, getFormattedKey } = useKeyboardShortcuts();

  if (!isShortcutsModalOpen) {
    return null;
  }

  const editorShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'editor');
  const navigationShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'navigation');
  const generalShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === 'general');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={closeShortcutsModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Keyboard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2
                id="shortcuts-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Press <kbd className="shortcut-key-sm">Ctrl + /</kbd> to toggle this guide
              </p>
            </div>
          </div>
          <button
            onClick={closeShortcutsModal}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close shortcuts modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <ShortcutCategory
            title="Editor"
            icon={<Edit3 className="w-4 h-4 text-blue-500" />}
            shortcuts={editorShortcuts}
            getFormattedKey={getFormattedKey}
          />

          <ShortcutCategory
            title="Navigation"
            icon={<Navigation className="w-4 h-4 text-green-500" />}
            shortcuts={navigationShortcuts}
            getFormattedKey={getFormattedKey}
          />

          <ShortcutCategory
            title="General"
            icon={<Settings className="w-4 h-4 text-amber-500" />}
            shortcuts={generalShortcuts}
            getFormattedKey={getFormattedKey}
          />

          {/* Tip */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> You can customize keyboard shortcuts in{' '}
              <a
                href="/settings"
                className="underline hover:no-underline"
                onClick={closeShortcutsModal}
              >
                Settings → Keyboard Shortcuts
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shortcut Key Badge Component
 * Displays a keyboard shortcut in a styled badge
 */
export function ShortcutKeyBadge({
  shortcutId,
  className = '',
}: {
  shortcutId: string;
  className?: string;
}): JSX.Element {
  const { getFormattedKey } = useKeyboardShortcuts();
  return <kbd className={`shortcut-key-sm ${className}`}>{getFormattedKey(shortcutId)}</kbd>;
}

/**
 * Inline shortcut hint for tooltips and buttons
 */
export function ShortcutHint({ shortcutId }: { shortcutId: string }): JSX.Element {
  const { getFormattedKey } = useKeyboardShortcuts();
  return (
    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
      {getFormattedKey(shortcutId)}
    </span>
  );
}
