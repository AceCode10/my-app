/**
 * Multi-Layered Question Extraction Engine
 * 
 * This engine implements a 5-layer validation system for accurate question extraction:
 * 
 * Layer 1: Source Truth Extractor - Extract exact text with position markers
 * Layer 2: Structure Parser - Parse question numbers, parts, and hierarchy from patterns
 * Layer 3: Validation Engine - Compare extracted vs source, detect anomalies
 * Layer 4: Confidence Gate - Only approve when accuracy > 90%
 * Layer 5: Learning System - Store patterns and improve over time
 */

// Note: Supabase client will be passed in or created where needed
// import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface SourceQuestionMarker {
  /** Raw text position in the document */
  position: number;
  /** Page number where found */
  page: number;
  /** The exact text that indicates a question number */
  rawMarker: string;
  /** Parsed question number */
  questionNumber: number;
  /** Part label if present (a, b, c, etc.) */
  partLabel: string | null;
  /** Sub-part label if present (i, ii, iii, etc.) */
  subPartLabel: string | null;
  /** Confidence score for this detection (0-1) */
  confidence: number;
  /** The pattern that matched */
  matchedPattern: string;
}

export interface ExtractedQuestionBlock {
  /** Question number from source */
  questionNumber: number;
  /** Part label (a, b, c, etc.) */
  partLabel: string | null;
  /** Full part identifier for display (e.g., "a", "a(i)", "b(ii)") */
  fullPartLabel: string | null;
  /** The raw text from the PDF */
  rawText: string;
  /** Cleaned question text */
  cleanedText: string;
  /** Start position in source */
  startPosition: number;
  /** End position in source */
  endPosition: number;
  /** Detected marks */
  marks: number;
  /** Question type */
  questionType: 'mcq' | 'short_answer' | 'structured' | 'essay';
  /** MCQ options if applicable */
  options: Array<{ label: string; text: string }> | null;
  /** Whether this question requires an answer */
  needsAnswer: boolean;
  /** Extraction confidence (0-1) */
  confidence: number;
  /** Display order for sorting */
  displayOrder: number;
}

