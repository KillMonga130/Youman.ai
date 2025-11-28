import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main 
          id="main-content" 
          className="p-4 lg:p-8 max-w-7xl mx-auto"
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
