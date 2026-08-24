/**
 * Shared types for the exam-paper ingestion pipeline.
 *
 * The pipeline is a chain of mostly-pure stages. Every stage's output is JSON
 * serialisable so it can be persisted to ingestion_files.stage_output and a
 * resumed or retried job can skip work it has already done.
 */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export type DocType =
  | 'qp'
  | 'ms'
  | 'insert'
  | 'examiner_report'
  | 'grade_thresholds'
  | 'source_files'
  | 'unknown';

/** Normalised exam session codes, matching exam_board_series.series_code. */
export type SessionCode = 'mj' | 'on' | 'fm' | 'unknown';

export type BoardId = 'cambridge' | 'edexcel' | 'aqa' | 'ocr' | 'ib' | 'ap' | 'generic';

export type DbBoardCode = 'CIE' | 'EDEX' | 'AQA' | 'OCR' | 'IB' | 'AP';

export interface PaperMeta {
  /** Syllabus / specification code, e.g. "0417", "9bn0", "H420". */
  subjectCode: string | null;
  subjectName: string | null;
  year: number | null;
  session: SessionCode;
  /** Paper number as printed, e.g. "1". */
  paperNumber: string | null;
  /** Variant digit, e.g. "2" from 0417/12. */
  variant: string | null;
  /** Board component code as printed, e.g. "12" from 0417/12. */
  componentCode: string | null;
  docType: DocType;
  profileId: BoardId;
  /** Marks the paper states about itself on page 1 (QP) or the cover (MS). */
  statedTotalMarks: number | null;
  durationMinutes: number | null;
  /** 0..1 — how much we trust this metadata. */
  confidence: number;
  source: 'filename' | 'header' | 'override' | 'conflict';
  matchedPattern?: string;
}

export interface FileRef {
  /** Display name, used for filename parsing. */
  name: string;
  /** Local path (CLI) or storage path (API). Resolved by PipelineDeps.readFile. */
  path: string;
  size?: number;
}

// ---------------------------------------------------------------------------
// Parsed document (the Python service's canonical output)
// ---------------------------------------------------------------------------

/** [x0, top, x1, bottom] in PDF points, origin top-left. */
export type BBox = [number, number, number, number];

export interface ParsedWord {
  text: string;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

export interface ParsedLine {
  text: string;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  /**
   * Omitted by /v2/extract to keep the envelope small — `x0` already equals the
   * leftmost word's x0, which is all the segmenter needs for indent banding.
   */
  words?: ParsedWord[];
}

export interface ParsedTable {
  bbox: BBox;
  /** Rows after all-empty columns have been collapsed. */
  rows: string[][];
}

export interface ParsedImage {
  bbox: BBox;
  kind: 'raster' | 'vector' | 'merged';
}

export interface ParsedFigure {
  bbox: BBox;
  kind: 'raster' | 'vector' | 'merged';
  label: string | null;
  /** Base64 PNG, present only when the figures endpoint was asked to render. */
  png?: string;
}

export interface ParsedPage {
  index: number;
  width: number;
  height: number;
  text: string;
  lines: ParsedLine[];
  tables: ParsedTable[];
  images?: ParsedImage[];
  figures: ParsedFigure[];
  /**
   * Vector clusters classified as tables rather than figures — e.g. a tick-grid
   * or a spreadsheet screenshot. Excluded from question-anchor detection so
   * their row numbers cannot become phantom questions.
   */
  tableRegions?: ParsedImage[];
}

export interface DocumentMarkers {
  /** Every `[N]` / `(N)` mark tag with its position. */
  markTags: { marks: number; page: number; bbox: BBox }[];
  /** Question / part / sub-part starts detected from left-edge geometry. */
  anchors: {
    kind: 'question' | 'part' | 'subpart';
    text: string;
    page: number;
    bbox: BBox;
  }[];
}

export interface ParsedDocument {
  pageCount: number;
  pages: ParsedPage[];
  markers: DocumentMarkers;
  /** Raw header text (pages 1–2), used by the header probe. */
  headerText: string;
  extractionMethod: 'python_v2' | 'pdfjs' | 'vision';
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Extracted questions
// ---------------------------------------------------------------------------

/** Types accepted by the `questions` table CHECK constraint. */
export type QuestionsEnum =
  | 'mcq'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'structured'
  | 'context'
  | 'calculation'
  | 'fill_blank'
  | 'numeric';

export interface McqOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  /** For tick-grids: row label -> correct column header. */
  answerMap?: Record<string, string>;
}

export interface ExtractedQuestion {
  /** Canonical id — "4", "2(a)", "11(b)(i)". Unique within a paper. */
  ref: string;
  questionNumber: number;
  partLabel: string | null;
  parentRef: string | null;
  questionText: string;
  contextText: string | null;
  isContextOnly: boolean;
  needsAnswer: boolean;
  questionType: QuestionsEnum;
  marks: number;
  displayOrder: number;
  options: McqOption[] | null;
  subInputs: string[] | null;
  tableData: TableData | null;
  sectionName: string | null;
  sourcePage: number;
  sourceBBox: BBox | null;
  /** Filled in by the join stage. */
  markScheme: string | null;
  correctAnswer: string | null;
  figures: ParsedFigure[];
  confidence: number;
  errorCodes: string[];
}

export interface MarkSchemeEntry {
  ref: string;
  answerText: string;
  marks: number | null;
  /** Acceptable-answer points split from "Four from:" style cells. */
  points: string[];
  /** Row label -> correct column, for tick-grid answers. */
  answerMap?: Record<string, string>;
  sourcePage: number;
}

export interface ParsedMarkScheme {
  entries: MarkSchemeEntry[];
  statedMaxMarks: number | null;
  strategy: 'plumber_table_qam' | 'plumber_table_generic' | 'llm';
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface GateResult {
  id: string;
  label: string;
  passed: boolean;
  hard: boolean;
  weight: number;
  detail: string;
}

export interface ValidationReport {
  gates: GateResult[];
  confidence: number;
  hardFailures: string[];
  errorCodes: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Pipeline plumbing
// ---------------------------------------------------------------------------

export type Stage =
  | 'discover'
  | 'upload'
  | 'text'
  | 'probe'
  | 'structure'
  | 'classify'
  | 'llmRepair'
  | 'validate'
  | 'markScheme'
  | 'join'
  | 'figures'
  | 'persist'
  | 'mirror'
  | 'gate';

export const STAGE_ORDER: Stage[] = [
  'discover',
  'upload',
  'text',
  'probe',
  'structure',
  'classify',
  'llmRepair',
  'validate',
  'markScheme',
  'join',
  'figures',
  'persist',
  'mirror',
  'gate',
];

export interface PipelineOptions {
  dryRun: boolean;
  mirror: boolean;
  figures: boolean;
  autoPublish: boolean;
  confidenceGate: number;
  force: boolean;
  subjectId?: string;
  examBoardId?: string;
  level?: string;
  profileId?: BoardId;
}

export const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  dryRun: false,
  mirror: true,
  figures: true,
  autoPublish: true,
  confidenceGate: 0.92,
  force: false,
};

export interface PipelineEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  stage: Stage;
  jobId?: string;
  message: string;
  data?: Record<string, unknown>;
}
