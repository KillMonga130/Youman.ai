/**
 * Shortcut Feedback Component
 * Displays visual feedback when keyboard shortcuts are triggered
 * Requirement 64: Full keyboard accessibility
 */

import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';
import { Keyboard } from 'lucide-react';

export function ShortcutFeedback(): JSX.Element | null {
  const { feedback } = useKeyboardShortcuts();

  if (!feedback) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-shortcut-feedback"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg">
        <Keyboard className="w-5 h-5" />
        <span className="font-medium">{feedback.shortcutName}</span>
      </div>
    </div>
  );
}
