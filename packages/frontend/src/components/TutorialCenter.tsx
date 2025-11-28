import React, { useState } from 'react';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  RotateCcw,
  Video,
  GraduationCap,
  Sparkles,
  Target
} from 'lucide-react';
import { useOnboarding, TUTORIALS, Tutorial } from '../context/OnboardingContext';

interface TutorialCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialCenter({ isOpen, onClose }: TutorialCenterProps): JSX.Element | null {
  const { 
    progress, 
    startTutorial, 
    isTutorialCompleted, 
    resetProgress,
    getRecommendedTutorial 
  } = useOnboarding();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Tutorials', icon: BookOpen },
    { id: 'getting-started', label: 'Getting Started', icon: Sparkles },
    { id: 'features', label: 'Features', icon: Target },
    { id: 'advanced', label: 'Advanced', icon: GraduationCap },
  ];

  const filteredTutorials = selectedCategory === 'all' 
    ? TUTORIALS 
    : TUTORIALS.filter(t => t.category === selectedCategory);

  const completedCount = progress.completedTutorials.length;
  const totalCount = TUTORIALS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const recommendedTutorial = getRecommendedTutorial();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-center-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="tutorial-center-title" className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Tutorial Center
              </h2>
              <p className="text-blue-100 mt-1">
                Learn how to get the most out of AI Humanizer
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors text-2xl"
              aria-label="Close tutorial center"
            >
              ×
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Your Progress</span>
              <span>{completedCount} of {totalCount} completed</span>
            </div>
            <div className="h-2 bg-blue-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {/* Recommended tutorial */}
          {recommendedTutorial && !isTutorialCompleted(recommendedTutorial.id) && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-sm">Recommended for you</span>
              </div>
              <TutorialCard 
                tutorial={recommendedTutorial} 
                isCompleted={false}
                onStart={() => {
                  startTutorial(recommendedTutorial.id);
                  onClose();
                }}
                onWatchVideo={() => setShowVideoModal(recommendedTutorial.id)}
                highlighted
              />
            </div>
          )}

          {/* Category tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Tutorial list */}
          <div className="space-y-4">
            {filteredTutorials.map(tutorial => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                isCompleted={isTutorialCompleted(tutorial.id)}
                onStart={() => {
                  startTutorial(tutorial.id);
                  onClose();
                }}
                onWatchVideo={() => setShowVideoModal(tutorial.id)}
              />
            ))}
          </div>

          {/* Reset progress */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset your tutorial progress? This cannot be undone.')) {
                  resetProgress();
                }
              }}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Progress
            </button>
          </div>
        </div>
      </div>

      {/* Video modal */}
      {showVideoModal && (
        <VideoModal
          tutorial={TUTORIALS.find(t => t.id === showVideoModal)!}
          onClose={() => setShowVideoModal(null)}
        />
      )}
    </div>
  );
}

interface TutorialCardProps {
  tutorial: Tutorial;
  isCompleted: boolean;
  onStart: () => void;
  onWatchVideo: () => void;
  highlighted?: boolean;
}

function TutorialCard({ tutorial, isCompleted, onStart, onWatchVideo, highlighted }: TutorialCardProps): JSX.Element {
  return (
    <div 
      className={`p-4 rounded-lg border transition-all ${
        highlighted
          ? 'bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700 shadow-md'
          : isCompleted
            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
            )}
            <h3 className={`font-semibold ${
              isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
            }`}>
              {tutorial.title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-7 mb-2">
            {tutorial.description}
          </p>
          <div className="flex items-center gap-4 ml-7 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tutorial.estimatedTime} min
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {tutorial.steps.length} steps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tutorial.videoUrl && (
            <button
              onClick={onWatchVideo}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label={`Watch video for ${tutorial.title}`}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
          )}
          <button
            onClick={onStart}
            className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isCompleted
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Play className="w-4 h-4" />
            {isCompleted ? 'Replay' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface VideoModalProps {
  tutorial: Tutorial;
  onClose: () => void;
}

function VideoModal({ tutorial, onClose }: VideoModalProps): JSX.Element {
  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div 
        className="bg-black rounded-xl overflow-hidden w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 bg-gray-900">
          <h3 className="text-white font-medium">{tutorial.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
            aria-label="Close video"
          >
            ×
          </button>
        </div>
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          {tutorial.videoUrl ? (
            <video
              src={tutorial.videoUrl}
              controls
              autoPlay
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-gray-400 text-center">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Video coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress indicator component for use in other parts of the app
export function OnboardingProgressIndicator(): JSX.Element {
  const { progress } = useOnboarding();
  const completedCount = progress.completedTutorials.length;
  const totalCount = TUTORIALS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (completedCount === totalCount) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>All tutorials completed!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[100px]">
        <div 
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {completedCount}/{totalCount}
      </span>
    </div>
  );
}
