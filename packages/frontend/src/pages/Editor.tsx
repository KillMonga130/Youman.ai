import { useState, useCallback, useEffect } from 'react';
import { Wand2, Copy, Download, RotateCcw, ChevronDown, Shield, Upload, Save, AlertCircle, CheckCircle, XCircle, Loader2, FileSearch, Target, BookOpen, GitBranch, Volume2, Sparkles, X, History, Users } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { FileUpload, type UploadedFile } from '../components/ui';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';
import { ShortcutHint } from '../components/KeyboardShortcutsModal';
import { useHumanize, useDetectAI, useProject, useCreateProject, useUpdateProject } from '../api/hooks';
import { apiClient } from '../api/client';
import { Alert } from '../components/ui';
import { BranchManager } from '../components/BranchManager';
import { CollaboratorManager } from '../components/CollaboratorManager';

type Strategy = 'auto' | 'casual' | 'professional' | 'academic';
type AnalysisTab = 'detection' | 'plagiarism' | 'seo' | 'citations' | 'variations' | 'tone';

interface TransformOptions {
  level: number;
  strategy: Strategy;
  protectedSegments: string[];
}

export function Editor(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { originalText, setOriginalText, humanizedText, setHumanizedText, settings, setCurrentProjectId } = useAppStore();
  const { getShortcutKey, shortcutsEnabled } = useKeyboardShortcuts();
  
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<TransformOptions>({
    level: settings.defaultLevel,
    strategy: settings.defaultStrategy,
    protectedSegments: [],
  });
  const [metrics, setMetrics] = useState<{
    detectionScore: number;
    perplexity: number;
    burstiness: number;
    modificationPercentage: number;
    sentencesModified?: number;
    totalSentences?: number;
  } | null>(null);
  const [detectionResults, setDetectionResults] = useState<{
    results: Array<{
      provider: string;
      score: number;
      passed: boolean;
      confidence: number;
    }>;
    averageScore: number;
    overallPassed: boolean;
  } | null>(null);
  const [progress, setProgress] = useState<{
    status: string;
    progress: number;
    chunksProcessed: number;
    estimatedTimeRemaining?: number;
  } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Analysis tabs state
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTab>('detection');
  const [plagiarismResult, setPlagiarismResult] = useState<{
    originalityScore: number;
    matches: Array<{ text: string; source: string; similarity: number }>;
    totalMatches: number;
  } | null>(null);
  const [seoResult, setSeoResult] = useState<{
    keywords: Array<{ term: string; originalDensity: number; originalCount: number }>;
    readabilityScore: number;
    wordCount: number;
  } | null>(null);
  const [citationResult, setCitationResult] = useState<{
    citations: Array<{ text: string; format: string; type: string }>;
    primaryFormat: string;
    confidence: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // A/B Testing state
  const [variations, setVariations] = useState<Array<{ id: string; text: string; strategy: string; level: number; detectionScore: number }>>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  
  // Tone Analysis state
  const [toneAnalysisResult, setToneAnalysisResult] = useState<{
    overallSentiment: string;
    sentimentScore: number;
    confidence: number;
    emotions: Record<string, number>;
    formality: number;
    subjectivity: number;
  } | null>(null);
  const [emotionsResult, setEmotionsResult] = useState<{
    emotions: Record<string, number>;
    dominantEmotion: string;
    emotionalIntensity: number;
  } | null>(null);
  const [adjustedText, setAdjustedText] = useState<string | null>(null);
  const [toneAdjustmentChanges, setToneAdjustmentChanges] = useState<string[]>([]);
  const [consistencyResult, setConsistencyResult] = useState<{
    consistencyScore: number;
    inconsistencies: Array<{ textIndex: number; issue: string }>;
  } | null>(null);
  const [targetedText, setTargetedText] = useState<string | null>(null);
  const [targetAdjustments, setTargetAdjustments] = useState<string[]>([]);
  const [isToneAnalyzing, setIsToneAnalyzing] = useState(false);
  const [toneMode, setToneMode] = useState<'analyze' | 'adjust' | 'emotions' | 'consistency' | 'target'>('analyze');
  
  // Branch management state
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>(undefined);
  
  // Collaboration state
  const [showCollaboratorManager, setShowCollaboratorManager] = useState(false);
  
  // Activity log state
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLog, setActivityLog] = useState<Array<{
    id: string;
    action: string;
    userId: string;
    userName: string | null;
    userEmail: string;
    details: Record<string, unknown> | null;
    createdAt: string;
  }>>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Load project if ID is provided
  const { data: projectData, isLoading: isLoadingProject } = useProject(id || null);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const humanizeMutation = useHumanize();
  const detectAIMutation = useDetectAI();

  // Load project data when project is fetched
  useEffect(() => {
    if (projectData?.project && id) {
      setProjectName(projectData.project.name);
      setCurrentProjectId(id);
      
      // Load project content from latest version
      const loadProjectContent = async () => {
        try {
          const latestVersion = await apiClient.getLatestVersion(id);
          if (latestVersion?.content) {
            setOriginalText(latestVersion.content);
            if (latestVersion.humanizedContent) {
              setHumanizedText(latestVersion.humanizedContent);
            }
          }
          // If latestVersion is null, it means the project has no versions yet
          // This is normal for new projects - they start empty
        } catch (error) {
          // Only log unexpected errors (getLatestVersion should handle NO_VERSIONS gracefully)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('NO_VERSIONS') && !errorMessage.includes('No versions')) {
            console.error('Failed to load project content:', error);
          }
          // Continue without content if loading fails
        }
      };
      
      loadProjectContent();
    }
  }, [projectData, id, setCurrentProjectId, setOriginalText, setHumanizedText]);

  // Poll for transformation progress
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        if (!isMounted) return;
        
        try {
          const status = await apiClient.getTransformationStatus(jobId);
          
          if (!isMounted) return;
          
          setProgress(status);
          
          if (status.status === 'completed' || status.status === 'failed') {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            if (status.status === 'completed') {
              setProgress(null);
            }
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('Failed to poll progress:', error);
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          setProgress(null);
        }
      }, 2000);
    };

    startPolling();

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId]);

  // Handle file content extraction from upload
  const handleContentExtracted = useCallback((content: string, _file: UploadedFile) => {
    setOriginalText(content);
    setShowFileUpload(false);
  }, [setOriginalText]);

  const handleHumanize = useCallback(async () => {
    if (!originalText.trim()) {
      setError('Please enter some text to humanize');
      return;
    }
    
    // Check quota before humanization
    const wordCount = originalText.trim().split(/\s+/).length;
    try {
      const quotaCheck = await apiClient.checkQuota('words', wordCount);
      if (!quotaCheck.allowed) {
        setError(`Quota exceeded: You have ${quotaCheck.remaining.toLocaleString()} words remaining, but need ${wordCount.toLocaleString()}. ${quotaCheck.upgradeRequired ? 'Please upgrade your plan to continue.' : 'Please try again later.'}`);
        return;
      }
      // Warn if using more than 50% of remaining quota
      if (quotaCheck.remaining > 0 && wordCount > quotaCheck.remaining * 0.5) {
        const confirmMessage = `Warning: You have ${quotaCheck.remaining.toLocaleString()} words remaining. This operation will use ${wordCount.toLocaleString()} words (${Math.round((wordCount / quotaCheck.remaining) * 100)}% of remaining quota). Continue?`;
        if (!confirm(confirmMessage)) {
          return;
        }
      }
    } catch (err: unknown) {
      // Check if it's a quota exceeded error (402)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('402')) {
        try {
          const errorData = JSON.parse(errorMessage);
          setError(errorData.message || `Quota exceeded. Please upgrade your plan to continue.`);
          return;
        } catch {
          setError('Quota exceeded. Please upgrade your plan to continue.');
          return;
        }
      }
      console.error('Failed to check quota:', err);
      // For other errors, show a warning but allow the operation to proceed
      const shouldContinue = confirm('Unable to check quota. Continue anyway?');
      if (!shouldContinue) {
        return;
      }
    }
    
    setError(null);
    setProgress({ status: 'starting', progress: 0, chunksProcessed: 0 });
    setDetectionResults(null);
    
    try {
      const result = await humanizeMutation.mutateAsync({
        text: originalText,
        options: {
          level: options.level,
          strategy: options.strategy,
          protectedSegments: options.protectedSegments,
        },
      });
      
      setHumanizedText(result.humanizedText);
      setMetrics({
        detectionScore: result.metrics.detectionScore,
        perplexity: result.metrics.perplexity,
        burstiness: result.metrics.burstiness,
        modificationPercentage: result.metrics.modificationPercentage,
        sentencesModified: result.metrics.sentencesModified,
        totalSentences: result.metrics.totalSentences,
      });
      
      // Create version after humanization completes
      if (id) {
        try {
          await apiClient.createVersion(id, {
            content: originalText,
            humanizedContent: result.humanizedText,
          });
        } catch (error) {
          console.error('Failed to create version:', error);
          // Don't block user if version creation fails
        }
      }
      
      // Clear progress - transformation completed synchronously
      setProgress(null);
      // Don't set jobId for synchronous completions to avoid unnecessary polling
      setJobId(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to humanize text. Please try again.';
      setError(errorMessage);
      setProgress(null);
      console.error('Humanization error:', err);
    }
  }, [originalText, options, humanizeMutation, setHumanizedText]);

  const handleTestDetection = useCallback(async () => {
    if (!humanizedText.trim()) {
      setError('Please humanize text first before testing detection');
      return;
    }
    
    setError(null);
    try {
      const result = await detectAIMutation.mutateAsync({
        text: humanizedText,
        providers: ['gptzero', 'originality', 'turnitin', 'internal'],
      });
      
      setDetectionResults(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test detection. Please try again.';
      setError(errorMessage);
      console.error('Detection error:', err);
    }
  }, [humanizedText, detectAIMutation]);

  const handleCheckPlagiarism = useCallback(async () => {
    if (!humanizedText.trim()) {
      setError('Please humanize text first');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.checkPlagiarism(humanizedText);
      const matches = result.data?.matches ?? [];
      setPlagiarismResult({
        originalityScore: result.data?.originalityScore ?? 100,
        matches: matches.map(m => ({
          text: m.matchedText,
          source: m.source?.title ?? 'Unknown source',
          similarity: m.similarity,
        })),
        totalMatches: matches.length,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Plagiarism check failed';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [humanizedText]);

  const handleAnalyzeSEO = useCallback(async () => {
    const textToAnalyze = humanizedText.trim() || originalText.trim();
    if (!textToAnalyze) {
      setError('Please enter text to analyze');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.extractSEOKeywords(textToAnalyze);
      setSeoResult({
        keywords: result.keywords ?? [],
        readabilityScore: 0,
        wordCount: textToAnalyze.split(/\s+/).length,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'SEO analysis failed';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [humanizedText, originalText]);

  const handleDetectCitations = useCallback(async () => {
    const textToAnalyze = humanizedText.trim() || originalText.trim();
    if (!textToAnalyze) {
      setError('Please enter text to analyze');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.extractCitations(textToAnalyze);
      setCitationResult({
        citations: result.data?.citations ?? [],
        primaryFormat: result.data?.formatDetection?.primaryFormat ?? 'Unknown',
        confidence: result.data?.formatDetection?.confidence ?? 0,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Citation detection failed';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [humanizedText, originalText]);

  const handleGenerateVariations = useCallback(async () => {
    if (!originalText.trim()) {
      setError('Please enter text to generate variations');
      return;
    }
    setIsGeneratingVariations(true);
    setError(null);
    try {
      const result = await apiClient.generateVariations(originalText, 3, {
        strategies: ['casual', 'professional', 'academic'],
        levels: [2, 3, 4],
      });
      setVariations(result.data?.variations ?? []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate variations';
      setError(errorMessage);
    } finally {
      setIsGeneratingVariations(false);
    }
  }, [originalText]);

  const handleSelectVariation = useCallback((text: string) => {
    setHumanizedText(text);
  }, [setHumanizedText]);

  // Tone Analysis Handlers
  const handleAnalyzeTone = useCallback(async () => {
    const textToAnalyze = humanizedText.trim() || originalText.trim();
    if (!textToAnalyze) {
      setError('Please enter text to analyze');
      return;
    }
    setIsToneAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.analyzeTone(textToAnalyze);
      setToneAnalysisResult(result.data);
      setToneMode('analyze');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Tone analysis failed';
      setError(errorMessage);
    } finally {
      setIsToneAnalyzing(false);
    }
  }, [humanizedText, originalText]);

  const handleDetectEmotions = useCallback(async () => {
    const textToAnalyze = humanizedText.trim() || originalText.trim();
    if (!textToAnalyze) {
      setError('Please enter text to analyze');
      return;
    }
    setIsToneAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.detectEmotions(textToAnalyze);
      setEmotionsResult(result.data);
      setToneMode('emotions');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Emotion detection failed';
      setError(errorMessage);
    } finally {
      setIsToneAnalyzing(false);
    }
  }, [humanizedText, originalText]);

  const handleAdjustTone = useCallback(async (targetTone: { sentiment?: 'positive' | 'neutral' | 'negative'; formality?: number; emotion?: string }) => {
    const textToAdjust = humanizedText.trim() || originalText.trim();
    if (!textToAdjust) {
      setError('Please enter text to adjust');
      return;
    }
    setIsToneAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.adjustTone(textToAdjust, targetTone);
      setAdjustedText(result.data.adjustedText);
      setToneAdjustmentChanges(result.data.changes);
      setToneMode('adjust');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Tone adjustment failed';
      setError(errorMessage);
    } finally {
      setIsToneAnalyzing(false);
    }
  }, [humanizedText, originalText]);

  const handleCheckToneConsistency = useCallback(async (texts: string[]) => {
    if (texts.length < 2) {
      setError('Please provide at least 2 texts to check consistency');
      return;
    }
    setIsToneAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.checkToneConsistency(texts);
      setConsistencyResult(result.data);
      setToneMode('consistency');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Consistency check failed';
      setError(errorMessage);
    } finally {
      setIsToneAnalyzing(false);
    }
  }, []);

  const handleTargetTone = useCallback(async (targetTone: { sentiment: 'positive' | 'neutral' | 'negative'; formality: number; emotion: string }) => {
    const textToTarget = humanizedText.trim() || originalText.trim();
    if (!textToTarget) {
      setError('Please enter text to target');
      return;
    }
    setIsToneAnalyzing(true);
    setError(null);
    try {
      const result = await apiClient.targetTone(textToTarget, targetTone);
      setTargetedText(result.data.targetedText);
      setTargetAdjustments(result.data.adjustments);
      setToneMode('target');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Tone targeting failed';
      setError(errorMessage);
    } finally {
      setIsToneAnalyzing(false);
    }
  }, [humanizedText, originalText]);

  // Load activity log
  const loadActivityLog = useCallback(async () => {
    if (!id) return;
    setIsLoadingActivity(true);
    try {
      const result = await apiClient.getProjectActivity(id, { page: 1, limit: 50 });
      setActivityLog(result.activities || []);
    } catch (err: unknown) {
      console.error('Failed to load activity log:', err);
      setError('Failed to load activity log');
    } finally {
      setIsLoadingActivity(false);
    }
  }, [id]);

  useEffect(() => {
    if (showActivityLog && id) {
      loadActivityLog();
    }
  }, [showActivityLog, id, loadActivityLog]);

  const handleCopy = useCallback(async () => {
    if (!humanizedText) {
      setError('No text to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(humanizedText);
      // Show success feedback
      const originalError = error;
      setError(null);
      setTimeout(() => {
        if (originalError) setError(originalError);
      }, 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      console.error('Copy error:', err);
    }
  }, [humanizedText, error]);

  const handleDownload = useCallback(() => {
    if (!humanizedText) {
      setError('No text to download');
      return;
    }
    try {
      const blob = new Blob([humanizedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'humanized-text'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
      console.error('Download error:', err);
    }
  }, [humanizedText, projectName]);

  const handleReset = useCallback(() => {
    setOriginalText('');
    setHumanizedText('');
    setMetrics(null);
    setError(null);
    setDetectionResults(null);
    setPlagiarismResult(null);
    setSeoResult(null);
    setCitationResult(null);
    setVariations([]);
  }, [setOriginalText, setHumanizedText]);

  const handleSave = useCallback(async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    setError(null);
    try {
      if (id) {
        // Update existing project
        await updateProject.mutateAsync({
          id,
          data: {
            name: projectName,
            description: `Original: ${originalText.substring(0, 100)}...`,
          },
        });
      } else {
        // Create new project
        const result = await createProject.mutateAsync({
          name: projectName,
          description: `Original: ${originalText.substring(0, 100)}...`,
        });
        setCurrentProjectId(result.project.id);
        navigate(`/editor/${result.project.id}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save project. Please try again.';
      setError(errorMessage);
      console.error('Save error:', err);
    }
  }, [id, projectName, originalText, createProject, updateProject, setCurrentProjectId, navigate]);

  const wordCount = originalText.trim() ? originalText.trim().split(/\s+/).length : 0;

  // Register editor-specific keyboard shortcuts
  useHotkeys(
    getShortcutKey('humanize'),
    (e) => {
      e.preventDefault();
      if (originalText.trim() && !humanizeMutation.isPending) {
        handleHumanize();
      }
    },
    { enabled: shortcutsEnabled, enableOnFormTags: true },
    [originalText, humanizeMutation.isPending, handleHumanize]
  );

  useHotkeys(
    getShortcutKey('copy-output'),
    (e) => {
      e.preventDefault();
      if (humanizedText) {
        handleCopy();
      }
    },
    { enabled: shortcutsEnabled },
    [humanizedText, handleCopy]
  );

  useHotkeys(
    getShortcutKey('download'),
    (e) => {
      e.preventDefault();
      if (humanizedText) {
        handleDownload();
      }
    },
    { enabled: shortcutsEnabled },
    [humanizedText, handleDownload]
  );

  useHotkeys(
    getShortcutKey('reset'),
    (e) => {
      e.preventDefault();
      if (originalText || humanizedText) {
        handleReset();
      }
    },
    { enabled: shortcutsEnabled },
    [originalText, humanizedText, handleReset]
  );

  useHotkeys(
    getShortcutKey('upload'),
    (e) => {
      e.preventDefault();
      setShowFileUpload(true);
    },
    { enabled: shortcutsEnabled }
  );

  const isProcessing = humanizeMutation.isPending;
  const isSaving = createProject.isPending || updateProject.isPending;

  if (isLoadingProject && id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 mx-auto mb-6"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">Loading project...</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Please wait while we fetch your project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-5 glass-card rounded-2xl backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
        {/* Project Name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project Name"
          className="input flex-1 min-w-[200px] max-w-[300px] bg-white/90 dark:bg-gray-800/90 font-semibold"
        />
        {/* Level selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Level:</label>
          <select
            value={options.level}
            onChange={(e) => setOptions({ ...options, level: Number(e.target.value) })}
            className="input w-20 py-1.5 text-sm"
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Strategy:</label>
          <div className="relative">
            <select
              value={options.strategy}
              onChange={(e) => setOptions({ ...options, strategy: e.target.value as Strategy })}
              className="input py-1.5 text-sm pr-8 appearance-none"
            >
              <option value="auto">Auto-detect</option>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="academic">Academic</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1" />

        {/* Branch Manager Button */}
        {id && (
          <button
            onClick={() => setShowBranchManager(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
            title="Manage branches"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Branches</span>
          </button>
        )}

        {/* Collaborator Manager Button */}
        {id && (
          <button
            onClick={() => setShowCollaboratorManager(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
            title="Manage collaborators"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Collaborators</span>
          </button>
        )}

        {/* Activity Log Button */}
        {id && (
          <button
            onClick={() => setShowActivityLog(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
            title="View activity log"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Activity</span>
          </button>
        )}

        {/* Action buttons */}
        <button
          onClick={() => setShowFileUpload(true)}
          className="btn btn-outline flex items-center gap-2"
          title="Upload File"
          aria-label="Upload document file"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
          <ShortcutHint shortcutId="upload" />
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || !projectName.trim()}
          className="btn btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save Project"
          aria-label={isSaving ? 'Saving project...' : 'Save project'}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        <button
          onClick={handleReset}
          className="btn btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!originalText && !humanizedText}
          title="Reset Editor"
          aria-label="Reset editor and clear all text"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
          <ShortcutHint shortcutId="reset" />
        </button>
        
        <button
          onClick={handleHumanize}
          disabled={!originalText.trim() || isProcessing}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Humanize Text"
          aria-label={isProcessing ? 'Processing humanization...' : 'Humanize text'}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {isProcessing ? 'Processing...' : 'Humanize'}
          {!isProcessing && <ShortcutHint shortcutId="humanize" />}
        </button>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Upload Document
              </h2>
              <button
                onClick={() => setShowFileUpload(false)}
                className="btn btn-ghost btn-sm p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                aria-label="Close upload modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <FileUpload
                onContentExtracted={handleContentExtracted}
                acceptedFormats={['docx', 'pdf', 'txt', 'epub']}
                maxSize={50 * 1024 * 1024}
                maxFiles={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Split pane editor */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Original text */}
        <div className="card flex flex-col min-h-[300px] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Original Text</h3>
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">{wordCount} words</span>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste your AI-generated text here..."
            className="flex-1 p-6 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-gray-100 scrollbar-modern textarea border-0 text-base leading-relaxed"
            aria-label="Original text input"
          />
        </div>

        {/* Humanized text */}
        <div className="card flex flex-col min-h-[300px] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-900/20">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Humanized Text</h3>
            <div className="flex items-center gap-2">
              {humanizedText && (
                <>
                  <button
                    onClick={handleCopy}
                    disabled={!humanizedText}
                    className="btn btn-outline btn-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy to clipboard"
                    aria-label="Copy humanized text to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!humanizedText}
                    className="btn btn-outline btn-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download as text file"
                    aria-label="Download humanized text"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 p-6 overflow-auto">
            {humanizedText ? (
              <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed text-base">{humanizedText}</p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 mb-4">
                  <Sparkles className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 text-center text-base font-medium">
                  Humanized text will appear here...
                  <br />
                  <span className="text-sm">Click "Humanize" to transform your text</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress tracking */}
      {progress && (
        <div className="mt-4 card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            <h3 className="font-medium">Processing...</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 capitalize">{progress.status}</span>
              <span className="text-gray-600 dark:text-gray-400">{progress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            {progress.chunksProcessed > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Processed {progress.chunksProcessed} chunks
                {progress.estimatedTimeRemaining && ` • ~${Math.ceil(progress.estimatedTimeRemaining / 1000)}s remaining`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metrics panel */}
      {metrics && (
        <div className="mt-4 card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-green-500" />
            <h3 className="font-medium">Transformation Metrics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI Detection</p>
              <p className={`text-xl font-semibold ${metrics.detectionScore < 20 ? 'text-green-600' : metrics.detectionScore < 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {Math.round(metrics.detectionScore)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Perplexity</p>
              <p className="text-xl font-semibold">{typeof metrics.perplexity === 'number' ? metrics.perplexity.toFixed(1) : metrics.perplexity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Burstiness</p>
              <p className="text-xl font-semibold">{metrics.burstiness.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modified</p>
              <p className="text-xl font-semibold">{metrics.modificationPercentage}%</p>
            </div>
            {metrics.sentencesModified !== undefined && metrics.totalSentences !== undefined && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sentences</p>
                <p className="text-xl font-semibold">
                  {metrics.sentencesModified}/{metrics.totalSentences}
                </p>
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* Analysis Tools Panel */}
      {(humanizedText || originalText) && (
        <div className="mt-4 card p-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
            <button
              onClick={() => setActiveAnalysisTab('detection')}
              className={`btn btn-sm flex items-center gap-2 transition-all ${
                activeAnalysisTab === 'detection'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
              aria-pressed={activeAnalysisTab === 'detection'}
            >
              <Shield className="w-4 h-4" />
              Detection
            </button>
            <button
              onClick={() => setActiveAnalysisTab('plagiarism')}
              className={`btn btn-sm flex items-center gap-2 transition-all ${
                activeAnalysisTab === 'plagiarism'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
              aria-pressed={activeAnalysisTab === 'plagiarism'}
            >
              <FileSearch className="w-4 h-4" />
              Plagiarism
            </button>
            <button
              onClick={() => setActiveAnalysisTab('seo')}
              className={`btn btn-sm flex items-center gap-2 transition-all ${
                activeAnalysisTab === 'seo'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
              aria-pressed={activeAnalysisTab === 'seo'}
            >
              <Target className="w-4 h-4" />
              SEO
            </button>
            <button
              onClick={() => setActiveAnalysisTab('citations')}
              className={`btn btn-sm flex items-center gap-2 transition-all ${
                activeAnalysisTab === 'citations'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
              aria-pressed={activeAnalysisTab === 'citations'}
            >
              <BookOpen className="w-4 h-4" />
              Citations
            </button>
            <button
              onClick={() => setActiveAnalysisTab('variations')}
              className={`btn btn-sm flex items-center gap-2 transition-all ${
                activeAnalysisTab === 'variations'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
              aria-pressed={activeAnalysisTab === 'variations'}
            >
              <GitBranch className="w-4 h-4" />
              A/B Test
            </button>
            <button
              onClick={() => setActiveAnalysisTab('tone')}
              className={`btn btn-sm flex items-center gap-2 transition-all ${
                activeAnalysisTab === 'tone'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
              aria-pressed={activeAnalysisTab === 'tone'}
            >
              <Volume2 className="w-4 h-4" />
              Tone
            </button>
          </div>

          {/* Detection Tab */}
          {activeAnalysisTab === 'detection' && (
            <div>
              <button
                onClick={handleTestDetection}
                disabled={detectAIMutation.isPending || !humanizedText}
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Test AI detection on humanized text"
              >
                {detectAIMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Test AI Detection
                  </>
                )}
              </button>
              {detectionResults && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {detectionResults.overallPassed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      detectionResults.overallPassed 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {detectionResults.overallPassed ? 'PASSED' : 'FAILED'} - {detectionResults.averageScore.toFixed(1)}%
                    </span>
                  </div>
                  {detectionResults.results.map((result) => (
                    <div key={result.provider} className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700">
                      <span className="capitalize">{result.provider}</span>
                      <span className={result.passed ? 'text-green-600' : 'text-red-600'}>{result.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plagiarism Tab */}
          {activeAnalysisTab === 'plagiarism' && (
            <div>
              <button
                onClick={handleCheckPlagiarism}
                disabled={isAnalyzing || !humanizedText}
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Check plagiarism in humanized text"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4" />
                    Check Plagiarism
                  </>
                )}
              </button>
              {plagiarismResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Originality Score</span>
                    <span className={`text-xl font-bold ${plagiarismResult.originalityScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                      {plagiarismResult.originalityScore}%
                    </span>
                  </div>
                  {plagiarismResult.matches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Matches ({plagiarismResult.totalMatches}):</p>
                      {plagiarismResult.matches.slice(0, 3).map((match, i) => (
                        <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                          <p className="text-red-700 dark:text-red-300 truncate">"{match.text}"</p>
                          <p className="text-xs text-gray-500">{match.source} - {match.similarity}%</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SEO Tab */}
          {activeAnalysisTab === 'seo' && (
            <div>
              <button
                onClick={handleAnalyzeSEO}
                disabled={isAnalyzing || (!humanizedText && !originalText)}
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    Analyze SEO Keywords
                  </>
                )}
              </button>
              {seoResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Word Count</span>
                    <span className="font-bold">{seoResult.wordCount}</span>
                  </div>
                  {seoResult.keywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Keywords Found:</p>
                      <div className="flex flex-wrap gap-2">
                        {seoResult.keywords.slice(0, 10).map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-sm">
                            {kw.term} ({kw.originalCount}x)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Citations Tab */}
          {activeAnalysisTab === 'citations' && (
            <div>
              <button
                onClick={handleDetectCitations}
                disabled={isAnalyzing || (!humanizedText && !originalText)}
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    Detect Citations
                  </>
                )}
              </button>
              {citationResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Format Detected</span>
                    <span className="font-bold">{citationResult.primaryFormat || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Confidence</span>
                    <span className="font-bold">{Math.round(citationResult.confidence * 100)}%</span>
                  </div>
                  {citationResult.citations.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-2">Citations ({citationResult.citations.length}):</p>
                      <div className="space-y-2">
                        {citationResult.citations.slice(0, 5).map((cit, i) => (
                          <div key={i} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                            <p className="text-blue-700 dark:text-blue-300">{cit.text}</p>
                            <p className="text-xs text-gray-500">{cit.format} - {cit.type}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No citations detected</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Variations / A/B Testing Tab */}
          {activeAnalysisTab === 'variations' && (
            <div>
              <button
                onClick={handleGenerateVariations}
                disabled={isGeneratingVariations || !originalText}
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4"
              >
                {isGeneratingVariations ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    Generate Variations
                  </>
                )}
              </button>
              {variations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Generated Variations ({variations.length}):</p>
                  {variations.map((variation) => (
                    <div key={variation.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {variation.strategy} (Level {variation.level})
                        </span>
                        <span className={`text-sm ${variation.detectionScore < 30 ? 'text-green-600' : 'text-amber-600'}`}>
                          {variation.detectionScore}% AI
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                        {variation.text.substring(0, 200)}...
                      </p>
                      <button
                        onClick={() => handleSelectVariation(variation.text)}
                        className="btn btn-sm btn-outline w-full"
                      >
                        Use This Variation
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tone Analysis Tab */}
          {activeAnalysisTab === 'tone' && (
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setToneMode('analyze'); handleAnalyzeTone(); }}
                  disabled={isToneAnalyzing}
                  className={`btn btn-sm ${toneMode === 'analyze' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Analyze Tone
                </button>
                <button
                  onClick={() => { setToneMode('emotions'); handleDetectEmotions(); }}
                  disabled={isToneAnalyzing}
                  className={`btn btn-sm ${toneMode === 'emotions' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Detect Emotions
                </button>
                <button
                  onClick={() => setToneMode('adjust')}
                  className={`btn btn-sm ${toneMode === 'adjust' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Adjust Tone
                </button>
                <button
                  onClick={() => setToneMode('target')}
                  className={`btn btn-sm ${toneMode === 'target' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Target Tone
                </button>
                <button
                  onClick={() => setToneMode('consistency')}
                  className={`btn btn-sm ${toneMode === 'consistency' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Check Consistency
                </button>
              </div>

              {isToneAnalyzing && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing tone...</span>
                </div>
              )}

              {/* Analyze Tone Results */}
              {toneMode === 'analyze' && toneAnalysisResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span className="font-medium">Overall Sentiment</span>
                    <span className={`font-bold capitalize ${
                      toneAnalysisResult.overallSentiment === 'positive' ? 'text-green-600' :
                      toneAnalysisResult.overallSentiment === 'negative' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {toneAnalysisResult.overallSentiment}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Sentiment Score</p>
                      <p className="text-xl font-bold">{toneAnalysisResult.sentimentScore.toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                      <p className="text-xl font-bold">{(toneAnalysisResult.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Formality</p>
                      <p className="text-xl font-bold">{(toneAnalysisResult.formality * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Subjectivity</p>
                      <p className="text-xl font-bold">{(toneAnalysisResult.subjectivity * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  {Object.keys(toneAnalysisResult.emotions).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Emotions Detected:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(toneAnalysisResult.emotions)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([emotion, score]) => (
                            <span key={emotion} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-sm">
                              {emotion}: {(score * 100).toFixed(0)}%
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Emotions Results */}
              {toneMode === 'emotions' && emotionsResult && (
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dominant Emotion</p>
                    <p className="text-xl font-bold capitalize">{emotionsResult.dominantEmotion}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Emotional Intensity</p>
                    <p className="text-xl font-bold">{(emotionsResult.emotionalIntensity * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">All Emotions:</p>
                    <div className="space-y-2">
                      {Object.entries(emotionsResult.emotions)
                        .sort(([, a], [, b]) => b - a)
                        .map(([emotion, score]) => (
                          <div key={emotion} className="flex items-center justify-between">
                            <span className="capitalize text-sm">{emotion}</span>
                            <div className="flex items-center gap-2 flex-1 mx-3">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full"
                                  style={{ width: `${score * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{(score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Adjust Tone */}
              {toneMode === 'adjust' && (
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium mb-1 block">Sentiment</span>
                      <select
                        id="adjust-sentiment"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        defaultValue=""
                      >
                        <option value="">Keep current</option>
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium mb-1 block">Formality (0-1)</span>
                      <input
                        type="number"
                        id="adjust-formality"
                        min="0"
                        max="1"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="0.0 - 1.0"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium mb-1 block">Emotion</span>
                      <input
                        type="text"
                        id="adjust-emotion"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="e.g., joyful, serious, friendly"
                      />
                    </label>
                    <button
                      onClick={() => {
                        const sentiment = (document.getElementById('adjust-sentiment') as HTMLSelectElement).value;
                        const formality = (document.getElementById('adjust-formality') as HTMLInputElement).value;
                        const emotion = (document.getElementById('adjust-emotion') as HTMLInputElement).value;
                        handleAdjustTone({
                          sentiment: sentiment ? sentiment as 'positive' | 'neutral' | 'negative' : undefined,
                          formality: formality ? parseFloat(formality) : undefined,
                          emotion: emotion || undefined,
                        });
                      }}
                      disabled={isToneAnalyzing}
                      className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Adjust tone of text"
                    >
                      {isToneAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adjusting...
                        </>
                      ) : (
                        'Adjust Tone'
                      )}
                    </button>
                  </div>
                  {adjustedText && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Adjusted Text:</p>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{adjustedText}</p>
                      </div>
                      {toneAdjustmentChanges.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Changes Made:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {toneAdjustmentChanges.map((change, i) => (
                              <li key={i}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setHumanizedText(adjustedText);
                          setAdjustedText(null);
                        }}
                        className="btn btn-sm btn-outline w-full"
                      >
                        Use Adjusted Text
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Target Tone */}
              {toneMode === 'target' && (
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium mb-1 block">Target Sentiment *</span>
                      <select
                        id="target-sentiment"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        defaultValue="neutral"
                      >
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium mb-1 block">Target Formality (0-1) *</span>
                      <input
                        type="number"
                        id="target-formality"
                        min="0"
                        max="1"
                        step="0.1"
                        defaultValue="0.5"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium mb-1 block">Target Emotion *</span>
                      <input
                        type="text"
                        id="target-emotion"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="e.g., joyful, serious, friendly"
                        defaultValue="neutral"
                      />
                    </label>
                    <button
                      onClick={() => {
                        const sentiment = (document.getElementById('target-sentiment') as HTMLSelectElement).value;
                        const formality = (document.getElementById('target-formality') as HTMLInputElement).value;
                        const emotion = (document.getElementById('target-emotion') as HTMLInputElement).value;
                        handleTargetTone({
                          sentiment: sentiment as 'positive' | 'neutral' | 'negative',
                          formality: parseFloat(formality),
                          emotion: emotion,
                        });
                      }}
                      disabled={isToneAnalyzing}
                      className="btn btn-primary w-full"
                    >
                      Target Tone
                    </button>
                  </div>
                  {targetedText && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Targeted Text:</p>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{targetedText}</p>
                      </div>
                      {targetAdjustments.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Adjustments Made:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {targetAdjustments.map((adjustment, i) => (
                              <li key={i}>{adjustment}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setHumanizedText(targetedText);
                          setTargetedText(null);
                        }}
                        className="btn btn-sm btn-outline w-full"
                      >
                        Use Targeted Text
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Consistency Check */}
              {toneMode === 'consistency' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter multiple texts (one per line) to check tone consistency:
                  </p>
                  <textarea
                    id="consistency-texts"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[100px]"
                    placeholder="Text 1&#10;Text 2&#10;Text 3..."
                  />
                  <button
                    onClick={() => {
                      const textarea = document.getElementById('consistency-texts') as HTMLTextAreaElement;
                      const texts = textarea.value.split('\n').filter(t => t.trim());
                      handleCheckToneConsistency(texts);
                    }}
                    disabled={isToneAnalyzing}
                    className="btn btn-primary w-full"
                  >
                    Check Consistency
                  </button>
                  {consistencyResult && (
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Consistency Score</p>
                        <p className={`text-2xl font-bold ${
                          consistencyResult.consistencyScore >= 0.7 ? 'text-green-600' :
                          consistencyResult.consistencyScore >= 0.5 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {(consistencyResult.consistencyScore * 100).toFixed(0)}%
                        </p>
                      </div>
                      {consistencyResult.inconsistencies.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Inconsistencies Found:</p>
                          <div className="space-y-2">
                            {consistencyResult.inconsistencies.map((inc, i) => (
                              <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                                <p className="font-medium">Text #{inc.textIndex + 1}</p>
                                <p className="text-gray-600 dark:text-gray-400">{inc.issue}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Branch Manager Modal */}
      {showBranchManager && id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Branch Management</h2>
              <button
                onClick={() => setShowBranchManager(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <BranchManager
                projectId={id}
                currentBranchId={currentBranchId}
                onBranchSwitch={(branchId) => {
                  setCurrentBranchId(branchId);
                  // Reload project content for new branch
                  window.location.reload();
                }}
                onClose={() => setShowBranchManager(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Collaborator Manager Modal */}
      {showCollaboratorManager && id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Collaborator Management</h2>
              <button
                onClick={() => setShowCollaboratorManager(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <CollaboratorManager
                projectId={id}
                projectName={projectName}
                onClose={() => setShowCollaboratorManager(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Activity Log</h2>
              <button
                onClick={() => setShowActivityLog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading activity log...</span>
                </div>
              ) : activityLog.length > 0 ? (
                <div className="space-y-3">
                  {activityLog.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {activity.userName || activity.userEmail}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded text-xs font-medium capitalize">
                              {activity.action.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          </div>
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {Object.entries(activity.details).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                          {new Date(activity.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