export interface ValidationResult {
  /** Overall validation passed */
  isValid: boolean;
  /** Overall confidence score (0-1) */
  overallConfidence: number;
  /** Individual validation checks */
  checks: ValidationCheck[];
  /** Anomalies detected */
  anomalies: Anomaly[];
  /** Suggested fixes */
  suggestedFixes: SuggestedFix[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  score: number;
  details: string;
}

export interface Anomaly {
  type: 'duplicate' | 'missing_number' | 'wrong_sequence' | 'marks_mismatch' | 'text_mismatch';
  severity: 'critical' | 'warning' | 'info';
  questionNumber: number;
  partLabel: string | null;
  description: string;
  suggestedFix?: string;
}

export interface SuggestedFix {
  questionIndex: number;
  field: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
  confidence: number;
}

export interface ExtractionReport {
  /** Timestamp of extraction */
  timestamp: string;
  /** Source document info */
  source: {
    filename: string;
    pageCount: number;
    textLength: number;
  };
  /** Extraction statistics */
  stats: {
    totalQuestionsFound: number;
    totalMarks: number;
    questionsWithParts: number;
    mcqCount: number;
    validationPassed: boolean;
    overallConfidence: number;
  };
  /** Validation result */
  validation: ValidationResult;
  /** Extracted questions */
  questions: ExtractedQuestionBlock[];
  /** Learning data for improvement */
  learningData: LearningRecord[];
}

export interface LearningRecord {
  pattern: string;
  success: boolean;
  context: string;
  correction?: string;
}

// ============================================
// LAYER 1: SOURCE TRUTH EXTRACTOR
// ============================================

/**
 * Extracts question markers directly from the source text
 * Preserves exact positions for validation
 * 
 * IMPORTANT: PDF text often comes without proper line breaks, so we use
 * multiple pattern strategies to find question markers.
 */
export function extractSourceMarkers(text: string): SourceQuestionMarker[] {
  const markers: SourceQuestionMarker[] = [];
  
  console.log('[SourceMarkers] Analyzing text structure...');
  console.log(`[SourceMarkers] Text length: ${text.length}, Line breaks: ${(text.match(/\n/g) || []).length}`);
  
  // Pattern definitions with confidence scores - ordered by specificity
  const patterns = [
    // Pattern 1: Number on its own line (highest confidence for Cambridge)
    { 
      regex: /(?:^|\n)\s*(\d{1,2})\s*\n/gm, 
      confidence: 0.98,
      name: 'standalone_number'
    },
    // Pattern 2: Number followed by space and capital letter (common format)
    { 
      regex: /(?:^|\n|\s{2,})(\d{1,2})\s+([A-Z][a-z])/gm, 
      confidence: 0.90,
      name: 'number_space_text'
    },
    // Pattern 3: Cambridge format - number after page marker or section
    { 
      regex: /(?:©|UCLES|\d{4}\]|\[Turn over)\s*(\d{1,2})\s+/gm, 
      confidence: 0.85,
      name: 'post_marker_number'
    },
    // Pattern 4: Number at start of sentence after period
    { 
      regex: /\.\s+(\d{1,2})\s+([A-Z])/gm, 
      confidence: 0.80,
      name: 'sentence_start_number'
    },
    // Pattern 5: Number followed by marks indicator nearby
    { 
      regex: /(\d{1,2})\s+[A-Za-z][\s\S]{10,200}?\[(\d+)\]/gm, 
      confidence: 0.85,
      name: 'number_with_marks'
    },
  ];

  let currentQuestionNumber = 0;
  let currentPartLabel: string | null = null;

  // First pass: Find all main question numbers
  for (const pattern of patterns.slice(0, 2)) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 30) {
        markers.push({
          position: match.index,
          page: estimatePageFromPosition(match.index, text),
          rawMarker: match[0].trim(),
          questionNumber: num,
          partLabel: null,
          subPartLabel: null,
          confidence: pattern.confidence,
          matchedPattern: pattern.name
        });
      }
    }
  }

  // Sort by position
  markers.sort((a, b) => a.position - b.position);

  // Second pass: Find part labels and associate with questions
  const partPattern = /(?:^|\n)\s*\(([a-z])\)\s*/gmi;
  let partMatch;
  
  while ((partMatch = partPattern.exec(text)) !== null) {
    const partLabel = partMatch[1].toLowerCase();
    const position = partMatch.index;
    
    // Find the most recent question number before this position
    let parentQuestion = 0;
    for (const marker of markers) {
      if (marker.position < position && marker.partLabel === null) {
        parentQuestion = marker.questionNumber;
      }
    }
    
    if (parentQuestion > 0) {
      markers.push({
        position: position,
        page: estimatePageFromPosition(position, text),
        rawMarker: partMatch[0].trim(),
        questionNumber: parentQuestion,
        partLabel: partLabel,
        subPartLabel: null,
        confidence: 0.95,
        matchedPattern: 'part_label'
      });
    }
  }

  // Third pass: Find sub-part labels
  const subpartPattern = /(?:^|\n)\s*\(([ivx]+)\)\s*/gmi;
  let subpartMatch;
  
  while ((subpartMatch = subpartPattern.exec(text)) !== null) {
    const subPartLabel = subpartMatch[1].toLowerCase();
    const position = subpartMatch.index;
    
    // Find the most recent part label before this position
    let parentQuestion = 0;
    let parentPart: string | null = null;
    
    for (const marker of markers) {
      if (marker.position < position) {
        if (marker.partLabel === null) {
          parentQuestion = marker.questionNumber;
          parentPart = null;
        } else if (marker.subPartLabel === null) {
          parentPart = marker.partLabel;
        }
      }
    }
    
    if (parentQuestion > 0 && parentPart) {
      markers.push({
        position: position,
        page: estimatePageFromPosition(position, text),
        rawMarker: subpartMatch[0].trim(),
        questionNumber: parentQuestion,
        partLabel: parentPart,
        subPartLabel: subPartLabel,
        confidence: 0.95,
        matchedPattern: 'subpart_label'
      });
    }
  }

  // Final sort by position
  markers.sort((a, b) => a.position - b.position);

  return markers;
}

/**
 * Estimate page number from text position (rough estimate)
 */
function estimatePageFromPosition(position: number, text: string): number {
  const avgCharsPerPage = 2500;
  return Math.floor(position / avgCharsPerPage) + 1;
}

// ============================================
// LAYER 2: STRUCTURE PARSER
// ============================================

/**
 * Parse extracted markers into structured question blocks
 */
