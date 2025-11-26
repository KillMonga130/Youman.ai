/**
 * Protected Segment Parser
 * Identifies and parses protected segments in text that should not be transformed.
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { ProtectedSegment, ProtectedSegmentOptions } from './types';

/** Default delimiter pairs for protected segments */
const DEFAULT_DELIMITERS = [
  { open: '[[', close: ']]' },
  { open: '{{', close: '}}' },
  { open: '<<', close: '>>' },
  { open: '[PROTECT]', close: '[/PROTECT]' },
  { open: '<!--protect-->', close: '<!--/protect-->' },
];

/**
 * Parses protected segments from text
 * @param text - The text to parse
 * @param options - Parsing options including custom delimiters
 * @returns Array of protected segments found
 */
export function parseProtectedSegments(
  text: string,
  options?: ProtectedSegmentOptions
): ProtectedSegment[] {
  const delimiters = options?.delimiters || DEFAULT_DELIMITERS;
  const segments: ProtectedSegment[] = [];

  for (const delimiter of delimiters) {
    const found = findSegmentsWithDelimiter(text, delimiter.open, delimiter.close);
    segments.push(...found);
  }

  // Sort by start index and remove overlapping segments
  segments.sort((a, b) => a.startIndex - b.startIndex);
  return removeOverlappingSegments(segments);
}

/**
 * Finds all segments with a specific delimiter pair
 * @param text - The text to search
 * @param openDelimiter - Opening delimiter
 * @param closeDelimiter - Closing delimiter
 * @returns Array of found segments
 */
function findSegmentsWithDelimiter(
  text: string,
  openDelimiter: string,
  closeDelimiter: string
): ProtectedSegment[] {
  const segments: ProtectedSegment[] = [];
  let searchStart = 0;

  while (searchStart < text.length) {
    const openIndex = text.indexOf(openDelimiter, searchStart);
    if (openIndex === -1) break;

    const contentStart = openIndex + openDelimiter.length;
    const closeIndex = text.indexOf(closeDelimiter, contentStart);
    if (closeIndex === -1) break;

    const content = text.substring(contentStart, closeIndex);
    const original = text.substring(openIndex, closeIndex + closeDelimiter.length);

    segments.push({
      original,
      content,
      startIndex: openIndex,
      endIndex: closeIndex + closeDelimiter.length,
      openDelimiter,
      closeDelimiter,
    });

    searchStart = closeIndex + closeDelimiter.length;
  }

  return segments;
}


/**
 * Removes overlapping segments, keeping the first one found
 * @param segments - Array of segments sorted by start index
 * @returns Array with overlapping segments removed
 */
function removeOverlappingSegments(segments: ProtectedSegment[]): ProtectedSegment[] {
  if (segments.length <= 1) {
    return segments;
  }

  const firstSegment = segments[0];
  if (!firstSegment) {
    return [];
  }

  const result: ProtectedSegment[] = [firstSegment];

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const previous = result[result.length - 1];

    // Check if current segment overlaps with previous
    if (current && previous && current.startIndex >= previous.endIndex) {
      result.push(current);
    }
    // If overlapping, skip the current segment (keep the first one)
  }

  return result;
}

/**
 * Extracts text with protected segments replaced by placeholders
 * @param text - The original text
 * @param segments - Protected segments to replace
 * @returns Object with processed text and placeholder map
 */
export function extractWithPlaceholders(
  text: string,
  segments: ProtectedSegment[]
): {
  processedText: string;
  placeholderMap: Map<string, ProtectedSegment>;
} {
  const placeholderMap = new Map<string, ProtectedSegment>();
  let processedText = text;
  let offset = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    
    const placeholder = `__PROTECTED_${i}__`;
    placeholderMap.set(placeholder, segment);

    const adjustedStart = segment.startIndex - offset;
    const adjustedEnd = segment.endIndex - offset;

    processedText =
      processedText.substring(0, adjustedStart) +
      placeholder +
      processedText.substring(adjustedEnd);

    offset += segment.original.length - placeholder.length;
  }

  return { processedText, placeholderMap };
}

/**
 * Restores protected segments from placeholders
 * @param text - Text with placeholders
 * @param placeholderMap - Map of placeholders to segments
 * @returns Text with protected segments restored
 */
export function restoreProtectedSegments(
  text: string,
  placeholderMap: Map<string, ProtectedSegment>
): string {
  let restoredText = text;

  for (const [placeholder, segment] of placeholderMap) {
    restoredText = restoredText.replace(placeholder, segment.content);
  }

  return restoredText;
}

/**
 * Validates that protected segments are properly formatted
 * @param text - The text to validate
 * @param options - Parsing options
 * @returns Validation result
 */
export function validateProtectedSegments(
  text: string,
  options?: ProtectedSegmentOptions
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const delimiters = options?.delimiters || DEFAULT_DELIMITERS;
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const delimiter of delimiters) {
    const openCount = countOccurrences(text, delimiter.open);
    const closeCount = countOccurrences(text, delimiter.close);

    if (openCount !== closeCount) {
      errors.push(
        `Mismatched delimiters: found ${openCount} '${delimiter.open}' but ${closeCount} '${delimiter.close}'`
      );
    }
  }

  // Check for nested protected segments (warning)
  const segments = parseProtectedSegments(text, options);
  for (const segment of segments) {
    for (const delimiter of delimiters) {
      if (
        segment.content.includes(delimiter.open) ||
        segment.content.includes(delimiter.close)
      ) {
        warnings.push(
          `Nested delimiters found in protected segment at position ${segment.startIndex}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Counts occurrences of a substring in text
 * @param text - The text to search
 * @param substring - The substring to count
 * @returns Number of occurrences
 */
function countOccurrences(text: string, substring: string): number {
  let count = 0;
  let position = 0;

  while ((position = text.indexOf(substring, position)) !== -1) {
    count++;
    position += substring.length;
  }

  return count;
}

/**
 * Gets the default delimiter pairs
 * @returns Array of default delimiter pairs
 */
export function getDefaultDelimiters(): Array<{ open: string; close: string }> {
  return [...DEFAULT_DELIMITERS];
}
