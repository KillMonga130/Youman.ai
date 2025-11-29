import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, File, X, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from './Progress';

/** Supported file formats */
export type SupportedFormat = 'docx' | 'pdf' | 'txt' | 'epub';

/** File upload status */
export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

/** Uploaded file info */
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  format: SupportedFormat;
  status: UploadStatus;
  progress: number;
  content?: string;
  error?: string;
  startTime?: number;
  fileObject?: File; // Store the actual File object for upload
}

export interface FileUploadProps {
  /** Callback when files are uploaded */
  onFilesUploaded?: (files: UploadedFile[]) => void;
  /** Callback when file content is extracted */
  onContentExtracted?: (content: string, file: UploadedFile) => void;
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number;
  /** Maximum number of files (default: 10) */
  maxFiles?: number;
  /** Accepted formats (default: all supported) */
  acceptedFormats?: SupportedFormat[];
  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/** MIME types for supported formats */
const FORMAT_MIME_TYPES: Record<SupportedFormat, string[]> = {
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  pdf: ['application/pdf'],
  txt: ['text/plain'],
  epub: ['application/epub+zip'],
};

/** File extensions for supported formats */
const FORMAT_EXTENSIONS: Record<SupportedFormat, string> = {
  docx: '.docx',
  pdf: '.pdf',
  txt: '.txt',
  epub: '.epub',
};

/** Format display names */
const FORMAT_NAMES: Record<SupportedFormat, string> = {
  docx: 'Word Document',
  pdf: 'PDF',
  txt: 'Plain Text',
  epub: 'EPUB',
};

/** Generate unique ID */
function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Format file size for display */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Get format from file name */
function getFormatFromFile(file: File): SupportedFormat | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ext in FORMAT_EXTENSIONS) {
    return ext as SupportedFormat;
  }
  return null;
}

