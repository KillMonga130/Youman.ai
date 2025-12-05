import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  Dashboard, 
  Editor, 
  Comparison, 
  Settings, 
  History, 
  Analytics, 
  Search, 
  Login,
  Advanced,
  Templates,
  ABTesting,
  Admin,
  ModelManagement,
  HalloweenLanding
} from './pages';
import { Layout } from './components/Layout/Layout';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import { SearchProvider } from './context/SearchContext';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  // The Necromancer's Quill - ALWAYS dark, no light mode exists in the crypt
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AccessibilityProvider>
          <KeyboardShortcutsProvider>
            <SearchProvider>
              <Routes>
                <Route path="/" element={<HalloweenLanding />} />
                <Route path="/login" element={<Login />} />
                  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                  <Route path="/editor" element={<Layout><Editor /></Layout>} />
                  <Route path="/editor/:id" element={<Layout><Editor /></Layout>} />
                  <Route path="/comparison" element={<Layout><Comparison /></Layout>} />
                  <Route path="/comparison/:id" element={<Layout><Comparison /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />
                  <Route path="/history" element={<Layout><History /></Layout>} />
                  <Route path="/history/:id" element={<Layout><History /></Layout>} />
                  <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                  <Route path="/search" element={<Layout><Search /></Layout>} />
                  <Route path="/advanced" element={<Layout><Advanced /></Layout>} />
                  <Route path="/templates" element={<Layout><Templates /></Layout>} />
                  <Route path="/ab-testing" element={<Layout><ABTesting /></Layout>} />
                  <Route path="/admin" element={<Layout><Admin /></Layout>} />
                  <Route path="/models" element={<Layout><ModelManagement /></Layout>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </SearchProvider>
          </KeyboardShortcutsProvider>
        </AccessibilityProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
