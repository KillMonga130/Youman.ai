import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard, Editor, Comparison, Settings, History, Analytics, Search } from './pages';
import { ThemeProvider } from './components/ui';
import { useAppStore } from './store';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ShortcutFeedback } from './components/ShortcutFeedback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent(): JSX.Element {
  const { settings } = useAppStore();

  // Apply dark mode on mount and sync with store
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  return (
    <KeyboardShortcutsProvider>
      <Layout>
        {/* Skip link for keyboard navigation - WCAG AAA */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      {/* Keyboard shortcuts modal and feedback */}
      <KeyboardShortcutsModal />
      <ShortcutFeedback />
    </KeyboardShortcutsProvider>
  );
}

function AppRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AccessibilityProvider>
          <AppRouter />
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
