import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingProvider, useOnboarding, TUTORIALS } from '../context/OnboardingContext';
import { TutorialCenter, OnboardingProgressIndicator } from './TutorialCenter';
import { WelcomeModal } from './WelcomeModal';
import { StruggleDetector, FEATURE_HELP } from './StruggleDetector';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component to access onboarding context
function TestConsumer({ onContext }: { onContext: (ctx: ReturnType<typeof useOnboarding>) => void }): JSX.Element {
  const context = useOnboarding();
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return <div data-testid="test-consumer">Test</div>;
}

describe('OnboardingContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('provides default progress state', () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    expect(capturedContext).not.toBeNull();
    expect(capturedContext!.progress.completedSteps).toEqual([]);
    expect(capturedContext!.progress.completedTutorials).toEqual([]);
  });

  it('starts a tutorial correctly', async () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    // Start a tutorial
    capturedContext!.startTutorial('getting-started');

    await waitFor(() => {
      expect(capturedContext!.currentTutorial?.id).toBe('getting-started');
      expect(capturedContext!.isOnboardingActive).toBe(true);
    });
  });

  it('completes a step and persists to localStorage', async () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    // Complete a step
    capturedContext!.completeStep('welcome');

    await waitFor(() => {
      expect(capturedContext!.progress.completedSteps).toContain('welcome');
    });

    // Check localStorage
    const saved = JSON.parse(localStorageMock.getItem('onboarding-progress') || '{}');
    expect(saved.completedSteps).toContain('welcome');
  });

  it('records struggle metrics correctly', async () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    // Record multiple struggles
    capturedContext!.recordStruggle('humanization');
    capturedContext!.recordStruggle('humanization');
    capturedContext!.recordStruggle('humanization', true); // with error

    await waitFor(() => {
      const metrics = capturedContext!.struggleMetrics.get('humanization');
      expect(metrics).toBeDefined();
      expect(metrics!.attempts).toBe(3);
      expect(metrics!.errors).toBe(1);
    });
  });

  it('detects struggling users after threshold', async () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    // Record enough struggles to trigger detection
    for (let i = 0; i < 4; i++) {
      capturedContext!.recordStruggle('file-upload');
    }

    await waitFor(() => {
      expect(capturedContext!.progress.strugglingFeatures).toContain('file-upload');
    });
  });

  it('resets progress correctly', async () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    // Complete some steps
    capturedContext!.completeStep('welcome');
    capturedContext!.completeTutorial('getting-started');

    await waitFor(() => {
      expect(capturedContext!.progress.completedSteps.length).toBeGreaterThan(0);
    });

    // Reset
    capturedContext!.resetProgress();

    await waitFor(() => {
      expect(capturedContext!.progress.completedSteps).toEqual([]);
      expect(capturedContext!.progress.completedTutorials).toEqual([]);
    });
  });

  it('recommends tutorials based on progress', async () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
      </OnboardingProvider>
    );

    // Should recommend first tutorial for new users
    const recommended = capturedContext!.getRecommendedTutorial();
    expect(recommended).not.toBeNull();
    expect(recommended!.id).toBe('getting-started');
  });
});

describe('TutorialCenter', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders tutorial list when open', () => {
    render(
      <OnboardingProvider>
        <TutorialCenter isOpen={true} onClose={() => {}} />
      </OnboardingProvider>
    );

    expect(screen.getByText('Tutorial Center')).toBeInTheDocument();
    // Use getAllByText since the tutorial may appear in both recommended and list sections
    expect(screen.getAllByText('Getting Started with AI Humanizer').length).toBeGreaterThan(0);
  });

  it('does not render when closed', () => {
    render(
      <OnboardingProvider>
        <TutorialCenter isOpen={false} onClose={() => {}} />
      </OnboardingProvider>
    );

    expect(screen.queryByText('Tutorial Center')).not.toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(
      <OnboardingProvider>
        <TutorialCenter isOpen={true} onClose={() => {}} />
      </OnboardingProvider>
    );

    expect(screen.getByText(/of \d+ completed/)).toBeInTheDocument();
  });

  it('filters tutorials by category', () => {
    render(
      <OnboardingProvider>
        <TutorialCenter isOpen={true} onClose={() => {}} />
      </OnboardingProvider>
    );

    // Click on Advanced category
    fireEvent.click(screen.getByText('Advanced'));

    // Should show advanced tutorial
    expect(screen.getByText('Advanced Features')).toBeInTheDocument();
  });
});

