import { useState, useEffect } from 'react';
import { Ghost, Bell } from 'lucide-react';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui';
import { NotificationPanel, type Notification } from '../NotificationPanel';

const WELCOME_NOTIFICATION_ID = 'welcome-notification';
const DISMISSED_NOTIFICATIONS_KEY = 'dismissed-notifications';

export function Header(): JSX.Element {
  const { user } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    const dismissedIds = dismissed ? JSON.parse(dismissed) : [];
    
    const shouldShowWelcome = user && !dismissedIds.includes(WELCOME_NOTIFICATION_ID);
    const justRegistered = sessionStorage.getItem('just-registered') === 'true';
    
    if (shouldShowWelcome && justRegistered) {
      setNotifications([
        {
          id: WELCOME_NOTIFICATION_ID,
          type: 'info',
          title: 'Welcome to the Crypt',
          message: 'Your soul has been registered. Begin your resurrection rituals.',
          timestamp: new Date(),
          read: false,
        },
      ]);
      sessionStorage.removeItem('just-registered');
    }
  }, [user]);

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
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-primary-900/30">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="lg:hidden w-10" />
          
          {/* Spooky tagline */}
          <div className="flex-1 hidden md:flex items-center gap-2 text-gray-500">
            <Ghost className="w-4 h-4 text-primary-500 animate-float-ghost" />
            <span className="text-sm italic">The spirits await your cursed text...</span>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content={`Spirits${unreadCount > 0 ? ` (${unreadCount} restless)` : ''}`} position="bottom">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn-icon-sm btn-ghost relative text-gray-400 hover:text-primary-400"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full animate-pulse"
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
