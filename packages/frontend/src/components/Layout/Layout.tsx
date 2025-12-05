import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GhostParticles } from '../Halloween';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Halloween fog/mist background */}
      <div className="fixed inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent pointer-events-none" />
      
      {/* Floating ghost particles */}
      <GhostParticles count={8} />
      
      <Sidebar />
      <div className="lg:pl-64 relative z-10">
        <Header />
        <main 
          id="main-content" 
          className="p-4 lg:p-8 max-w-7xl mx-auto relative z-10"
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
