import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilitySettings } from './AccessibilitySettings';
import { AccessibilityProvider } from '../context/AccessibilityContext';

// Mock the store
const mockUpdateSettings = vi.fn();
const mockSettings = {
  defaultLevel: 3,
  defaultStrategy: 'auto' as const,
  defaultLanguage: 'en',
  darkMode: false,
  autoSave: true,
  accessibility: {
    highContrast: false,
    fontSize: 100,
    colorBlindnessMode: 'none' as const,
    reduceMotion: false,
    screenReaderOptimized: false,
  },
};

vi.mock('../store', () => ({
  useAppStore: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
  }),
}));

describe('AccessibilitySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = () => {
    return render(
      <AccessibilityProvider>
        <AccessibilitySettings />
      </AccessibilityProvider>
    );
  };

  it('renders accessibility settings section', () => {
    renderWithProvider();
    
    expect(screen.getByRole('region', { name: /accessibility/i })).toBeInTheDocument();
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
  });

  it('renders high contrast toggle', () => {
    renderWithProvider();
    
    expect(screen.getByText('High Contrast Mode')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /high contrast/i })).toBeInTheDocument();
  });

  it('renders font size options', () => {
    renderWithProvider();
    
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /font size/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /100%/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /125%/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /150%/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /175%/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /200%/i })).toBeInTheDocument();
  });

  it('renders color blindness mode selector', () => {
    renderWithProvider();
    
    expect(screen.getByText('Color Blindness Mode')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /color blindness/i })).toBeInTheDocument();
  });

  it('renders reduce motion toggle', () => {
    renderWithProvider();
    
    expect(screen.getByText('Reduce Motion')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /reduce motion/i })).toBeInTheDocument();
  });

  it('renders screen reader optimization toggle', () => {
    renderWithProvider();
    
    expect(screen.getByText('Screen Reader Optimization')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /screen reader/i })).toBeInTheDocument();
  });

  it('renders reset button', () => {
    renderWithProvider();
    
    expect(screen.getByRole('button', { name: /reset accessibility/i })).toBeInTheDocument();
  });

  it('toggles high contrast mode when clicked', () => {
    renderWithProvider();
    
    const toggle = screen.getByRole('switch', { name: /high contrast/i });
    fireEvent.click(toggle);
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      accessibility: expect.objectContaining({
        highContrast: true,
      }),
    });
  });

  it('changes font size when option is selected', () => {
    renderWithProvider();
    
    const fontSizeOption = screen.getByRole('radio', { name: /150%/i });
    fireEvent.click(fontSizeOption);
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      accessibility: expect.objectContaining({
        fontSize: 150,
      }),
    });
  });

  it('changes color blindness mode when selected', () => {
    renderWithProvider();
    
    const select = screen.getByRole('combobox', { name: /color blindness/i });
    fireEvent.change(select, { target: { value: 'deuteranopia' } });
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      accessibility: expect.objectContaining({
        colorBlindnessMode: 'deuteranopia',
      }),
    });
  });

  it('toggles reduce motion when clicked', () => {
    renderWithProvider();
    
    const toggle = screen.getByRole('switch', { name: /reduce motion/i });
    fireEvent.click(toggle);
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      accessibility: expect.objectContaining({
        reduceMotion: true,
      }),
    });
  });

  it('toggles screen reader optimization when clicked', () => {
    renderWithProvider();
    
    const toggle = screen.getByRole('switch', { name: /screen reader/i });
    fireEvent.click(toggle);
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      accessibility: expect.objectContaining({
        screenReaderOptimized: true,
      }),
    });
  });

  it('has proper ARIA labels for accessibility', () => {
    renderWithProvider();
    
    // Check that all interactive elements have proper labels
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color blindness/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reduce motion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/screen reader/i)).toBeInTheDocument();
  });

  it('provides screen reader announcements via live regions', () => {
    renderWithProvider();
    
    // Check that live regions exist
    const politeRegion = document.getElementById('sr-live-polite');
    const assertiveRegion = document.getElementById('sr-live-assertive');
    
    expect(politeRegion).toBeInTheDocument();
    expect(assertiveRegion).toBeInTheDocument();
    expect(politeRegion).toHaveAttribute('aria-live', 'polite');
    expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
  });
});
