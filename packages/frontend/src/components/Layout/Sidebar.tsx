import { Home, FileText, Settings, LogOut, Menu, X, BarChart2, Clock, Search, Sparkles, LayoutTemplate, FlaskConical } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/editor', icon: FileText, label: 'Editor' },
  { path: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { path: '/ab-testing', icon: FlaskConical, label: 'A/B Testing' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/history', icon: Clock, label: 'History' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/advanced', icon: Sparkles, label: 'Advanced' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, user, setUser } = useAppStore();

  const handleLogout = (): void => {
    setUser(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 glass-card border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/50 group-hover:shadow-xl group-hover:shadow-primary-500/60 group-hover:scale-105 transition-all">
                <span className="text-white font-bold text-base">AH</span>
              </div>
              <div>
                <span className="font-bold text-xl text-gradient">AI Humanizer</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Premium Edition</p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-modern">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${
                    isActive ? 'sidebar-nav-item-active' : ''
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}

          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {user ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/30">
                    <span className="text-white font-bold text-sm">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-500 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-all flex-shrink-0 hover:scale-110"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn btn-primary w-full text-center block"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-3 glass-card rounded-xl shadow-lg hover:shadow-xl transition-all lg:hidden"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
    </>
  );
}
