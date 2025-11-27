import { useState, useCallback } from 'react';
import { Wand2, Copy, Download, RotateCcw, ChevronDown, Shield, Upload } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAppStore } from '../store';
import { FileUpload, type UploadedFile } from '../components/ui';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';
import { ShortcutHint } from '../components/KeyboardShortcutsModal';

type Strategy = 'auto' | 'casual' | 'professional' | 'academic';

interface TransformOptions {
  level: number;
  strategy: Strategy;
  protectedSegments: string[];
}

export function Editor(): JSX.Element {
  const { originalText, setOriginalText, humanizedText, setHumanizedText, settings } = useAppStore();
  const { getShortcutKey, shortcutsEnabled } = useKeyboardShortcuts();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
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
  } | null>(null);

  // Handle file content extraction from upload
  const handleContentExtracted = useCallback((content: string, _file: UploadedFile) => {
    setOriginalText(content);
    setShowFileUpload(false);
  }, [setOriginalText]);

  const handleHumanize = useCallback(async () => {
    if (!originalText.trim()) return;
    
    setIsProcessing(true);
    try {
      // Simulate API call - in production, use the actual API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Mock transformation
      const transformed = originalText
        .replace(/\. /g, '. ')
        .replace(/However,/g, 'But')
        .replace(/Furthermore,/g, 'Also,')
        .replace(/In conclusion,/g, 'To wrap up,');
      
      setHumanizedText(transformed);
      setMetrics({
        detectionScore: Math.floor(Math.random() * 15) + 5,
        perplexity: Math.floor(Math.random() * 40) + 60,
        burstiness: Math.random() * 0.3 + 0.6,
        modificationPercentage: Math.floor(Math.random() * 30) + 20,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [originalText, setHumanizedText]);

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
  }, [setOriginalText, setHumanizedText]);

  const wordCount = originalText.trim() ? originalText.trim().split(/\s+/).length : 0;

  // Register editor-specific keyboard shortcuts
  useHotkeys(
    getShortcutKey('humanize'),
    (e) => {
      e.preventDefault();
      if (originalText.trim() && !isProcessing) {
        handleHumanize();
      }
    },
    { enabled: shortcutsEnabled, enableOnFormTags: true },
    [originalText, isProcessing, handleHumanize]
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 card">
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Original text */}
        <div className="card flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium">Original Text</h3>
            <span className="text-sm text-gray-500">{wordCount} words</span>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste your AI-generated text here..."
            className="flex-1 p-4 resize-none bg-transparent focus:outline-none text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Humanized text */}
        <div className="card flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium">Humanized Text</h3>
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
              <p className={`text-xl font-semibold ${metrics.detectionScore < 20 ? 'text-green-600' : 'text-amber-600'}`}>
                {metrics.detectionScore}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Perplexity</p>
              <p className="text-xl font-semibold">{metrics.perplexity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Burstiness</p>
              <p className="text-xl font-semibold">{metrics.burstiness.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modified</p>
              <p className="text-xl font-semibold">{metrics.modificationPercentage}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