export function parseQuestionBlocks(
  text: string, 
  markers: SourceQuestionMarker[]
): ExtractedQuestionBlock[] {
  const blocks: ExtractedQuestionBlock[] = [];
  
  // Sort markers by position
  const sortedMarkers = [...markers].sort((a, b) => a.position - b.position);
  
  for (let i = 0; i < sortedMarkers.length; i++) {
    const marker = sortedMarkers[i];
    const nextMarker = sortedMarkers[i + 1];
    
    // Calculate text range for this question
    const startPos = marker.position;
    const endPos = nextMarker ? nextMarker.position : text.length;
    
    // Extract raw text for this question
    let rawText = text.slice(startPos, endPos).trim();
    
    // Clean the text
    const cleanedText = cleanQuestionText(rawText, marker);
    
    // Detect marks
    const marks = detectMarks(rawText);
    
    // Detect question type
    const { type, options } = detectQuestionType(rawText);
    
    // Calculate full part label
    let fullPartLabel: string | null = null;
    if (marker.partLabel) {
      fullPartLabel = marker.partLabel;
      if (marker.subPartLabel) {
        fullPartLabel = `${marker.partLabel}(${marker.subPartLabel})`;
      }
    }
    
    // Calculate display order
    const displayOrder = calculateDisplayOrder(
      marker.questionNumber, 
      marker.partLabel, 
      marker.subPartLabel
    );
    
    // Determine if this needs an answer
    const needsAnswer = marks > 0 || hasAnswerLine(rawText);
    
    blocks.push({
      questionNumber: marker.questionNumber,
      partLabel: marker.partLabel,
      fullPartLabel: fullPartLabel,
      rawText: rawText,
      cleanedText: cleanedText,
      startPosition: startPos,
      endPosition: endPos,
      marks: marks,
      questionType: type,
      options: options,
      needsAnswer: needsAnswer,
      confidence: marker.confidence,
      displayOrder: displayOrder
    });
  }
  
  // Sort by display order
  blocks.sort((a, b) => a.displayOrder - b.displayOrder);
  
  return blocks;
}

/**
 * Clean question text while preserving important content
 */
function cleanQuestionText(rawText: string, marker: SourceQuestionMarker): string {
  let text = rawText;
  
  // Remove the question number prefix
  text = text.replace(/^\s*\d{1,2}\s*\n/, '');
  text = text.replace(/^\s*\d{1,2}\s+/, '');
  
  // Remove part labels from the beginning
  text = text.replace(/^\s*\([a-z]\)\s*/i, '');
  text = text.replace(/^\s*\([ivx]+\)\s*/i, '');
  
  // Remove marks notation
  text = text.replace(/\s*\[\d+\]\s*$/g, '');
  text = text.replace(/\s*\[MARKS?:\d+\]\s*/gi, '');
  text = text.replace(/\s*\(\d+\s*marks?\)\s*/gi, '');
  
  // Remove answer line markers
  text = text.replace(/\[ANSWER_LINE\]/g, '');
  text = text.replace(/\.{4,}/g, '');
  text = text.replace(/_{4,}/g, '');
  
  // Remove common PDF artifacts
  text = text.replace(/DO NOT WRITE IN THIS MARGIN/gi, '');
  text = text.replace(/Turn over/gi, '');
  text = text.replace(/©\s*UCLES\s*\d{4}/gi, '');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Detect marks from text
 */
function detectMarks(text: string): number {
  // Pattern 1: [X] at end
  const bracketMatch = text.match(/\[(\d+)\]\s*$/);
  if (bracketMatch) return parseInt(bracketMatch[1]);
  
  // Pattern 2: [MARKS:X]
  const marksMatch = text.match(/\[MARKS?:(\d+)\]/i);
  if (marksMatch) return parseInt(marksMatch[1]);
  
  // Pattern 3: (X marks)
  const parenMatch = text.match(/\((\d+)\s*marks?\)/i);
  if (parenMatch) return parseInt(parenMatch[1]);
  
  return 0;
}

/**
 * Detect question type and extract options if MCQ
 */
function detectQuestionType(text: string): { 
  type: 'mcq' | 'short_answer' | 'structured' | 'essay';
  options: Array<{ label: string; text: string }> | null;
} {
  // Check for MCQ patterns
  const mcqPatterns = [
    /\b([A-D])\s*[.)]\s*([^\n]+)/g,  // A) Option or A. Option
    /\bA\s+[A-Z][a-z]+[\s\S]*\bB\s+[A-Z][a-z]+[\s\S]*\bC\s+[A-Z][a-z]+/,  // A Word B Word C Word ([\s\S] instead of /s flag)
  ];
  
  const options: Array<{ label: string; text: string }> = [];
  
  // Try to extract MCQ options
  const optionMatches = Array.from(text.matchAll(/\b([A-D])\s*[.)]\s*([^\n]+)/g));
  for (const match of optionMatches) {
    options.push({
      label: match[1].toUpperCase(),
      text: match[2].trim()
    });
  }
  
  if (options.length >= 3) {
    return { type: 'mcq', options };
  }
  
  // Check for tick/circle instructions (indicates MCQ without labeled options)
  if (/tick|circle|select/i.test(text)) {
    return { type: 'mcq', options: null };
  }
  
  // Determine type based on marks and content
  const marks = detectMarks(text);
  
  if (marks >= 6) {
    return { type: 'essay', options: null };
  }
  
  if (marks >= 3 && (text.includes('describe') || text.includes('explain') || text.includes('discuss'))) {
    return { type: 'essay', options: null };
  }
  
  if (marks >= 3) {
    return { type: 'structured', options: null };
  }
  
  return { type: 'short_answer', options: null };
}

