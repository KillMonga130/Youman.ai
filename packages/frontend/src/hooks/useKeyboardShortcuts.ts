/**
 * Keyboard Shortcuts Hook
 * Provides customizable keyboard shortcuts with visual feedback
 * Requirement 64: Full keyboard accessibility
 */

import { useCallback, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  customKey?: string;
  category: 'editor' | 'navigation' | 'general';
  action: () => void;
}

export interface ShortcutFeedback {
  shortcutId: string;
  shortcutName: string;
  timestamp: number;
}

// Default keyboard shortcuts configuration
export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
  // Editor shortcuts
  {
    id: 'humanize',
    name: 'Humanize Text',
    description: 'Start humanization process',
    defaultKey: 'ctrl+enter',
    category: 'editor',
  },
  {
    id: 'copy-output',
    name: 'Copy Output',
    description: 'Copy humanized text to clipboard',
    defaultKey: 'ctrl+shift+c',
    category: 'editor',
  },
  {
    id: 'download',
    name: 'Download',
    description: 'Download humanized text',
    defaultKey: 'ctrl+shift+d',
    category: 'editor',
  },
  {
    id: 'reset',
    name: 'Reset Editor',
    description: 'Clear all text from editor',
    defaultKey: 'ctrl+shift+r',
    category: 'editor',
  },
  {
    id: 'upload',
    name: 'Upload File',
    description: 'Open file upload dialog',
    defaultKey: 'ctrl+o',
    category: 'editor',
  },
  {
    id: 'save',
    name: 'Save Project',
    description: 'Save current project',
    defaultKey: 'ctrl+s',
    category: 'editor',
  },
  // Navigation shortcuts
  {
    id: 'go-dashboard',
    name: 'Go to Dashboard',
    description: 'Navigate to dashboard',
    defaultKey: 'alt+1',
    category: 'navigation',
  },
  {
    id: 'go-editor',
    name: 'Go to Editor',
    description: 'Navigate to editor',
    defaultKey: 'alt+2',
    category: 'navigation',
  },
  {
    id: 'go-history',
    name: 'Go to History',
    description: 'Navigate to history',
    defaultKey: 'alt+3',
    category: 'navigation',
  },
  {
    id: 'go-settings',
    name: 'Go to Settings',
    description: 'Navigate to settings',
    defaultKey: 'alt+4',
    category: 'navigation',
  },
  // General shortcuts
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide sidebar',
    defaultKey: 'ctrl+b',
    category: 'general',
  },
  {
    id: 'toggle-dark-mode',
    name: 'Toggle Dark Mode',
    description: 'Switch between light and dark theme',
    defaultKey: 'ctrl+shift+l',
    category: 'general',
  },
  {
    id: 'show-shortcuts',
    name: 'Show Shortcuts',
    description: 'Display keyboard shortcuts reference',
    defaultKey: 'ctrl+/',
    category: 'general',
  },
  {
    id: 'focus-search',
    name: 'Focus Search',
    description: 'Focus on search input',
    defaultKey: 'ctrl+k',
    category: 'general',
  },
];

/**
 * Format a key combination for display
 */
export function formatShortcutKey(key: string): string {
  return key
    .split('+')
    .map((part) => {
      switch (part.toLowerCase()) {
        case 'ctrl':
          return 'Ctrl';
        case 'alt':
          return 'Alt';
        case 'shift':
          return 'Shift';
        case 'enter':
          return 'Enter';
        case 'escape':
          return 'Esc';
        case 'backspace':
          return 'Backspace';
        case 'delete':
          return 'Del';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return part.toUpperCase();
      }
    })
    .join(' + ');
}

/**
 * Parse a display key back to hotkey format
 */
export function parseDisplayKey(displayKey: string): string {
  return displayKey
    .split(' + ')
    .map((part) => {
      switch (part) {
        case 'Ctrl':
          return 'ctrl';
        case 'Alt':
          return 'alt';
        case 'Shift':
          return 'shift';
        case 'Enter':
          return 'enter';
        case 'Esc':
          return 'escape';
        case 'Backspace':
          return 'backspace';
        case 'Del':
          return 'delete';
        case '↑':
          return 'arrowup';
        case '↓':
          return 'arrowdown';
        case '←':
          return 'arrowleft';
        case '→':
          return 'arrowright';
        default:
          return part.toLowerCase();
      }
    })
    .join('+');
}

/**
 * Validate a key combination
 */
export function isValidKeyCombination(key: string): boolean {
  const parts = key.toLowerCase().split('+');
  const modifiers = ['ctrl', 'alt', 'shift', 'meta'];
  const hasModifier = parts.some((p) => modifiers.includes(p));
  const hasKey = parts.some((p) => !modifiers.includes(p));
  return hasModifier && hasKey && parts.length >= 2;
}

/**
 * Hook for visual feedback when shortcuts are triggered
 */
export function useShortcutFeedback(): {
  feedback: ShortcutFeedback | null;
  showFeedback: (shortcutId: string, shortcutName: string) => void;
} {
  const [feedback, setFeedback] = useState<ShortcutFeedback | null>(null);

  const showFeedback = useCallback((shortcutId: string, shortcutName: string) => {
    setFeedback({
      shortcutId,
      shortcutName,
      timestamp: Date.now(),
    });

    // Clear feedback after animation
    setTimeout(() => {
      setFeedback(null);
    }, 1500);
  }, []);

  return { feedback, showFeedback };
}

/**
 * Hook to register a single keyboard shortcut
 */
export function useKeyboardShortcut(
  shortcutId: string,
  action: () => void,
  customBindings: Record<string, string> = {},
  enabled: boolean = true
): void {
  const shortcutConfig = DEFAULT_SHORTCUTS.find((s) => s.id === shortcutId);
  const key = customBindings[shortcutId] || shortcutConfig?.defaultKey || '';

  useHotkeys(
    key,
    (event) => {
      event.preventDefault();
      action();
    },
    {
      enabled: enabled && !!key,
      enableOnFormTags: shortcutId === 'humanize' || shortcutId === 'save',
    }
  );
}

/**
 * Hook to get the current key binding for a shortcut
 */
export function useShortcutKey(
  shortcutId: string,
  customBindings: Record<string, string> = {}
): string {
  const shortcutConfig = DEFAULT_SHORTCUTS.find((s) => s.id === shortcutId);
  return customBindings[shortcutId] || shortcutConfig?.defaultKey || '';
}
