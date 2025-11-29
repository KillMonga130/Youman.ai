import { useState, useEffect } from 'react';
import { Sun, Moon, Bell, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui';
import { NotificationPanel, type Notification } from '../NotificationPanel';

const WELCOME_NOTIFICATION_ID = 'welcome-notification';
const DISMISSED_NOTIFICATIONS_KEY = 'dismissed-notifications';

export function Header(): JSX.Element {
  const { settings, updateSettings, user } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initialize theme classes on mount
  useEffect(() => {
    document.documentElement.classList.toggle('cyberpunk-theme', settings.cyberpunkTheme);
    document.documentElement.classList.toggle('professional-theme', !settings.cyberpunkTheme);
  }, [settings.cyberpunkTheme]);

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    const dismissedIds = dismissed ? JSON.parse(dismissed) : [];
    
    // Only show welcome notification if:
    // 1. User is logged in
    // 2. Welcome notification hasn't been dismissed
    // 3. User was just registered (check if this is first load after registration)
    const shouldShowWelcome = user && !dismissedIds.includes(WELCOME_NOTIFICATION_ID);
    
    // Check if user was just registered (stored in sessionStorage during registration)
    const justRegistered = sessionStorage.getItem('just-registered') === 'true';
    
    if (shouldShowWelcome && justRegistered) {
      setNotifications([
        {
          id: WELCOME_NOTIFICATION_ID,
          type: 'info',
          title: 'Welcome!',
          message: 'Your account has been successfully created.',
          timestamp: new Date(),
          read: false,
        },
      ]);
      // Clear the flag so it doesn't show again
      sessionStorage.removeItem('just-registered');
    }
  }, [user]);

  const toggleDarkMode = (): void => {
    const newDarkMode = !settings.darkMode;
    updateSettings({ darkMode: newDarkMode });
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const toggleCyberpunkTheme = (): void => {
    const newCyberpunk = !settings.cyberpunkTheme;
    updateSettings({ cyberpunkTheme: newCyberpunk });
    document.documentElement.classList.toggle('cyberpunk-theme', newCyberpunk);
    document.documentElement.classList.toggle('professional-theme', !newCyberpunk);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string): void => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = (): void => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: string): void => {
    // Save dismissed notification ID to localStorage
    const dismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    const dismissedIds = dismissed ? JSON.parse(dismissed) : [];
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissedIds));
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      <header 
        className="sticky top-0 z-30 glass-card backdrop-blur-xl"
        style={settings.cyberpunkTheme 
          ? { borderBottom: '1px solid rgba(0, 255, 255, 0.3)' }
          : { borderBottom: '2px solid var(--professional-primary)' }
        }
      >
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          <div className="lg:hidden w-10" />
          
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Tooltip content={settings.cyberpunkTheme ? 'Switch to Professional Theme' : 'Switch to Cyberpunk Theme'} position="bottom">
              <button
                onClick={toggleCyberpunkTheme}
                className={`btn-icon-sm btn-ghost transition-all ${
                  settings.cyberpunkTheme 
                    ? 'hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300' 
                    : 'hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-black border-2 border-black dark:border-white rounded-none'
                }`}
                aria-label={settings.cyberpunkTheme ? 'Switch to professional theme' : 'Switch to cyberpunk theme'}
                aria-pressed={settings.cyberpunkTheme}
              >
                <Sparkles className={`w-5 h-5 ${settings.cyberpunkTheme ? 'glow' : ''}`} aria-hidden="true" />
              </button>
            </Tooltip>

            <Tooltip content={settings.darkMode ? 'Light mode' : 'Dark mode'} position="bottom">
              <button
                onClick={toggleDarkMode}
                className={`btn-icon-sm btn-ghost transition-all ${
                  settings.cyberpunkTheme 
                    ? 'hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={settings.darkMode}
              >
                {settings.darkMode ? (
                  <Sun className={`w-5 h-5 ${settings.cyberpunkTheme ? 'text-amber-400 glow' : 'text-amber-500'}`} aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
            
            <Tooltip content={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`} position="bottom">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`btn-icon-sm btn-ghost relative transition-all ${
                  settings.cyberpunkTheme 
                    ? 'hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full glow"
                    aria-hidden="true"
                  />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </header>
      
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={handleDelete}
      />
    </>
  );
}
