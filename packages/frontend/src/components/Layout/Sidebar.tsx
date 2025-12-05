import { Skull, Ghost, Settings, LogOut, Menu, X, BarChart2, Clock, Search, Zap, BookOpen, FlaskConical, Shield, Brain, type LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '../../store';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useIsAdmin } from '../../api/hooks';

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  adminOnly?: boolean;
}

// Halloween themed navigation - The Necromancer's Quill
const allNavItems: NavItem[] = [
  { path: '/', icon: Skull, label: 'Resurrection Chamber' },
  { path: '/editor', icon: Ghost, label: 'Ritual Editor' },
  { path: '/templates', icon: BookOpen, label: 'Spell Book' },
  { path: '/ab-testing', icon: FlaskConical, label: 'Potion Lab' },
  { path: '/search', icon: Search, label: 'Séance' },
  { path: '/history', icon: Clock, label: 'Graveyard' },
  { path: '/analytics', icon: BarChart2, label: 'Dark Arts Stats' },
  { path: '/advanced', icon: Zap, label: 'Forbidden Magic' },
  { path: '/models', icon: Brain, label: 'Soul Vessels' },
  { path: '/admin', icon: Shield, label: 'Crypt Keeper', adminOnly: true },
  { path: '/settings', icon: Settings, label: 'Ritual Chamber' },
];

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, user, setUser, settings } = useAppStore();
  const queryClient = useQueryClient();
  const { data: isAdmin = false } = useIsAdmin();
  const [logoError, setLogoError] = useState(false);

  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  const handleLogout = async (): Promise<void> => {
    try {
      await apiClient.logout();
      setUser(null);
      queryClient.clear();
      navigate('/login', { replace: true });
    } catch (error) {
      setUser(null);
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-950/95 backdrop-blur-md border-r border-primary-900/30 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Spooky header with glowing effect */}
          <div className="flex items-center justify-between p-6 border-b border-primary-900/30">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                {!logoError ? (
                  <img 
                    src="/images/logo-1.png" 
                    alt="The Necromancer's Quill" 
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Skull className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg text-primary-400 leading-tight">Necromancer's</span>
                <span className="text-xs text-gray-500">Quill</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-primary-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-900/40 text-primary-400 border border-primary-500/30 shadow-lg shadow-primary-500/10' 
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-primary-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-primary-900/30">
            {user ? (
              <div className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
                    <span className="font-semibold text-white text-sm">
                      {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-200 truncate">
                      {user?.name ?? user?.email ?? 'Necromancer'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email ?? 'Soul bound'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-error-400 hover:bg-error-900/20 rounded-lg transition-colors"
                  title="Release Soul"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-lg shadow-primary-500/20">
                Enter the Crypt
              </Link>
            )}
          </div>
        </div>
      </aside>

      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-3 bg-gray-900/90 backdrop-blur-sm border border-primary-900/30 rounded-lg shadow-lg shadow-primary-500/10 lg:hidden"
      >
        <Menu className="w-5 h-5 text-primary-400" />
      </button>
    </>
  );
}
