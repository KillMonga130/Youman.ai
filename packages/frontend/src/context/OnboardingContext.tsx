import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';

// Onboarding step definitions
export interface OnboardingStep extends Step {
  id: string;
  category: 'basics' | 'editor' | 'settings' | 'advanced';
}

// Tutorial definition
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  steps: OnboardingStep[];
  estimatedTime: number; // in minutes
  category: 'getting-started' | 'features' | 'advanced';
}

// User progress tracking
export interface OnboardingProgress {
  completedSteps: string[];
  completedTutorials: string[];
  currentTutorial: string | null;
  currentStepIndex: number;
  totalTimeSpent: number; // in seconds
  lastActiveAt: string;
  strugglingFeatures: string[];
  dismissedTooltips: string[];
}

// Struggle detection metrics
export interface StruggleMetrics {
  featureId: string;
  attempts: number;
  errors: number;
  timeSpent: number;
  lastAttempt: string;
}

interface OnboardingContextType {
  // State
  isOnboardingActive: boolean;
  currentTutorial: Tutorial | null;
  progress: OnboardingProgress;
  showTooltip: string | null;
  struggleMetrics: Map<string, StruggleMetrics>;
  
  // Actions
  startOnboarding: () => void;
  startTutorial: (tutorialId: string) => void;
  skipOnboarding: () => void;
  completeStep: (stepId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  showContextualTooltip: (tooltipId: string) => void;
  dismissTooltip: (tooltipId: string) => void;
  recordStruggle: (featureId: string, isError?: boolean) => void;
  resetProgress: () => void;
  getRecommendedTutorial: () => Tutorial | null;
  isStepCompleted: (stepId: string) => boolean;
  isTutorialCompleted: (tutorialId: string) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Default tutorials
const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with AI Humanizer',
    description: 'Learn the basics of humanizing AI-generated content',
    videoUrl: '/videos/getting-started.mp4',
    estimatedTime: 5,
    category: 'getting-started',
    steps: [
      {
        id: 'welcome',
        target: 'body',
        content: 'Welcome to AI Humanizer! Let\'s take a quick tour to help you get started.',
        placement: 'center',
        disableBeacon: true,
        category: 'basics',
      },
      {
        id: 'dashboard-overview',
        target: '[data-tour="dashboard"]',
        content: 'This is your dashboard where you can see all your projects and quick stats.',
        placement: 'bottom',
        category: 'basics',
      },
      {
        id: 'create-project',
        target: '[data-tour="new-project"]',
        content: 'Click here to create a new project and start humanizing your content.',
        placement: 'bottom',
        category: 'basics',
      },
      {
        id: 'sidebar-navigation',
        target: '[data-tour="sidebar"]',
        content: 'Use the sidebar to navigate between different sections of the app.',
        placement: 'right',
        category: 'basics',
      },
    ],
  },
  {
    id: 'editor-basics',
    title: 'Using the Editor',
    description: 'Master the text editor and transformation controls',
    videoUrl: '/videos/editor-basics.mp4',
    estimatedTime: 7,
    category: 'features',
    steps: [
      {
        id: 'editor-intro',
        target: '[data-tour="editor"]',
        content: 'This is the editor where you\'ll paste or type your AI-generated content.',
        placement: 'bottom',
        category: 'editor',
      },
      {
        id: 'humanization-level',
        target: '[data-tour="level-slider"]',
        content: 'Adjust the humanization level from 1 (subtle) to 5 (aggressive) based on your needs.',
        placement: 'left',
        category: 'editor',
      },
      {
        id: 'strategy-selection',
        target: '[data-tour="strategy-select"]',
        content: 'Choose a transformation strategy: Casual, Professional, Academic, or let the system auto-detect.',
        placement: 'left',
        category: 'editor',
      },
      {
        id: 'humanize-button',
        target: '[data-tour="humanize-btn"]',
        content: 'Click this button to start the humanization process.',
        placement: 'top',
        category: 'editor',
      },
      {
        id: 'comparison-view',
        target: '[data-tour="comparison"]',
        content: 'View the original and humanized text side by side to review changes.',
        placement: 'bottom',
        category: 'editor',
      },
    ],
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    description: 'Explore powerful features for professional use',
    videoUrl: '/videos/advanced-features.mp4',
    estimatedTime: 10,
    category: 'advanced',
    steps: [
      {
        id: 'protected-segments',
        target: '[data-tour="protected-segments"]',
        content: 'Mark specific text as protected to prevent it from being modified during humanization.',
        placement: 'bottom',
        category: 'advanced',
      },
      {
        id: 'detection-testing',
        target: '[data-tour="detection-test"]',
        content: 'Test your humanized content against multiple AI detection tools.',
        placement: 'left',
        category: 'advanced',
      },
      {
        id: 'version-history',
        target: '[data-tour="version-history"]',
        content: 'Access version history to compare and restore previous versions of your work.',
        placement: 'right',
        category: 'advanced',
      },
      {
        id: 'analytics',
        target: '[data-tour="analytics"]',
        content: 'View detailed analytics about your transformations and detection scores.',
        placement: 'bottom',
        category: 'advanced',
      },
    ],
  },
  {
    id: 'settings-customization',
    title: 'Customizing Your Experience',
    description: 'Configure settings and preferences',
    estimatedTime: 4,
    category: 'features',
    steps: [
      {
        id: 'settings-intro',
        target: '[data-tour="settings"]',
        content: 'Access settings to customize your AI Humanizer experience.',
        placement: 'left',
        category: 'settings',
      },
      {
        id: 'default-preferences',
        target: '[data-tour="default-settings"]',
        content: 'Set your default humanization level, strategy, and language preferences.',
        placement: 'right',
        category: 'settings',
      },
      {
        id: 'dark-mode',
        target: '[data-tour="dark-mode"]',
        content: 'Toggle dark mode for comfortable viewing in low-light environments.',
        placement: 'bottom',
        category: 'settings',
      },
      {
        id: 'keyboard-shortcuts',
        target: '[data-tour="shortcuts"]',
        content: 'Customize keyboard shortcuts for faster workflow.',
        placement: 'bottom',
        category: 'settings',
      },
    ],
  },
];

