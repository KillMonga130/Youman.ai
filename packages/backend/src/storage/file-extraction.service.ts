/**
 * File Extraction Service
 * Extracts text content from various file formats (DOCX, PDF, TXT, EPUB)
 */

import { logger } from '../utils/logger';

export interface FileExtractionResult {
  content: string;
  wordCount: number;
  characterCount: number;
  format: 'docx' | 'pdf' | 'txt' | 'epub';
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
  };
}

/**
 * Extract text from a file buffer
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<FileExtractionResult> {
  const extension = getFileExtension(filename, mimeType);
  
  switch (extension) {
    case 'txt':
      return extractFromTxt(fileBuffer);
    case 'docx':
      return extractFromDocx(fileBuffer);
    case 'pdf':
      return extractFromPdf(fileBuffer);
    case 'epub':
      return extractFromEpub(fileBuffer);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

/**
 * Get file extension from filename or mime type
 */
function getFileExtension(filename: string, mimeType?: string): 'docx' | 'pdf' | 'txt' | 'epub' {
  const lowerFilename = filename.toLowerCase();
  
  // Check filename extension first
  if (lowerFilename.endsWith('.docx')) return 'docx';
  if (lowerFilename.endsWith('.pdf')) return 'pdf';
  if (lowerFilename.endsWith('.txt') || lowerFilename.endsWith('.text')) return 'txt';
  if (lowerFilename.endsWith('.epub')) return 'epub';
  
  // Check mime type
  if (mimeType) {
    if (mimeType.includes('wordprocessingml') || mimeType.includes('officedocument')) return 'docx';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('text/plain') || mimeType.includes('text/')) return 'txt';
    if (mimeType.includes('epub')) return 'epub';
  }
  
  // Default to txt if unknown
  logger.warn(`Unknown file format for ${filename}, defaulting to txt`);
  return 'txt';
}

/**
 * Extract text from TXT file
 */
async function extractFromTxt(fileBuffer: Buffer): Promise<FileExtractionResult> {
  const content = fileBuffer.toString('utf-8');
  return {
    content,
    wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
    characterCount: content.length,
    format: 'txt',
  };
}

/**
 * Extract text from DOCX file
 * DOCX is a ZIP archive containing XML files
 */
async function extractFromDocx(fileBuffer: Buffer): Promise<FileExtractionResult> {
  try {
    let AdmZip;
    try {
      AdmZip = require('adm-zip');
    } catch {
      throw new Error('DOCX parsing requires adm-zip package. Please install: npm install adm-zip');
    }
    
    const zip = new AdmZip(fileBuffer);
    const documentXml = zip.readAsText('word/document.xml');
    
    // Extract text from XML (simple regex approach)
    // Remove XML tags and decode entities
    let content = documentXml
      .replace(/<[^>]+>/g, ' ') // Remove XML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    // If extraction failed, try reading as plain text (fallback)
    if (!content || content.length < 10) {
      logger.warn('DOCX extraction may have failed, trying fallback');
      content = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ').trim();
    }
    
    return {
      content,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: content.length,
      format: 'docx',
    };
  } catch (error) {
    logger.error('Failed to extract DOCX:', error);
    throw new Error('Failed to extract text from DOCX file. Please ensure the file is not corrupted.');
  }
}

/**
 * Extract text from PDF file
 * For production, use 'pdf-parse' or 'pdfjs-dist'
 */
async function extractFromPdf(fileBuffer: Buffer): Promise<FileExtractionResult> {
  try {
    // Try using pdf-parse if available, otherwise fallback
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      throw new Error('PDF parsing library not available. Please install pdf-parse: npm install pdf-parse');
    }
    
    const data = await pdfParse(fileBuffer);
    const content = data.text || '';
    
    return {
      content,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: content.length,
      format: 'pdf',
      metadata: {
        pages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
      },
    };
  } catch (error) {
    logger.error('Failed to extract PDF:', error);
    throw new Error('Failed to extract text from PDF file. Please ensure the file is not corrupted or password-protected.');
  }
}

/**
 * Extract text from EPUB file
 * EPUB is a ZIP archive containing HTML/XHTML files
 */
async function extractFromEpub(fileBuffer: Buffer): Promise<FileExtractionResult> {
  try {
    let AdmZip;
    try {
      AdmZip = require('adm-zip');
    } catch {
      throw new Error('EPUB parsing requires adm-zip package. Please install: npm install adm-zip');
    }
    
    const zip = new AdmZip(fileBuffer);
    const containerXml = zip.readAsText('META-INF/container.xml');
    
    // Extract rootfile path from container.xml
    const rootfileMatch = containerXml.match(/rootfile[^>]+full-path="([^"]+)"/);
    if (!rootfileMatch) {
      throw new Error('Invalid EPUB structure: container.xml not found');
    }
    
    const rootfilePath = rootfileMatch[1];
    const opfContent = zip.readAsText(rootfilePath);
    
    // Extract all HTML/XHTML files from manifest
    const manifestMatch = opfContent.match(/<manifest[^>]*>([\s\S]*?)<\/manifest>/);
    if (!manifestMatch) {
      throw new Error('Invalid EPUB structure: manifest not found');
    }
    
    const manifest = manifestMatch[1];
    const itemMatches = manifest.matchAll(/<item[^>]+href="([^"]+)"[^>]*media-type="(?:text\/html|application\/xhtml\+xml)"/g);
    
    const basePath = rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1);
    const textParts: string[] = [];
    
    for (const match of itemMatches) {
      const href = match[1];
      const fullPath = basePath + href;
      try {
        const htmlContent = zip.readAsText(fullPath);
        // Extract text from HTML (simple approach)
        const text = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        textParts.push(text);
      } catch (err) {
        logger.warn(`Failed to extract from ${fullPath}:`, err);
      }
    }
    
    const content = textParts.join('\n\n');
    
    return {
      content,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: content.length,
      format: 'epub',
    };
  } catch (error) {
    logger.error('Failed to extract EPUB:', error);
    throw new Error('Failed to extract text from EPUB file. Please ensure the file is not corrupted.');
  }
}

