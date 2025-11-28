import { useState } from 'react';
import { Sparkles, Play, BookOpen, ArrowRight, CheckCircle } from 'lucide-react';
import { useOnboarding, TUTORIALS } from '../context/OnboardingContext';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps): JSX.Element | null {
  const { startTutorial, skipOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const welcomeSteps = [
    {
      title: 'Welcome to AI Humanizer! 🎉',
      description: 'Transform AI-generated content into natural, human-like text that passes detection tools.',
      image: '/images/welcome-1.svg',
      features: [
        'Humanize text with multiple strategies',
        'Test against AI detection tools',
        'Preserve important formatting',
        'Track version history',
      ],
    },
    {
      title: 'How It Works',
      description: 'Our advanced algorithms analyze and transform your content while preserving meaning.',
      image: '/images/welcome-2.svg',
      features: [
        'Paste or upload your AI-generated content',
        'Choose humanization level and strategy',
        'Review and compare changes',
        'Export in multiple formats',
      ],
    },
    {
      title: 'Ready to Start?',
      description: 'Take a quick tour or dive right in. You can always access tutorials later.',
      image: '/images/welcome-3.svg',
      features: [],
    },
  ];

  const currentStep = welcomeSteps[step]!;
  const isLastStep = step === welcomeSteps.length - 1;

  const handleStartTour = () => {
    onClose();
    startTutorial('getting-started');
  };

  const handleSkip = () => {
    skipOnboarding();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6">
          {welcomeSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === step 
                  ? 'bg-blue-600 w-6' 
                  : index < step 
                    ? 'bg-blue-400' 
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon/Image placeholder */}
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white" />
          </div>

          <h2 id="welcome-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {currentStep.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {currentStep.description}
          </p>

          {/* Features list */}
          {currentStep.features.length > 0 && (
            <ul className="text-left space-y-3 mb-8">
              {currentStep.features.map((feature, index) => (
                <li 
                  key={index}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-200"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          {isLastStep ? (
            <div className="space-y-3">
              <button
                onClick={handleStartTour}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <Play className="w-5 h-5" />
                Take the Tour (5 min)
              </button>
              <button
                onClick={handleSkip}
                className="w-full px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Tutorial preview for last step */}
        {isLastStep && (
          <div className="px-8 pb-8">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
                <BookOpen className="w-4 h-4" />
                <span>Available Tutorials</span>
              </div>
              <div className="space-y-2">
                {TUTORIALS.slice(0, 3).map(tutorial => (
                  <button
                    key={tutorial.id}
                    onClick={() => {
                      onClose();
                      startTutorial(tutorial.id);
                    }}
                    className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {tutorial.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tutorial.estimatedTime} min • {tutorial.steps.length} steps
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to check if welcome modal should be shown
export function useWelcomeModal(): { shouldShow: boolean; dismiss: () => void } {
  const { progress, skipOnboarding } = useOnboarding();
  
  const shouldShow = 
    progress.completedTutorials.length === 0 && 
    progress.completedSteps.length === 0 &&
    !progress.dismissedTooltips.includes('welcome-dismissed');

  return {
    shouldShow,
    dismiss: skipOnboarding,
  };
}