// Contextual tooltips for specific features
export const CONTEXTUAL_TOOLTIPS: Record<string, { title: string; content: string; placement: 'top' | 'bottom' | 'left' | 'right' }> = {
  'first-humanization': {
    title: 'Your First Humanization',
    content: 'Paste your AI-generated text and click "Humanize" to transform it into natural-sounding content.',
    placement: 'bottom',
  },
  'detection-score-high': {
    title: 'High Detection Score',
    content: 'Try increasing the humanization level or using a different strategy to lower the detection score.',
    placement: 'left',
  },
  'protected-segments-tip': {
    title: 'Protect Important Text',
    content: 'Wrap text in [[double brackets]] to prevent it from being modified.',
    placement: 'top',
  },
  'batch-processing': {
    title: 'Process Multiple Documents',
    content: 'Upload multiple files at once to process them in batch.',
    placement: 'bottom',
  },
};

const DEFAULT_PROGRESS: OnboardingProgress = {
  completedSteps: [],
  completedTutorials: [],
  currentTutorial: null,
  currentStepIndex: 0,
  totalTimeSpent: 0,
  lastActiveAt: new Date().toISOString(),
  strugglingFeatures: [],
  dismissedTooltips: [],
};

// Struggle detection thresholds
const STRUGGLE_THRESHOLDS = {
  maxAttempts: 3,
  maxErrors: 2,
  maxTimeSpent: 120, // seconds
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps): JSX.Element {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress>(() => {
    const saved = localStorage.getItem('onboarding-progress');
    return saved ? JSON.parse(saved) : DEFAULT_PROGRESS;
  });
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [struggleMetrics, setStruggleMetrics] = useState<Map<string, StruggleMetrics>>(new Map());
  const [stepIndex, setStepIndex] = useState(0);
  const [run, setRun] = useState(false);

  // Persist progress to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding-progress', JSON.stringify(progress));
  }, [progress]);

  // Check if user is new and should see onboarding
  useEffect(() => {
    const isNewUser = progress.completedTutorials.length === 0 && progress.completedSteps.length === 0;
    const hasSeenWelcome = progress.dismissedTooltips.includes('welcome-dismissed');
    
    if (isNewUser && !hasSeenWelcome) {
      // Auto-start onboarding for new users after a short delay
      const timer = setTimeout(() => {
        setIsOnboardingActive(true);
        setCurrentTutorial(TUTORIALS[0] ?? null);
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [progress.completedTutorials.length, progress.completedSteps.length, progress.dismissedTooltips]);

  const startOnboarding = useCallback(() => {
    setIsOnboardingActive(true);
    setCurrentTutorial(TUTORIALS[0] ?? null);
    setStepIndex(0);
    setRun(true);
  }, []);

  const startTutorial = useCallback((tutorialId: string) => {
    const tutorial = TUTORIALS.find(t => t.id === tutorialId);
    if (tutorial) {
      setCurrentTutorial(tutorial);
      setStepIndex(0);
      setRun(true);
      setIsOnboardingActive(true);
      setProgress(prev => ({
        ...prev,
        currentTutorial: tutorialId,
        currentStepIndex: 0,
      }));
    }
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    setCurrentTutorial(null);
    setRun(false);
    setProgress(prev => ({
      ...prev,
      dismissedTooltips: [...prev.dismissedTooltips, 'welcome-dismissed'],
    }));
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setProgress(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId) 
        ? prev.completedSteps 
        : [...prev.completedSteps, stepId],
    }));
  }, []);

  const completeTutorial = useCallback((tutorialId: string) => {
    setProgress(prev => ({
      ...prev,
      completedTutorials: prev.completedTutorials.includes(tutorialId)
        ? prev.completedTutorials
        : [...prev.completedTutorials, tutorialId],
      currentTutorial: null,
      currentStepIndex: 0,
    }));
    setCurrentTutorial(null);
    setRun(false);
    setIsOnboardingActive(false);
  }, []);

  const showContextualTooltip = useCallback((tooltipId: string) => {
    if (!progress.dismissedTooltips.includes(tooltipId)) {
      setShowTooltip(tooltipId);
    }
  }, [progress.dismissedTooltips]);

  const dismissTooltip = useCallback((tooltipId: string) => {
    setShowTooltip(null);
    setProgress(prev => ({
      ...prev,
      dismissedTooltips: [...prev.dismissedTooltips, tooltipId],
    }));
  }, []);

  const recordStruggle = useCallback((featureId: string, isError = false) => {
    setStruggleMetrics(prev => {
      const existing = prev.get(featureId) || {
        featureId,
        attempts: 0,
        errors: 0,
        timeSpent: 0,
        lastAttempt: new Date().toISOString(),
      };

      const updated = {
        ...existing,
        attempts: existing.attempts + 1,
        errors: isError ? existing.errors + 1 : existing.errors,
        lastAttempt: new Date().toISOString(),
      };

      const newMap = new Map(prev);
      newMap.set(featureId, updated);

      // Check if user is struggling
      if (
        updated.attempts >= STRUGGLE_THRESHOLDS.maxAttempts ||
        updated.errors >= STRUGGLE_THRESHOLDS.maxErrors
      ) {
        setProgress(p => ({
          ...p,
          strugglingFeatures: p.strugglingFeatures.includes(featureId)
            ? p.strugglingFeatures
            : [...p.strugglingFeatures, featureId],
        }));
        
        // Show contextual help for struggling feature
        const tooltipId = `help-${featureId}`;
        if (!progress.dismissedTooltips.includes(tooltipId)) {
          setShowTooltip(tooltipId);
        }
      }

      return newMap;
    });
  }, [progress.dismissedTooltips]);

  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    setStruggleMetrics(new Map());
    setCurrentTutorial(null);
    setIsOnboardingActive(false);
    setRun(false);
    localStorage.removeItem('onboarding-progress');
  }, []);

  const getRecommendedTutorial = useCallback((): Tutorial | null => {
    // Find first incomplete tutorial
    const incompleteTutorial = TUTORIALS.find(
      t => !progress.completedTutorials.includes(t.id)
    );
    
    // Or recommend based on struggling features
    if (progress.strugglingFeatures.length > 0) {
      const featureCategory = progress.strugglingFeatures[0];
      const relevantTutorial = TUTORIALS.find(t => 
        t.steps.some(s => s.category === featureCategory) &&
        !progress.completedTutorials.includes(t.id)
      );
      if (relevantTutorial) return relevantTutorial;
    }
    
    return incompleteTutorial || null;
  }, [progress.completedTutorials, progress.strugglingFeatures]);

  const isStepCompleted = useCallback((stepId: string): boolean => {
    return progress.completedSteps.includes(stepId);
  }, [progress.completedSteps]);

  const isTutorialCompleted = useCallback((tutorialId: string): boolean => {
    return progress.completedTutorials.includes(tutorialId);
  }, [progress.completedTutorials]);

  // Joyride callback handler
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type, step } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Update step index
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
      
      // Mark step as completed
      if (step && 'id' in step) {
        completeStep((step as OnboardingStep).id);
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (currentTutorial && status === STATUS.FINISHED) {
        completeTutorial(currentTutorial.id);
      } else {
        skipOnboarding();
      }
    }
  }, [currentTutorial, completeStep, completeTutorial, skipOnboarding]);

  const value: OnboardingContextType = {
    isOnboardingActive,
    currentTutorial,
    progress,
    showTooltip,
    struggleMetrics,
    startOnboarding,
    startTutorial,
    skipOnboarding,
    completeStep,
    completeTutorial,
    showContextualTooltip,
    dismissTooltip,
    recordStruggle,
    resetProgress,
    getRecommendedTutorial,
    isStepCompleted,
    isTutorialCompleted,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {currentTutorial && (
        <Joyride
          steps={currentTutorial.steps}
          run={run}
          stepIndex={stepIndex}
          continuous
          showProgress
          showSkipButton
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: '#3b82f6',
              zIndex: 10000,
            },
            tooltip: {
              borderRadius: '8px',
              padding: '16px',
            },
            buttonNext: {
              backgroundColor: '#3b82f6',
              borderRadius: '6px',
              padding: '8px 16px',
            },
            buttonBack: {
              color: '#6b7280',
              marginRight: '8px',
            },
            buttonSkip: {
              color: '#9ca3af',
            },
          }}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip Tour',
          }}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// Export tutorials for external use
export { TUTORIALS };