/** Estimate remaining time */
function estimateRemainingTime(progress: number, startTime: number): string {
  if (progress <= 0 || progress >= 100) return '';
  const elapsed = Date.now() - startTime;
  const estimated = (elapsed / progress) * (100 - progress);
  const seconds = Math.ceil(estimated / 1000);
  if (seconds < 60) return `${seconds}s remaining`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m remaining`;
}


/**
 * FileUpload component with drag-and-drop support
 * - Supports DOCX, PDF, TXT, EPUB formats
 * - Progress bar with time estimation
 * - Download buttons for multiple formats
 * - WCAG AAA accessible
 */
export function FileUpload({
  onFilesUploaded,
  onContentExtracted,
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  acceptedFormats = ['docx', 'pdf', 'txt', 'epub'],
  className = '',
  disabled = false,
}: FileUploadProps): JSX.Element {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const uploadIntervalRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Build accept object for dropzone
  const accept = acceptedFormats.reduce(
    (acc, format) => {
      FORMAT_MIME_TYPES[format].forEach((mime) => {
        if (!acc[mime]) acc[mime] = [];
        acc[mime].push(FORMAT_EXTENSIONS[format]);
      });
      return acc;
    },
    {} as Record<string, string[]>
  );

  // Real file upload with extraction
  const uploadFile = useCallback(
    async (file: UploadedFile, fileObject: File) => {
      const startTime = Date.now();
      
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? { ...f, progress: 0, status: 'uploading', startTime }
            : f
        )
      );

      try {
        // Import API client
        const { apiClient } = await import('../../api/client');
        
        // Simulate upload progress (since we can't track actual upload progress easily)
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === file.id && f.progress < 90) {
                return { ...f, progress: Math.min(f.progress + 10, 90) };
              }
              return f;
            })
          );
        }, 200);

        // Extract file content
        const result = await apiClient.extractFile(fileObject);
        
        clearInterval(progressInterval);

        // Update to processing
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, progress: 95, status: 'processing' }
              : f
          )
        );

        // Small delay to show processing state
        await new Promise(resolve => setTimeout(resolve, 300));

        // Update to complete
        const extractedContent = result.data.content;
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, progress: 100, status: 'complete', content: extractedContent }
              : f
          )
        );

        onContentExtracted?.(extractedContent, { 
          ...file, 
          status: 'complete', 
          content: extractedContent 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to extract file content';
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: 'error', error: errorMessage, progress: 0 }
              : f
          )
        );
      }
    },
    [onContentExtracted]
  );

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: generateId(),
        name: file.name,
        size: file.size,
        format: getFormatFromFile(file) || 'txt',
        fileObject: file, // Store the actual File object
        status: 'uploading' as UploadStatus,
        progress: 0,
        startTime: Date.now(),
      }));

      // Add rejected files with error status
      const rejectedUploadFiles: UploadedFile[] = rejectedFiles.map((rejection) => ({
        id: generateId(),
        name: rejection.file.name,
        size: rejection.file.size,
        format: getFormatFromFile(rejection.file) || 'txt',
        status: 'error' as UploadStatus,
        progress: 0,
        error: rejection.errors[0]?.message || 'File rejected',
      }));

      const allNewFiles = [...newFiles, ...rejectedUploadFiles];
      setFiles((prev) => [...prev, ...allNewFiles]);
      onFilesUploaded?.(allNewFiles);

      // Start real upload for accepted files
      newFiles.forEach((uploadedFile) => {
        if (uploadedFile.fileObject) {
          uploadFile(uploadedFile, uploadedFile.fileObject);
        }
      });
    },
    [onFilesUploaded, uploadFile]
  );

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(uploadIntervalRef.current).forEach(clearInterval);
    };
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    if (uploadIntervalRef.current[fileId]) {
      clearInterval(uploadIntervalRef.current[fileId]);
      delete uploadIntervalRef.current[fileId];
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Download file in specific format
  const downloadFile = useCallback((file: UploadedFile, format: SupportedFormat) => {
    if (!file.content) return;
    
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const acceptedFormatsText = acceptedFormats.map((f) => FORMAT_EXTENSIONS[f].toUpperCase()).join(', ');

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive || dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        role="button"
        aria-label="Upload files by clicking or dragging"
        tabIndex={disabled ? -1 : 0}
      >
        <input {...getInputProps()} aria-label="File input" />
        
        <Upload
          className={`
            w-12 h-12 mx-auto mb-4 transition-colors
            ${isDragActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}
          `}
        />
        
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          or click to browse
        </p>
        
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Supported formats: {acceptedFormatsText} • Max size: {formatFileSize(maxSize)}
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-3" role="list" aria-label="Uploaded files">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onRemove={() => removeFile(file.id)}
              onDownload={(format) => downloadFile(file, format)}
              acceptedFormats={acceptedFormats}
            />
          ))}
        </div>
      )}
    </div>
  );
}


/** File item component */
interface FileItemProps {
  file: UploadedFile;
  onRemove: () => void;
  onDownload: (format: SupportedFormat) => void;
  acceptedFormats: SupportedFormat[];
}

function FileItem({ file, onRemove, onDownload, acceptedFormats }: FileItemProps): JSX.Element {
  const statusIcon = {
    idle: <File className="w-5 h-5 text-gray-400" />,
    uploading: <File className="w-5 h-5 text-primary-500 animate-pulse" />,
    processing: <File className="w-5 h-5 text-amber-500 animate-pulse" />,
    complete: <CheckCircle className="w-5 h-5 text-success-500" />,
    error: <AlertCircle className="w-5 h-5 text-error-500" />,
  };

  const statusText = {
    idle: 'Ready',
    uploading: 'Uploading...',
    processing: 'Processing...',
    complete: 'Complete',
    error: file.error || 'Error',
  };

  const remainingTime = file.status === 'uploading' && file.startTime
    ? estimateRemainingTime(file.progress, file.startTime)
    : '';

  return (
    <div
      className={`
        p-4 rounded-lg border transition-colors
        ${file.status === 'error'
          ? 'border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/20'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
        }
      `}
      role="listitem"
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 mt-0.5">
          {statusIcon[file.status]}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.name}
            </p>
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              aria-label={`Remove ${file.name}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{FORMAT_NAMES[file.format]}</span>
            <span>•</span>
            <span className={file.status === 'error' ? 'text-error-600 dark:text-error-400' : ''}>
              {statusText[file.status]}
            </span>
            {remainingTime && (
              <>
                <span>•</span>
                <span>{remainingTime}</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <div className="mt-3">
              <Progress
                value={file.progress}
                variant={file.status === 'processing' ? 'warning' : 'primary'}
                size="sm"
                animated={file.status === 'processing'}
              />
            </div>
          )}

          {/* Download buttons */}
          {file.status === 'complete' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">
                Download as:
              </span>
              {acceptedFormats.map((format) => (
                <button
                  key={format}
                  onClick={() => onDownload(format)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                    text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30
                    hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded transition-colors"
                  aria-label={`Download as ${FORMAT_NAMES[format]}`}
                >
                  <Download className="w-3 h-3" />
                  {FORMAT_EXTENSIONS[format].toUpperCase().slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
