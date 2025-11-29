/**
 * Protected Segments Component
 * Allows users to mark text segments as protected (won't be humanized)
 */

import { useState, useCallback, useMemo } from 'react';
import { Shield, ShieldOff, Eye, EyeOff } from 'lucide-react';
import { Button } from './Button';
import { Alert } from './Alert';

export interface ProtectedSegment {
  startIndex: number;
  endIndex: number;
  content: string;
  openDelimiter: string;
  closeDelimiter: string;
}

interface ProtectedSegmentsProps {
  text: string;
  onTextChange: (text: string) => void;
  protectedSegments?: ProtectedSegment[];
  onProtectedSegmentsChange?: (segments: ProtectedSegment[]) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

const DELIMITER_OPTIONS = [
  { open: '[[', close: ']]', label: 'Double Brackets [[...]]' },
  { open: '{{', close: '}}', label: 'Double Braces {{...}}' },
  { open: '<<', close: '>>', label: 'Angle Brackets <<...>>' },
  { open: '[PROTECT]', close: '[/PROTECT]', label: 'Tags [PROTECT]...[/PROTECT]' },
];

export function ProtectedSegments({
  text,
  onTextChange,
  protectedSegments = [],
  onProtectedSegmentsChange,
  textareaRef,
}: ProtectedSegmentsProps): JSX.Element {
  const [selectedDelimiter, setSelectedDelimiter] = useState(DELIMITER_OPTIONS[0]);
  const [showProtected, setShowProtected] = useState(true);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  // Check for text selection periodically
  useEffect(() => {
    const checkSelection = () => {
      if (textareaRef?.current) {
        const textarea = textareaRef.current;
        if (textarea.selectionStart !== textarea.selectionEnd) {
          setSelection({
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
          });
        } else if (selection && textarea.selectionStart === textarea.selectionEnd) {
          // Clear selection if user deselected
          setSelection(null);
        }
      }
    };

    const interval = setInterval(checkSelection, 100);
    return () => clearInterval(interval);
  }, [textareaRef, selection]);

  // Parse protected segments from text
  const parsedSegments = useMemo(() => {
    const segments: ProtectedSegment[] = [];
    
    for (const delimiter of DELIMITER_OPTIONS) {
      let searchIndex = 0;
      while (true) {
        const openIndex = text.indexOf(delimiter.open, searchIndex);
        if (openIndex === -1) break;
        
        const closeIndex = text.indexOf(delimiter.close, openIndex + delimiter.open.length);
        if (closeIndex === -1) break;
        
        const content = text.substring(openIndex + delimiter.open.length, closeIndex);
        segments.push({
          startIndex: openIndex,
          endIndex: closeIndex + delimiter.close.length,
          content,
          openDelimiter: delimiter.open,
          closeDelimiter: delimiter.close,
        });
        
        searchIndex = closeIndex + delimiter.close.length;
      }
    }
    
    // Sort by start index
    segments.sort((a, b) => a.startIndex - b.startIndex);
    return segments;
  }, [text]);

  // Get text with protected segments highlighted
  const getDisplayText = useCallback(() => {
    if (!showProtected) return text;
    
    let displayText = text;
    let offset = 0;
    
    // Replace protected segments with highlighted version
    for (const segment of parsedSegments) {
      const start = segment.startIndex + offset;
      const end = segment.endIndex + offset;
      const before = displayText.substring(0, start);
      const after = displayText.substring(end);
      const protectedContent = displayText.substring(start, end);
      
      displayText = before + protectedContent + after;
    }
    
    return displayText;
  }, [text, parsedSegments, showProtected]);

  // Mark selected text as protected
  const handleProtectSelection = useCallback(() => {
    if (!selection) return;
    
    const selectedText = text.substring(selection.start, selection.end);
    if (!selectedText.trim()) return;
    
    const protectedText = `${selectedDelimiter.open}${selectedText}${selectedDelimiter.close}`;
    const newText = 
      text.substring(0, selection.start) + 
      protectedText + 
      text.substring(selection.end);
    
    onTextChange(newText);
    setSelection(null);
  }, [selection, selectedDelimiter, text, onTextChange]);

  // Remove protection from a segment
  const handleRemoveProtection = useCallback((segment: ProtectedSegment) => {
    const newText = 
      text.substring(0, segment.startIndex) + 
      segment.content + 
      text.substring(segment.endIndex);
    
    onTextChange(newText);
  }, [text, onTextChange]);

  // Handle text selection in textarea
  const handleTextSelection = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    if (start !== end) {
      setSelection({ start, end });
    } else {
      setSelection(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Protected Segments</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({parsedSegments.length} protected)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProtected(!showProtected)}
            title={showProtected ? 'Hide protected segments' : 'Show protected segments'}
          >
            {showProtected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {parsedSegments.length > 0 && (
        <Alert variant="info" className="text-sm">
          <Shield className="w-4 h-4" />
          <div>
            <p className="font-medium">Protected segments will not be humanized</p>
            <p className="text-xs mt-1">
              These {parsedSegments.length} segment{parsedSegments.length !== 1 ? 's' : ''} will remain unchanged during humanization.
            </p>
          </div>
        </Alert>
      )}

      {selection && (
        <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Selected text ({selection.end - selection.start} characters)
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelection(null)}
            >
              Cancel
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1 block">
                Delimiter style:
              </label>
              <select
                value={DELIMITER_OPTIONS.findIndex(d => d.open === selectedDelimiter.open)}
                onChange={(e) => setSelectedDelimiter(DELIMITER_OPTIONS[Number(e.target.value)])}
                className="input text-sm w-full"
              >
                {DELIMITER_OPTIONS.map((delimiter, index) => (
                  <option key={index} value={index}>
                    {delimiter.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleProtectSelection}
                className="flex-1"
              >
                <Shield className="w-4 h-4" />
                Protect Selection
              </Button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Preview: {selectedDelimiter.open}
              <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                {text.substring(selection.start, selection.end).substring(0, 30)}
                {selection.end - selection.start > 30 ? '...' : ''}
              </span>
              {selectedDelimiter.close}
            </p>
          </div>
        </div>
      )}

      {parsedSegments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Protected Segments:
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {parsedSegments.map((segment, index) => (
              <div
                key={index}
                className="card p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-800 dark:text-amber-200 mb-1">
                      {segment.openDelimiter}...{segment.closeDelimiter}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                      {segment.content.substring(0, 100)}
                      {segment.content.length > 100 ? '...' : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Position: {segment.startIndex} - {segment.endIndex} ({segment.content.length} chars)
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProtection(segment)}
                    title="Remove protection"
                  >
                    <ShieldOff className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedSegments.length === 0 && !selection && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No protected segments</p>
          <p className="text-xs mt-1">
            Select text in the editor and click "Protect Selection" to mark it as protected
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p className="font-medium">How to use:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Select text in the editor above</li>
          <li>Choose a delimiter style</li>
          <li>Click "Protect Selection" to mark it as protected</li>
          <li>Protected text will not be humanized</li>
        </ul>
      </div>
    </div>
  );
}

