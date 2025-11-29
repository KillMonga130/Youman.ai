import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages';
import { ThemeProvider, Spinner } from './components/ui';
import { useAppStore } from './store';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { useCurrentUser } from './api/hooks';

// Lazy load modals
const KeyboardShortcutsModal = lazy(() =>
  import('./components/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal }))
);
const ShortcutFeedback = lazy(() =>
  import('./components/ShortcutFeedback').then(m => ({ default: m.ShortcutFeedback }))
);

// Lazy load pages
const Dashboard = lazy(() => import('./pages').then(m => ({ default: m.Dashboard })));
const Editor = lazy(() => import('./pages').then(m => ({ default: m.Editor })));
const Comparison = lazy(() => import('./pages').then(m => ({ default: m.Comparison })));
const Settings = lazy(() => import('./pages').then(m => ({ default: m.Settings })));
const History = lazy(() => import('./pages').then(m => ({ default: m.History })));
const Analytics = lazy(() => import('./pages').then(m => ({ default: m.Analytics })));
const Search = lazy(() => import('./pages').then(m => ({ default: m.Search })));
const Advanced = lazy(() => import('./pages').then(m => ({ default: m.Advanced })));
const Templates = lazy(() => import('./pages').then(m => ({ default: m.Templates })));
const ABTesting = lazy(() => import('./pages').then(m => ({ default: m.ABTesting })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function LoadingScreen(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  const user = useAppStore(state => state.user);
  const setUser = useAppStore(state => state.setUser);
  const { data, isLoading, error, isError } = useCurrentUser();

  // Update user in store when API returns user data
  useEffect(() => {
    if (data?.user && !user) {
      setUser(data.user);
    }
  }, [data?.user, user, setUser]);

  // Show loading while fetching
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If we have a user (from store or API), allow access
  if (user || data?.user) {
    return <>{children}</>;
  }

  // Only redirect if there's an error or no user after loading completes
  if (isError || error || (!isLoading && !user && !data?.user)) {
    return <Navigate to="/login" replace />;
  }

  return <LoadingScreen />;
}

function AppContent(): JSX.Element {
  const darkMode = useAppStore(state => state.settings.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <KeyboardShortcutsProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <a href="#main-content" className="skip-link">
                  Skip to main content
                </a>
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/editor" element={<Editor />} />
                    <Route path="/editor/:id" element={<Editor />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/ab-testing" element={<ABTesting />} />
                    <Route path="/comparison" element={<Comparison />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/advanced" element={<Advanced />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/cloud-callback" element={<Settings />} />
                  </Routes>
                </Suspense>
              </Layout>
              <Suspense fallback={null}>
                <KeyboardShortcutsModal />
                <ShortcutFeedback />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </KeyboardShortcutsProvider>
  );
}

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AccessibilityProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppContent />
          </BrowserRouter>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
