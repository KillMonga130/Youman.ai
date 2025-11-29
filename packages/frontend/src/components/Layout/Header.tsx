import { useState, useEffect } from 'react';
import { Sun, Moon, Bell } from 'lucide-react';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui';
import { NotificationPanel, type Notification } from '../NotificationPanel';

const WELCOME_NOTIFICATION_ID = 'welcome-notification';
const DISMISSED_NOTIFICATIONS_KEY = 'dismissed-notifications';

export function Header(): JSX.Element {
  const { settings, updateSettings, user } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
      <header className="sticky top-0 z-30 glass-card border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          <div className="lg:hidden w-10" />
          
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Tooltip content={settings.darkMode ? 'Light mode' : 'Dark mode'} position="bottom">
              <button
                onClick={toggleDarkMode}
                className="btn-icon-sm btn-ghost hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={settings.darkMode}
              >
                {settings.darkMode ? (
                  <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
            
            <Tooltip content={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`} position="bottom">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn-icon-sm btn-ghost hover:bg-primary-50 dark:hover:bg-primary-900/20 relative transition-all"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full"
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