describe('WelcomeModal', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders welcome content when open', () => {
    render(
      <OnboardingProvider>
        <WelcomeModal isOpen={true} onClose={() => {}} />
      </OnboardingProvider>
    );

    expect(screen.getByText(/Welcome to AI Humanizer/)).toBeInTheDocument();
  });

  it('navigates through steps', () => {
    render(
      <OnboardingProvider>
        <WelcomeModal isOpen={true} onClose={() => {}} />
      </OnboardingProvider>
    );

    // Click next
    fireEvent.click(screen.getByText('Next'));

    // Should show second step
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('calls onClose when skipping', () => {
    const onClose = vi.fn();

    render(
      <OnboardingProvider>
        <WelcomeModal isOpen={true} onClose={onClose} />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText('Skip'));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('StruggleDetector', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders children correctly', () => {
    render(
      <OnboardingProvider>
        <StruggleDetector featureId="test-feature">
          <button>Test Button</button>
        </StruggleDetector>
      </OnboardingProvider>
    );

    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('tracks interactions', () => {
    let capturedContext: ReturnType<typeof useOnboarding> | null = null;

    render(
      <OnboardingProvider>
        <TestConsumer onContext={(ctx) => { capturedContext = ctx; }} />
        <StruggleDetector featureId="test-feature">
          <button>Test Button</button>
        </StruggleDetector>
      </OnboardingProvider>
    );

    // Click multiple times
    const button = screen.getByText('Test Button');
    for (let i = 0; i < 6; i++) {
      fireEvent.click(button);
    }

    // Should have recorded struggle
    expect(capturedContext!.struggleMetrics.has('test-feature')).toBe(true);
  });
});

describe('OnboardingProgressIndicator', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('shows progress for new users', () => {
    render(
      <OnboardingProvider>
        <OnboardingProgressIndicator />
      </OnboardingProvider>
    );

    expect(screen.getByText(/0\/\d+/)).toBeInTheDocument();
  });
});

describe('TUTORIALS constant', () => {
  it('has required tutorial structure', () => {
    expect(TUTORIALS.length).toBeGreaterThan(0);

    TUTORIALS.forEach(tutorial => {
      expect(tutorial.id).toBeDefined();
      expect(tutorial.title).toBeDefined();
      expect(tutorial.description).toBeDefined();
      expect(tutorial.steps.length).toBeGreaterThan(0);
      expect(tutorial.estimatedTime).toBeGreaterThan(0);
      expect(tutorial.category).toBeDefined();

      tutorial.steps.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.target).toBeDefined();
        expect(step.content).toBeDefined();
        expect(step.category).toBeDefined();
      });
    });
  });

  it('has unique tutorial IDs', () => {
    const ids = TUTORIALS.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has unique step IDs within each tutorial', () => {
    TUTORIALS.forEach(tutorial => {
      const stepIds = tutorial.steps.map(s => s.id);
      const uniqueStepIds = new Set(stepIds);
      expect(uniqueStepIds.size).toBe(stepIds.length);
    });
  });
});

describe('FEATURE_HELP constant', () => {
  it('has required help content structure', () => {
    Object.entries(FEATURE_HELP).forEach(([featureId, help]) => {
      expect(featureId).toBeDefined();
      expect(help.title).toBeDefined();
      expect(help.description).toBeDefined();
      expect(help.tips.length).toBeGreaterThan(0);
    });
  });

  it('references valid tutorials', () => {
    const tutorialIds = TUTORIALS.map(t => t.id);

    Object.values(FEATURE_HELP).forEach(help => {
      if (help.relatedTutorial) {
        expect(tutorialIds).toContain(help.relatedTutorial);
      }
    });
  });
});
