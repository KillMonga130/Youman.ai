import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock zustand persist middleware
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

describe('App', () => {
  it('renders the dashboard page heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders the sidebar navigation', () => {
    render(<App />);
    expect(screen.getByText('AI Humanizer')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays welcome message on dashboard', () => {
    render(<App />);
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });
});
