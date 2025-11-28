import { useState, useCallback, useEffect } from 'react';
import { Wand2, Copy, Download, RotateCcw, ChevronDown, Shield, Upload, Save, AlertCircle, CheckCircle, XCircle, Loader2, FileSearch, Target, BookOpen, GitBranch } from 'lucide-react';
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

type Strategy = 'auto' | 'casual' | 'professional' | 'academic';
type AnalysisTab = 'detection' | 'plagiarism' | 'seo' | 'citations' | 'variations';

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
  
  // Branch management state
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>(undefined);

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
        } catch (error) {
          console.error('Failed to load project content:', error);
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

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(humanizedText);
  }, [humanizedText]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([humanizedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'humanized-text.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [humanizedText]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading project...</p>
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
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 glass-card rounded-2xl backdrop-blur-xl">
        {/* Project Name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project Name"
          className="input flex-1 min-w-[200px] max-w-[300px] bg-white/80 dark:bg-gray-800/80"
        />
        {/* Level selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Level:</label>
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
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Strategy:</label>
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

        {/* Action buttons */}
        <button
          onClick={() => setShowFileUpload(true)}
          className="btn btn-outline flex items-center gap-2"
          title="Upload File"
          >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
          <ShortcutHint shortcutId="upload" />
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-outline flex items-center gap-2"
          title="Save Project"
        >
          <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        <button
          onClick={handleReset}
          className="btn btn-outline flex items-center gap-2"
          disabled={!originalText && !humanizedText}
          title="Reset Editor"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
          <ShortcutHint shortcutId="reset" />
        </button>
        
        <button
          onClick={handleHumanize}
          disabled={!originalText.trim() || isProcessing}
          className="btn btn-primary flex items-center gap-2"
          title="Humanize Text"
        >
          <Wand2 className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Processing...' : 'Humanize'}
          <ShortcutHint shortcutId="humanize" />
        </button>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upload Document
              </h2>
              <button
                onClick={() => setShowFileUpload(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                aria-label="Close"
              >
                <span className="text-2xl leading-none">&times;</span>
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
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Original Text</h3>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">{wordCount} words</span>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste your AI-generated text here..."
            className="flex-1 p-6 resize-none bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 scrollbar-modern"
          />
        </div>

        {/* Humanized text */}
        <div className="card flex flex-col min-h-[300px] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-900/20">
            <h3 className="font-semibold text-gray-900 dark:text-white">Humanized Text</h3>
            <div className="flex items-center gap-2">
              {humanizedText && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="sr-only">Copy</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                    <span className="sr-only">Download</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {humanizedText ? (
              <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{humanizedText}</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                Humanized text will appear here...
              </p>
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
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                activeAnalysisTab === 'detection'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              Detection
            </button>
            <button
              onClick={() => setActiveAnalysisTab('plagiarism')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                activeAnalysisTab === 'plagiarism'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <FileSearch className="w-4 h-4" />
              Plagiarism
            </button>
            <button
              onClick={() => setActiveAnalysisTab('seo')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                activeAnalysisTab === 'seo'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Target className="w-4 h-4" />
              SEO
            </button>
            <button
              onClick={() => setActiveAnalysisTab('citations')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                activeAnalysisTab === 'citations'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Citations
            </button>
            <button
              onClick={() => setActiveAnalysisTab('variations')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                activeAnalysisTab === 'variations'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              A/B Test
            </button>
          </div>

          {/* Detection Tab */}
          {activeAnalysisTab === 'detection' && (
            <div>
              <button
                onClick={handleTestDetection}
                disabled={detectAIMutation.isPending || !humanizedText}
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4"
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
                className="btn btn-outline w-full flex items-center justify-center gap-2 mb-4"
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
    </div>
  );
}
