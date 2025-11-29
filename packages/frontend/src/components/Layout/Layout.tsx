import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ParticleBackground } from '../ParticleBackground';
import { useAppStore } from '../../store';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  const { settings } = useAppStore();
  const isCyberpunk = settings.cyberpunkTheme;

  return (
    <div className={`min-h-screen relative overflow-hidden ${
      isCyberpunk 
        ? 'bg-black' 
        : 'bg-white dark:bg-black'
    }`}>
      {isCyberpunk && <ParticleBackground />}
      <Sidebar />
      <div className="lg:pl-64 relative z-10">
        <Header />
        <main 
          id="main-content" 
          className={`p-4 lg:p-8 max-w-7xl mx-auto relative z-10 ${
            !isCyberpunk ? 'professional-theme' : ''
          }`}
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