/**
 * Check if text has answer lines
 */
function hasAnswerLine(text: string): boolean {
  return /\[ANSWER_LINE\]|\.{4,}|_{4,}/i.test(text);
}

/**
 * Calculate display order for sorting
 */
function calculateDisplayOrder(
  questionNumber: number, 
  partLabel: string | null, 
  subPartLabel: string | null
): number {
  let order = questionNumber * 10000;
  
  if (partLabel) {
    order += (partLabel.charCodeAt(0) - 96) * 100; // a=1, b=2, etc.
  }
  
  if (subPartLabel) {
    const romanMap: Record<string, number> = {
      'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
      'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10
    };
    order += romanMap[subPartLabel] || 0;
  }
  
  return order;
}

// ============================================
// LAYER 3: VALIDATION ENGINE
// ============================================

/**
 * Validate extracted questions against source and detect anomalies
 */
export function validateExtraction(
  sourceText: string,
  questions: ExtractedQuestionBlock[]
): ValidationResult {
  const checks: ValidationCheck[] = [];
  const anomalies: Anomaly[] = [];
  const suggestedFixes: SuggestedFix[] = [];
  
  // Check 1: Sequential numbering
  const sequenceCheck = validateSequentialNumbering(questions);
  checks.push(sequenceCheck);
  if (!sequenceCheck.passed) {
    anomalies.push(...detectSequenceAnomalies(questions));
  }
  
  // Check 2: Duplicate detection
  const duplicateCheck = validateNoDuplicates(questions);
  checks.push(duplicateCheck);
  if (!duplicateCheck.passed) {
    anomalies.push(...detectDuplicateAnomalies(questions));
  }
  
  // Check 3: Text presence in source
  const textCheck = validateTextPresence(sourceText, questions);
  checks.push(textCheck);
  
  // Check 4: Marks validity
  const marksCheck = validateMarks(questions);
  checks.push(marksCheck);
  
  // Check 5: Part hierarchy
  const hierarchyCheck = validatePartHierarchy(questions);
  checks.push(hierarchyCheck);
  
  // Calculate overall confidence
  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const overallConfidence = totalScore / checks.length;
  
  // Determine if valid
  const criticalChecksPassed = checks
    .filter(c => ['sequential_numbering', 'no_duplicates'].includes(c.name))
    .every(c => c.passed);
  
  const isValid = criticalChecksPassed && overallConfidence >= 0.90;
  
  // Generate suggested fixes
  suggestedFixes.push(...generateSuggestedFixes(questions, anomalies));
  
  return {
    isValid,
    overallConfidence,
    checks,
    anomalies,
    suggestedFixes
  };
}

/**
 * Validate sequential numbering
 */
