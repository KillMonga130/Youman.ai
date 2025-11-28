import { Sun, Moon, Bell, HelpCircle } from 'lucide-react';
import { useAppStore } from '../../store';
import { Tooltip } from '../ui';

interface HeaderProps {
  onOpenTutorials?: () => void;
}

export function Header({ onOpenTutorials }: HeaderProps): JSX.Element {
  const { settings, updateSettings } = useAppStore();

  const toggleDarkMode = (): void => {
    const newDarkMode = !settings.darkMode;
    updateSettings({ darkMode: newDarkMode });
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
        
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Help/Tutorials button */}
          {onOpenTutorials && (
            <Tooltip content="Help & Tutorials">
              <button
                onClick={onOpenTutorials}
                className="btn-icon-sm btn-ghost"
                aria-label="Open help and tutorials"
                data-tour="help-button"
              >
                <HelpCircle className="w-5 h-5" aria-hidden="true" />
              </button>
            </Tooltip>
          )}

          <Tooltip content={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <button
              onClick={toggleDarkMode}
              className="btn-icon-sm btn-ghost"
              aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={settings.darkMode}
            >
              {settings.darkMode ? (
                <Sun className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Moon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </Tooltip>
          
          <Tooltip content="Notifications">
            <button
              className="btn-icon-sm btn-ghost relative"
              aria-label="Notifications (1 unread)"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              <span 
                className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full"
                aria-hidden="true"
              />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
