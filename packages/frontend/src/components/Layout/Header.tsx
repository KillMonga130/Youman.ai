import { Sun, Moon, Bell } from 'lucide-react';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui';

export function Header(): JSX.Element {
  const { settings, updateSettings } = useAppStore();

  const toggleDarkMode = (): void => {
    const newDarkMode = !settings.darkMode;
    updateSettings({ darkMode: newDarkMode });
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
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
          
          <Tooltip content="Notifications" position="bottom">
            <button
              className="btn-icon-sm btn-ghost hover:bg-primary-50 dark:hover:bg-primary-900/20 relative transition-all"
              aria-label="Notifications (1 unread)"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              <span 
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full"
                aria-hidden="true"
              />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
