import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  onOpenTutorials?: () => void;
}

export function Layout({ children, onOpenTutorials }: LayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar onOpenTutorials={onOpenTutorials} />
      <div className="lg:pl-64">
        <Header onOpenTutorials={onOpenTutorials} />
        <main 
          id="main-content" 
          className="p-4 lg:p-6"
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
