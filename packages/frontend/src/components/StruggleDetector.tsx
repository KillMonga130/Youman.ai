import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, MessageCircle, BookOpen, X, Lightbulb } from 'lucide-react';
import { useOnboarding, TUTORIALS } from '../context/OnboardingContext';

interface StruggleDetectorProps {
  featureId: string;
  children: React.ReactNode;
  helpContent?: {
    title: string;
    description: string;
    tips: string[];
    relatedTutorial?: string;
  };
}

/**
 * Wraps a feature component and detects when users are struggling.
 * Shows contextual help when struggle is detected.
 */
export function StruggleDetector({ featureId, children, helpContent }: StruggleDetectorProps): JSX.Element {
  const { recordStruggle, progress, startTutorial } = useOnboarding();
  const [showHelp, setShowHelp] = useState(false);
  const interactionCount = useRef(0);
  const errorCount = useRef(0);
  const startTime = useRef<number | null>(null);

  const isStruggling = progress.strugglingFeatures.includes(featureId);

  // Track time spent on feature
  useEffect(() => {
    startTime.current = Date.now();
    
    return () => {
      if (startTime.current) {
        const timeSpent = (Date.now() - startTime.current) / 1000;
        // If user spent more than 2 minutes without completing, record struggle
        if (timeSpent > 120 && interactionCount.current > 5) {
          recordStruggle(featureId);
        }
      }
    };
  }, [featureId, recordStruggle]);

  // Show help automatically when struggling
  useEffect(() => {
    if (isStruggling && helpContent && !showHelp) {
      setShowHelp(true);
    }
  }, [isStruggling, helpContent, showHelp]);

  // Track interactions
  const handleInteraction = () => {
    interactionCount.current += 1;
    
    // After many interactions without success, suggest help
    if (interactionCount.current > 5 && !showHelp) {
      recordStruggle(featureId);
    }
  };

  // Track errors
  const handleError = () => {
    errorCount.current += 1;
    recordStruggle(featureId, true);
    
    // Show help after multiple errors
    if (errorCount.current >= 2 && helpContent) {
      setShowHelp(true);
    }
  };

  return (
    <div 
      className="relative"
      onClick={handleInteraction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleInteraction();
        }
      }}
    >
      {/* Wrap children with error boundary context */}
      <StruggleContext.Provider value={{ recordError: handleError }}>
        {children}
      </StruggleContext.Provider>

      {/* Help indicator for struggling users */}
      {isStruggling && helpContent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowHelp(true);
          }}
          className="absolute -top-2 -right-2 p-1 bg-amber-500 text-white rounded-full shadow-lg animate-pulse hover:animate-none hover:bg-amber-600 transition-colors z-10"
          aria-label="Get help with this feature"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}

      {/* Help modal */}
      {showHelp && helpContent && (
        <StruggleHelpModal
          featureId={featureId}
          helpContent={helpContent}
          onClose={() => setShowHelp(false)}
          onStartTutorial={(tutorialId) => {
            setShowHelp(false);
            startTutorial(tutorialId);
          }}
        />
      )}
    </div>
  );
}

// Context for child components to report errors
interface StruggleContextType {
  recordError: () => void;
}

const StruggleContext = React.createContext<StruggleContextType>({
  recordError: () => {},
});

export function useStruggleContext(): StruggleContextType {
  return React.useContext(StruggleContext);
}

interface StruggleHelpModalProps {
  featureId: string;
  helpContent: {
    title: string;
    description: string;
    tips: string[];
    relatedTutorial?: string;
  };
  onClose: () => void;
  onStartTutorial: (tutorialId: string) => void;
}

function StruggleHelpModal({ helpContent, onClose, onStartTutorial }: StruggleHelpModalProps): JSX.Element {
  const relatedTutorial = helpContent.relatedTutorial 
    ? TUTORIALS.find(t => t.id === helpContent.relatedTutorial)
    : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="struggle-help-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              <h3 id="struggle-help-title" className="font-semibold">
                Need Help?
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close help"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {helpContent.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {helpContent.description}
          </p>

          {/* Tips */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Quick Tips:
            </h5>
            <ul className="space-y-2">
              {helpContent.tips.map((tip, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Related tutorial */}
          {relatedTutorial && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Related Tutorial</span>
              </div>
              <button
                onClick={() => onStartTutorial(relatedTutorial.id)}
                className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {relatedTutorial.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {relatedTutorial.estimatedTime} min • {relatedTutorial.steps.length} steps
                </div>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Got it
            </button>
            <button
              onClick={() => {
                // Open support chat or contact form
                window.open('/support', '_blank');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-defined help content for common features
export const FEATURE_HELP: Record<string, {
  title: string;
  description: string;
  tips: string[];
  relatedTutorial?: string;
}> = {
  'humanization': {
    title: 'Humanizing Your Content',
    description: 'Transform AI-generated text into natural, human-like content.',
    tips: [
      'Paste your AI-generated text in the editor',
      'Choose a humanization level (1-5) based on how much transformation you need',
      'Select a strategy that matches your content type',
      'Click "Humanize" to start the transformation',
    ],
    relatedTutorial: 'editor-basics',
  },
  'detection-testing': {
    title: 'Testing AI Detection',
    description: 'Verify your content passes AI detection tools.',
    tips: [
      'After humanizing, click "Test Detection" to check your content',
      'Review scores from multiple detection services',
      'If scores are high, try increasing the humanization level',
      'Use the "Re-humanize" option for specific sections',
    ],
    relatedTutorial: 'advanced-features',
  },
  'protected-segments': {
    title: 'Protecting Text Segments',
    description: 'Keep specific text unchanged during humanization.',
    tips: [
      'Wrap text in [[double brackets]] to protect it',
      'Protected text will remain exactly as written',
      'Use for technical terms, names, or quotes',
      'You can protect multiple segments in one document',
    ],
    relatedTutorial: 'advanced-features',
  },
  'version-history': {
    title: 'Managing Versions',
    description: 'Track and restore previous versions of your work.',
    tips: [
      'Versions are saved automatically every 2 minutes',
      'Click "History" to view all saved versions',
      'Compare versions side by side',
      'Restore any previous version with one click',
    ],
    relatedTutorial: 'advanced-features',
  },
  'file-upload': {
    title: 'Uploading Documents',
    description: 'Import documents for humanization.',
    tips: [
      'Drag and drop files onto the upload area',
      'Supported formats: DOCX, PDF, TXT, EPUB',
      'Maximum file size: 10MB',
      'You can upload multiple files at once',
    ],
    relatedTutorial: 'getting-started',
  },
};
