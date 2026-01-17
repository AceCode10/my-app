/**
 * Self-Annealing Extraction Workflow
 * 
 * DOE Framework Implementation:
 * - Directive: /directives/*.md (SOPs)
 * - Orchestration: This module coordinates validation and fixes
 * - Execution: /execution/*.ts (deterministic code)
 */

export {
  selfAnnealingValidateAndFix,
  validateQuestions,
  autoFixQuestions,
  calculateDisplayOrder,
  inferQuestionNumbersFromText,
  ERROR_CODES,
  type ExtractedQuestion,
  type ValidationResult,
  type ValidationError,
  type FixRecord,
} from './execution/question-validator';

/**
 * Extraction workflow version
 * Increment when making changes to extraction logic
 */
export const EXTRACTION_WORKFLOW_VERSION = '2.0.0';

/**
 * Log extraction metrics for self-annealing learning
 */
export interface ExtractionMetrics {
  paperId: string;
  timestamp: string;
  questionCount: number;
  confidence: number;
  wasFixed: boolean;
  fixesApplied: number;
  errors: string[];
  warnings: string[];
  extractionMethod: string;
  processingTimeMs: number;
}

/**
 * Create extraction metrics for logging
 */
export function createExtractionMetrics(
  paperId: string,
  result: {
    questionCount: number;
    confidence: number;
    wasFixed: boolean;
    fixesApplied: number;
    errors: string[];
    warnings: string[];
    extractionMethod: string;
  },
  processingTimeMs: number
): ExtractionMetrics {
  return {
    paperId,
    timestamp: new Date().toISOString(),
    questionCount: result.questionCount,
    confidence: result.confidence,
    wasFixed: result.wasFixed,
    fixesApplied: result.fixesApplied,
    errors: result.errors,
    warnings: result.warnings,
    extractionMethod: result.extractionMethod,
    processingTimeMs,
  };
}

/**
 * Log extraction metrics to console (can be extended to database/analytics)
 */
export function logExtractionMetrics(metrics: ExtractionMetrics): void {
  console.log('[Extraction Metrics]', JSON.stringify({
    paperId: metrics.paperId,
    questions: metrics.questionCount,
    confidence: `${(metrics.confidence * 100).toFixed(1)}%`,
    fixed: metrics.wasFixed,
    fixes: metrics.fixesApplied,
    method: metrics.extractionMethod,
    time: `${metrics.processingTimeMs}ms`,
    errors: metrics.errors.length,
    warnings: metrics.warnings.length,
  }));
}