function validateSequentialNumbering(questions: ExtractedQuestionBlock[]): ValidationCheck {
  const mainQuestions = questions.filter(q => q.partLabel === null);
  const numbers = mainQuestions.map(q => q.questionNumber).sort((a, b) => a - b);
  
  let gaps = 0;
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] - numbers[i-1] > 1) {
      gaps++;
    }
  }
  
  const score = Math.max(0, 1 - (gaps * 0.1));
  
  return {
    name: 'sequential_numbering',
    passed: gaps === 0,
    score,
    details: gaps === 0 
      ? 'All question numbers are sequential'
      : `Found ${gaps} gap(s) in question numbering`
  };
}

/**
 * Validate no duplicates
 */
function validateNoDuplicates(questions: ExtractedQuestionBlock[]): ValidationCheck {
  const seen = new Map<string, number>();
  let duplicates = 0;
  
  for (const q of questions) {
    const key = `${q.questionNumber}|${q.fullPartLabel || ''}`;
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count > 0) duplicates++;
  }
  
  const score = Math.max(0, 1 - (duplicates * 0.2));
  
  return {
    name: 'no_duplicates',
    passed: duplicates === 0,
    score,
    details: duplicates === 0 
      ? 'No duplicate questions found'
      : `Found ${duplicates} duplicate question(s)`
  };
}

/**
 * Validate text presence in source
 */
function validateTextPresence(
  sourceText: string, 
  questions: ExtractedQuestionBlock[]
): ValidationCheck {
  const sourceLower = sourceText.toLowerCase();
  let foundCount = 0;
  
  for (const q of questions) {
    // Check if first 50 chars of cleaned text exist in source
    const searchText = q.cleanedText.slice(0, 50).toLowerCase();
    if (sourceLower.includes(searchText)) {
      foundCount++;
    }
  }
  
  const score = questions.length > 0 ? foundCount / questions.length : 0;
  
  return {
    name: 'text_presence',
    passed: score >= 0.9,
    score,
    details: `${foundCount}/${questions.length} questions found in source text`
  };
}

/**
 * Validate marks
 */
function validateMarks(questions: ExtractedQuestionBlock[]): ValidationCheck {
  const answerableQuestions = questions.filter(q => q.needsAnswer);
  const withMarks = answerableQuestions.filter(q => q.marks > 0);
  
  const score = answerableQuestions.length > 0 
    ? withMarks.length / answerableQuestions.length 
    : 1;
  
  return {
    name: 'marks_validity',
    passed: score >= 0.8,
    score,
    details: `${withMarks.length}/${answerableQuestions.length} answerable questions have marks`
  };
}

/**
 * Validate part hierarchy
 */
function validatePartHierarchy(questions: ExtractedQuestionBlock[]): ValidationCheck {
  let validHierarchy = 0;
  let totalParts = 0;
  
  const byQuestion = new Map<number, ExtractedQuestionBlock[]>();
  for (const q of questions) {
    const list = byQuestion.get(q.questionNumber) || [];
    list.push(q);
    byQuestion.set(q.questionNumber, list);
  }
  
  Array.from(byQuestion.entries()).forEach(([qNum, parts]) => {
    const partsOnly = parts.filter(p => p.partLabel !== null);
    totalParts += partsOnly.length;
    
    // Check if parts have sequential labels (a, b, c)
    const labels = partsOnly
      .filter(p => p.partLabel && !p.fullPartLabel?.includes('('))
      .map(p => p.partLabel!)
      .sort();
    
    for (let i = 0; i < labels.length; i++) {
      const expected = String.fromCharCode(97 + i); // a, b, c...
      if (labels[i] === expected) {
        validHierarchy++;
      }
    }
  });
  
  const score = totalParts > 0 ? validHierarchy / totalParts : 1;
  
  return {
    name: 'part_hierarchy',
    passed: score >= 0.8,
    score,
    details: `${validHierarchy}/${totalParts} parts have valid hierarchy`
  };
}

/**
 * Detect sequence anomalies
 */
