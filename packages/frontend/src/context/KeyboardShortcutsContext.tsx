/**
 * Keyboard Shortcuts Context
 * Provides global keyboard shortcuts management with customization
 * Requirement 64: Full keyboard accessibility
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAppStore } from '../store';
import {
  DEFAULT_SHORTCUTS,
  ShortcutFeedback,
  formatShortcutKey,
} from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsContextValue {
  // Custom key bindings (shortcutId -> key)
  customBindings: Record<string, string>;
  setCustomBinding: (shortcutId: string, key: string) => void;
  resetBinding: (shortcutId: string) => void;
  resetAllBindings: () => void;
  
  // Get effective key for a shortcut
  getShortcutKey: (shortcutId: string) => string;
  getFormattedKey: (shortcutId: string) => string;
  
  // Shortcuts reference modal
  isShortcutsModalOpen: boolean;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  
  // Visual feedback
  feedback: ShortcutFeedback | null;
  
  // Enable/disable shortcuts globally
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

const STORAGE_KEY = 'ai-humanizer-keyboard-shortcuts';

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const navigate = useNavigate();
  const { settings, updateSettings, setSidebarOpen, sidebarOpen } = useAppStore();
  
  const [customBindings, setCustomBindings] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<ShortcutFeedback | null>(null);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

  // Persist custom bindings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindings));
  }, [customBindings]);

  const getShortcutKey = useCallback(
    (shortcutId: string): string => {
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === shortcutId);
      return customBindings[shortcutId] || shortcut?.defaultKey || '';
    },
    [customBindings]
  );

  const getFormattedKey = useCallback(
    (shortcutId: string): string => {
      return formatShortcutKey(getShortcutKey(shortcutId));
    },
    [getShortcutKey]
  );

  const showFeedback = useCallback((shortcutId: string, shortcutName: string) => {
    setFeedback({
      shortcutId,
      shortcutName,
      timestamp: Date.now(),
    });
    setTimeout(() => setFeedback(null), 1500);
  }, []);

  const setCustomBinding = useCallback((shortcutId: string, key: string) => {
    setCustomBindings((prev) => ({ ...prev, [shortcutId]: key }));
  }, []);

  const resetBinding = useCallback((shortcutId: string) => {
    setCustomBindings((prev) => {
      const next = { ...prev };
      delete next[shortcutId];
      return next;
    });
  }, []);

  const resetAllBindings = useCallback(() => {
    setCustomBindings({});
  }, []);

  const openShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(true);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(false);
  }, []);

  // Register global navigation shortcuts
  useHotkeys(
    getShortcutKey('go-dashboard'),
    (e) => {
      e.preventDefault();
      navigate('/');
      showFeedback('go-dashboard', 'Go to Dashboard');
    },
    { enabled: shortcutsEnabled }
  );

  useHotkeys(
    getShortcutKey('go-editor'),
    (e) => {
      e.preventDefault();
      navigate('/editor');
      showFeedback('go-editor', 'Go to Editor');
    },
    { enabled: shortcutsEnabled }
  );

  useHotkeys(
    getShortcutKey('go-history'),
    (e) => {
      e.preventDefault();
      navigate('/history');
      showFeedback('go-history', 'Go to History');
    },
    { enabled: shortcutsEnabled }
  );

  useHotkeys(
    getShortcutKey('go-settings'),
    (e) => {
      e.preventDefault();
      navigate('/settings');
      showFeedback('go-settings', 'Go to Settings');
    },
    { enabled: shortcutsEnabled }
  );

  useHotkeys(
    getShortcutKey('toggle-sidebar'),
    (e) => {
      e.preventDefault();
      setSidebarOpen(!sidebarOpen);
      showFeedback('toggle-sidebar', 'Toggle Sidebar');
    },
    { enabled: shortcutsEnabled },
    [sidebarOpen]
  );

  useHotkeys(
    getShortcutKey('toggle-dark-mode'),
    (e) => {
      e.preventDefault();
      updateSettings({ darkMode: !settings.darkMode });
      showFeedback('toggle-dark-mode', 'Toggle Dark Mode');
    },
    { enabled: shortcutsEnabled },
    [settings.darkMode]
  );

  useHotkeys(
    getShortcutKey('show-shortcuts'),
    (e) => {
      e.preventDefault();
      setIsShortcutsModalOpen((prev) => !prev);
    },
    { enabled: shortcutsEnabled }
  );

  // Close modal on Escape
  useHotkeys(
    'escape',
    () => {
      if (isShortcutsModalOpen) {
        setIsShortcutsModalOpen(false);
      }
    },
    { enabled: isShortcutsModalOpen }
  );

  const value: KeyboardShortcutsContextValue = {
    customBindings,
    setCustomBinding,
    resetBinding,
    resetAllBindings,
    getShortcutKey,
    getFormattedKey,
    isShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
    feedback,
    shortcutsEnabled,
    setShortcutsEnabled,
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}
