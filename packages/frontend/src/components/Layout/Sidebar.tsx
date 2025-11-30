import { Home, FileText, Settings, LogOut, Menu, X, BarChart2, Clock, Search, Sparkles, LayoutTemplate, FlaskConical, Shield, Brain, type LucideIcon } from 'lucide-react';
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

const allNavItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/editor', icon: FileText, label: 'Editor' },
  { path: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { path: '/ab-testing', icon: FlaskConical, label: 'A/B Testing' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/history', icon: Clock, label: 'History' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/advanced', icon: Sparkles, label: 'Advanced' },
  { path: '/models', icon: Brain, label: 'Model Management' },
  { path: '/admin', icon: Shield, label: 'Admin Panel', adminOnly: true },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, user, setUser, settings } = useAppStore();
  const queryClient = useQueryClient();
  const { data: isAdmin = false } = useIsAdmin();
  const [logoError, setLogoError] = useState(false);
  const isCyberpunk = settings.cyberpunkTheme;

  // Filter nav items based on admin status
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

  // Precomputed styles
  const sidebarBorderRight = isCyberpunk
    ? '1px solid rgba(0, 255, 255, 0.3)'
    : '2px solid var(--professional-primary)';
  const headerBorderBottom = isCyberpunk
    ? '1px solid rgba(0, 255, 255, 0.3)'
    : '2px solid var(--professional-primary)';
  const userSectionBorderTop = isCyberpunk
    ? '1px solid rgba(0, 255, 255, 0.3)'
    : '2px solid var(--professional-primary)';

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 glass-card border-r transform transition-all duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderRight: sidebarBorderRight }}
      >
        <div className="flex flex-col h-full">
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderBottom: headerBorderBottom }}
          >
            <Link to="/" className="flex items-center gap-3 group">
              <div 
                className={`w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-all overflow-hidden ${
                  isCyberpunk 
                    ? 'glow-cyan rounded-xl' 
                    : 'rounded-none border-2'
                }`}
                style={isCyberpunk 
                  ? { background: 'linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%)' }
                  : { backgroundColor: 'var(--professional-primary)', borderColor: 'var(--professional-primary)' }
                }
              >
                {!logoError ? (
                  <img 
                    src="/images/logo-1.png" 
                    alt="Youman.ai Logo" 
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span 
                    className={`font-bold text-base ${
                      isCyberpunk 
                        ? 'font-mono' 
                        : 'font-serif'
                    }`}
                    style={isCyberpunk 
                      ? { color: 'var(--cyberpunk-base)' }
                      : { color: 'var(--professional-secondary)' }
                    }
                  >Y</span>
                )}
              </div>
              <div>
                <span className={`font-bold text-xl text-gradient ${
                  isCyberpunk 
                    ? 'font-sans text-glow' 
                    : 'font-serif tracking-wide'
                }`}>Youman.ai</span>
                <p className={`text-xs font-medium ${
                  isCyberpunk 
                    ? 'font-mono text-cyan-400/70' 
                    : 'font-sans tracking-widest uppercase text-gray-600 dark:text-gray-400'
                }`}>
                  {isCyberpunk ? 'CYBERPUNK EDITION' : 'PROFESSIONAL EDITION'}
                </p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

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

          <div 
            className="p-4 border-t"
            style={{ borderTop: userSectionBorderTop }}
          >
            {user ? (
              <div 
                className={`flex items-center justify-between p-4 backdrop-blur-sm border-2 ${
                  isCyberpunk 
                    ? 'rounded-xl' 
                    : 'rounded-none'
                }`}
                style={isCyberpunk 
                  ? { 
                      backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                      borderColor: 'rgba(0, 255, 255, 0.3)' 
                    }
                  : { 
                      backgroundColor: 'var(--professional-secondary)', 
                      borderColor: 'var(--professional-primary)' 
                    }
                }
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className={`w-11 h-11 flex items-center justify-center flex-shrink-0 ${
                      isCyberpunk 
                        ? 'glow-cyan rounded-full' 
                        : 'rounded-none border-2'
                    }`}
                    style={isCyberpunk 
                      ? { background: 'linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%)' }
                      : { backgroundColor: 'var(--professional-primary)', borderColor: 'var(--professional-primary)' }
                    }
                  >
                    <span 
                      className={`font-bold text-sm ${
                        isCyberpunk 
                          ? 'font-mono' 
                          : 'font-serif'
                      }`}
                      style={isCyberpunk 
                        ? { color: 'var(--cyberpunk-base)' }
                        : { color: 'var(--professional-secondary)' }
                      }
                    >{(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-sm truncate ${
                      isCyberpunk 
                        ? 'text-cyan-100' 
                        : 'text-black dark:text-white font-sans'
                    }`}>{user?.name ?? user?.email ?? 'User'}</p>
                    <p className={`text-xs truncate font-medium ${
                      isCyberpunk 
                        ? 'text-cyan-400/70 font-mono' 
                        : 'text-gray-600 dark:text-gray-400 font-sans tracking-wide'
                    }`}>
                      {user?.email ?? ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className={`p-2.5 hover:text-error-400 hover:bg-error-900/20 rounded-lg transition-all flex-shrink-0 hover:scale-110 ${
                    isCyberpunk 
                      ? 'text-cyan-400/70 hover:glow' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-error-50 dark:hover:bg-error-900/20'
                  }`}
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

      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-3 glass-card rounded-xl shadow-lg hover:shadow-xl transition-all lg:hidden"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
    </>
  );
}