function detectSequenceAnomalies(questions: ExtractedQuestionBlock[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const mainQuestions = questions.filter(q => q.partLabel === null);
  const numbers = mainQuestions.map(q => q.questionNumber).sort((a, b) => a - b);
  
  for (let i = 1; i < numbers.length; i++) {
    const gap = numbers[i] - numbers[i-1];
    if (gap > 1) {
      for (let missing = numbers[i-1] + 1; missing < numbers[i]; missing++) {
        anomalies.push({
          type: 'missing_number',
          severity: 'warning',
          questionNumber: missing,
          partLabel: null,
          description: `Question ${missing} appears to be missing`
        });
      }
    }
  }
  
  return anomalies;
}

/**
 * Detect duplicate anomalies
 */
function detectDuplicateAnomalies(questions: ExtractedQuestionBlock[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const seen = new Map<string, ExtractedQuestionBlock>();
  
  for (const q of questions) {
    const key = `${q.questionNumber}|${q.fullPartLabel || ''}`;
    const existing = seen.get(key);
    
    if (existing) {
      anomalies.push({
        type: 'duplicate',
        severity: 'critical',
        questionNumber: q.questionNumber,
        partLabel: q.fullPartLabel,
        description: `Duplicate entry for Q${q.questionNumber}${q.fullPartLabel ? `(${q.fullPartLabel})` : ''}`
      });
    } else {
      seen.set(key, q);
    }
  }
  
  return anomalies;
}

/**
 * Generate suggested fixes
 */
function generateSuggestedFixes(
  questions: ExtractedQuestionBlock[],
  anomalies: Anomaly[]
): SuggestedFix[] {
  const fixes: SuggestedFix[] = [];
  
  // For duplicates, suggest removing the duplicate
  const duplicateAnomalies = anomalies.filter(a => a.type === 'duplicate');
  for (const dup of duplicateAnomalies) {
    // Find the duplicate entries
    const matches = questions.filter(
      q => q.questionNumber === dup.questionNumber && 
           q.fullPartLabel === dup.partLabel
    );
    
    if (matches.length > 1) {
      // Keep the one with more marks or longer text
      matches.sort((a, b) => {
        if (a.marks !== b.marks) return b.marks - a.marks;
        return b.cleanedText.length - a.cleanedText.length;
      });
      
      // Suggest removing all but the first
      for (let i = 1; i < matches.length; i++) {
        const idx = questions.indexOf(matches[i]);
        fixes.push({
          questionIndex: idx,
          field: '_remove',
          currentValue: matches[i],
          suggestedValue: null,
          reason: 'Duplicate question entry',
          confidence: 0.95
        });
      }
    }
  }
  
  return fixes;
}

// ============================================
// LAYER 4: CONFIDENCE GATE
// ============================================

/**
 * Apply confidence gate - only return questions if confidence > threshold
 */
export function applyConfidenceGate(
  questions: ExtractedQuestionBlock[],
  validation: ValidationResult,
  threshold: number = 0.90
): {
  approved: boolean;
  questions: ExtractedQuestionBlock[];
  reason: string;
} {
  if (validation.overallConfidence >= threshold) {
    // Remove duplicates before returning
    const deduped = removeDuplicates(questions);
    
    return {
      approved: true,
      questions: deduped,
      reason: `Confidence ${(validation.overallConfidence * 100).toFixed(1)}% meets threshold ${(threshold * 100).toFixed(1)}%`
    };
  }
  
  // If not meeting threshold, try to apply suggested fixes
  const fixedQuestions = applyFixes(questions, validation.suggestedFixes);
  const revalidation = validateExtraction('', fixedQuestions);
  
  if (revalidation.overallConfidence >= threshold) {
    const deduped = removeDuplicates(fixedQuestions);
    
    return {
      approved: true,
      questions: deduped,
      reason: `After fixes, confidence ${(revalidation.overallConfidence * 100).toFixed(1)}% meets threshold`
    };
  }
  
  // Still not meeting threshold - return with warning
  const deduped = removeDuplicates(fixedQuestions);
  
  return {
    approved: false,
    questions: deduped,
    reason: `Confidence ${(revalidation.overallConfidence * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%. Manual review recommended.`
  };
}

/**
 * Remove duplicate questions
 */
function removeDuplicates(questions: ExtractedQuestionBlock[]): ExtractedQuestionBlock[] {
  const seen = new Map<string, ExtractedQuestionBlock>();
  
  for (const q of questions) {
    const key = `${q.questionNumber}|${q.fullPartLabel || ''}`;
    const existing = seen.get(key);
    
    if (!existing) {
      seen.set(key, q);
    } else {
      // Keep the one with more marks or longer text
      if (q.marks > existing.marks || 
          (q.marks === existing.marks && q.cleanedText.length > existing.cleanedText.length)) {
        seen.set(key, q);
      }
    }
  }
  
  return Array.from(seen.values()).sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Apply suggested fixes to questions
 */
function applyFixes(
  questions: ExtractedQuestionBlock[],
  fixes: SuggestedFix[]
): ExtractedQuestionBlock[] {
  // Sort fixes by confidence (highest first)
  const sortedFixes = [...fixes].sort((a, b) => b.confidence - a.confidence);
  
  // Track which indices to remove
  const toRemove = new Set<number>();
  
  for (const fix of sortedFixes) {
    if (fix.field === '_remove' && fix.confidence >= 0.8) {
      toRemove.add(fix.questionIndex);
    }
  }
  
  // Filter out removed questions
  return questions.filter((_, idx) => !toRemove.has(idx));
}

// ============================================
// LAYER 5: LEARNING SYSTEM
// ============================================

/**
 * Record extraction results for learning
 * Note: This is a stub - full implementation requires database table setup
 */
export async function recordExtractionLearning(
  paperId: string,
  report: ExtractionReport
): Promise<void> {
  // Log for now - full implementation will store to database
  console.log(`[Learning] Recording extraction for paper ${paperId}:`, {
    confidence: report.stats.overallConfidence,
    questionCount: report.stats.totalQuestionsFound,
    validationPassed: report.stats.validationPassed
  });
  
  // TODO: Implement database storage when extraction_learning table is created
  // This will enable the system to learn from past extractions
}

/**
 * Get learned patterns for a specific exam board
 * Note: This is a stub - full implementation requires database table setup
 */
export async function getLearnedPatterns(examBoard: string): Promise<LearningRecord[]> {
  // Return empty array for now - full implementation will query database
  console.log(`[Learning] Getting patterns for exam board: ${examBoard}`);
  
  // TODO: Implement database query when extraction_learning table is created
  return [];
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

/**
 * Main extraction function that uses all layers
 */
export function extractQuestions(
  sourceText: string,
  options: {
    confidenceThreshold?: number;
    filename?: string;
    pageCount?: number;
  } = {}
): ExtractionReport {
  const { confidenceThreshold = 0.90, filename = 'unknown', pageCount = 0 } = options;
  
  console.log('[ExtractionEngine] Starting multi-layered extraction...');
  
  // Layer 1: Extract source markers
  console.log('[Layer 1] Extracting source markers...');
  const markers = extractSourceMarkers(sourceText);
  console.log(`[Layer 1] Found ${markers.length} markers`);
  
  // Layer 2: Parse into question blocks
  console.log('[Layer 2] Parsing question blocks...');
  const questions = parseQuestionBlocks(sourceText, markers);
  console.log(`[Layer 2] Parsed ${questions.length} questions`);
  
  // Layer 3: Validate extraction
  console.log('[Layer 3] Validating extraction...');
  const validation = validateExtraction(sourceText, questions);
  console.log(`[Layer 3] Validation: ${validation.isValid ? 'PASSED' : 'FAILED'} (${(validation.overallConfidence * 100).toFixed(1)}% confidence)`);
  
  // Layer 4: Apply confidence gate
  console.log('[Layer 4] Applying confidence gate...');
  const gateResult = applyConfidenceGate(questions, validation, confidenceThreshold);
  console.log(`[Layer 4] Gate: ${gateResult.approved ? 'APPROVED' : 'REVIEW NEEDED'} - ${gateResult.reason}`);
  
  // Calculate stats
  const totalMarks = gateResult.questions.reduce((sum, q) => sum + q.marks, 0);
  const questionsWithParts = new Set(gateResult.questions.filter(q => q.partLabel).map(q => q.questionNumber)).size;
  const mcqCount = gateResult.questions.filter(q => q.questionType === 'mcq').length;
  
  // Build report
  const report: ExtractionReport = {
    timestamp: new Date().toISOString(),
    source: {
      filename,
      pageCount,
      textLength: sourceText.length
    },
    stats: {
      totalQuestionsFound: gateResult.questions.length,
      totalMarks,
      questionsWithParts,
      mcqCount,
      validationPassed: gateResult.approved,
      overallConfidence: validation.overallConfidence
    },
    validation,
    questions: gateResult.questions,
    learningData: []
  };
  
  console.log('[ExtractionEngine] Extraction complete');
  console.log(`[ExtractionEngine] Results: ${report.stats.totalQuestionsFound} questions, ${report.stats.totalMarks} marks, ${(report.stats.overallConfidence * 100).toFixed(1)}% confidence`);
  
  return report;
}
