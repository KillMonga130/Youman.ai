/**
 * Document Structure Parser
 * Parses documents into hierarchical structures (chapters, paragraphs, sentences).
 * Requirements: 1.3, 1.6, 11.1
 */

import nlp from 'compromise';
import { DocumentStructure, StructureElement, StructureElementType } from './types';

/** Chapter heading patterns */
const CHAPTER_PATTERNS = [
  /^(chapter|part|section)\s+(\d+|[ivxlcdm]+)/i,
  /^(chapter|part|section)\s+\d+[.:]\s*/i,
  /^#{1,2}\s+(chapter|part|section)/i,
  /^#{1,2}\s+\d+[.:]/i,
];

/** Markdown heading pattern */
const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;

/** HTML heading pattern - used in parseHtmlStructure */
// const HTML_HEADING_PATTERN = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;

/**
 * Parses a document into its structural components
 * @param text - The document text to parse
 * @returns Parsed document structure
 */
export function parseDocument(text: string): DocumentStructure {
  const format = detectFormat(text);
  const elements: StructureElement[] = [];

  // Parse based on format
  if (format === 'markdown') {
    parseMarkdownStructure(text, elements);
  } else if (format === 'html') {
    parseHtmlStructure(text, elements);
  } else {
    parsePlainTextStructure(text, elements);
  }

  // Calculate counts
  const wordCount = countWords(text);
  const sentences = extractSentences(text);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chapters = elements.filter((e) => e.type === 'chapter');

  return {
    wordCount,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    chapterCount: chapters.length,
    elements,
    format,
  };
}


/**
 * Detects the format of the document
 * @param text - The document text
 * @returns Detected format
 */
function detectFormat(text: string): 'plain' | 'markdown' | 'html' {
  // Check for HTML tags
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return 'html';
  }

  // Check for markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headers
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /\[[^\]]+\]\([^)]+\)/, // Links
    /```[\s\S]*```/, // Code blocks
  ];

  for (const pattern of markdownPatterns) {
    if (pattern.test(text)) {
      return 'markdown';
    }
  }

  return 'plain';
}

/**
 * Parses markdown document structure
 */
function parseMarkdownStructure(text: string, elements: StructureElement[]): void {
  const lines = text.split('\n');
  let currentIndex = 0;

  for (const line of lines) {
    const headingMatch = line.match(MARKDOWN_HEADING_PATTERN);

    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      const isChapter = CHAPTER_PATTERNS.some((p) => p.test(line));

      elements.push({
        type: isChapter ? 'chapter' : 'heading',
        content,
        startIndex: currentIndex,
        endIndex: currentIndex + line.length,
        level,
      });
    } else if (line.trim().length > 0) {
      // Parse sentences within paragraphs
      const sentences = extractSentences(line);
      if (sentences.length > 0) {
        const lineStartIndex = currentIndex;
        const paragraphElement: StructureElement = {
          type: 'paragraph',
          content: line,
          startIndex: lineStartIndex,
          endIndex: lineStartIndex + line.length,
          children: sentences.map((s) => ({
            type: 'sentence' as StructureElementType,
            content: s,
            startIndex: lineStartIndex + line.indexOf(s),
            endIndex: lineStartIndex + line.indexOf(s) + s.length,
          })),
        };
        elements.push(paragraphElement);
      }
    }

    currentIndex += line.length + 1; // +1 for newline
  }
}

/**
 * Parses HTML document structure
 */
function parseHtmlStructure(text: string, elements: StructureElement[]): void {
  // Extract headings
  let match;
  const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;

  while ((match = headingRegex.exec(text)) !== null) {
    const levelStr = match[1];
    const contentStr = match[2];
    if (!levelStr || !contentStr) continue;
    
    const level = parseInt(levelStr, 10);
    const content = contentStr.trim();
    const isChapter = CHAPTER_PATTERNS.some((p) => p.test(content));
    const matchIndex = match.index;
    const matchLength = match[0].length;

    elements.push({
      type: isChapter ? 'chapter' : 'heading',
      content,
      startIndex: matchIndex,
      endIndex: matchIndex + matchLength,
      level,
    });
  }

  // Extract paragraphs
  const paragraphRegex = /<p[^>]*>([^<]+)<\/p>/gi;
  while ((match = paragraphRegex.exec(text)) !== null) {
    const contentMatch = match[1];
    if (!contentMatch) continue;
    
    const content = contentMatch.trim();
    const sentences = extractSentences(content);
    const pMatchIndex = match.index;
    const pMatchLength = match[0].length;

    elements.push({
      type: 'paragraph',
      content,
      startIndex: pMatchIndex,
      endIndex: pMatchIndex + pMatchLength,
      children: sentences.map((s) => ({
        type: 'sentence' as StructureElementType,
        content: s,
        startIndex: pMatchIndex + content.indexOf(s),
        endIndex: pMatchIndex + content.indexOf(s) + s.length,
      })),
    });
  }
}

/**
 * Parses plain text document structure
 */
function parsePlainTextStructure(text: string, elements: StructureElement[]): void {
  const paragraphs = text.split(/\n\s*\n/);
  let currentIndex = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      currentIndex += paragraph.length + 2; // +2 for double newline
      continue;
    }

    // Check if this is a chapter heading
    const isChapter = CHAPTER_PATTERNS.some((p) => p.test(paragraph.trim()));

    if (isChapter) {
      elements.push({
        type: 'chapter',
        content: paragraph.trim(),
        startIndex: currentIndex,
        endIndex: currentIndex + paragraph.length,
      });
    } else {
      // Parse as paragraph with sentences
      const sentences = extractSentences(paragraph);
      const paragraphStartIndex = currentIndex;
      const paragraphContent = paragraph;
      elements.push({
        type: 'paragraph',
        content: paragraphContent,
        startIndex: paragraphStartIndex,
        endIndex: paragraphStartIndex + paragraphContent.length,
        children: sentences.map((s) => ({
          type: 'sentence' as StructureElementType,
          content: s,
          startIndex: paragraphStartIndex + paragraphContent.indexOf(s),
          endIndex: paragraphStartIndex + paragraphContent.indexOf(s) + s.length,
        })),
      });
    }

    currentIndex += paragraph.length + 2;
  }
}

/**
 * Extracts sentences from text using NLP
 * @param text - The text to parse
 * @returns Array of sentences
 */
export function extractSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const doc = nlp(text);
  const sentences = doc.sentences().out('array') as string[];

  return sentences.filter((s) => s.trim().length > 0);
}

/**
 * Counts words in text
 * @param text - The text to count
 * @returns Word count
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  return text
    .split(/\s+/)
    .filter((word) => word.length > 0 && /\w/.test(word)).length;
}

/**
 * Extracts paragraphs from text
 * @param text - The text to parse
 * @returns Array of paragraphs
 */
export function extractParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}
