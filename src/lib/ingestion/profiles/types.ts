import type { BoardId, DbBoardCode, DocType, PaperMeta, SessionCode } from '../types';

/**
 * A BoardProfile is data plus pure functions — no I/O, no DB, no network — so
 * adding support for a new exam board is one file plus one registry line, and
 * every profile is trivially unit-testable.
 */

export interface FilenamePattern {
  id: string;
  re: RegExp;
  parse: (m: RegExpMatchArray) => Partial<PaperMeta>;
}

export interface TextSignature {
  re: RegExp;
  weight: number;
}

/**
 * Left-edge x-position bands (PDF points) that identify hierarchy level.
 * These assign a level; they never discard content — the question number at
 * x~55 and the closing `]` of `[4]` at x~535 must both survive.
 */
export interface IndentBands {
  question: [number, number];
  part: [number, number];
  subpart: [number, number];
}

export interface QuestionStructureRules {
  /** Matches the leading token of a question line, e.g. /^(\d{1,2})$/ */
  questionStart: RegExp;
  /**
   * Optional whole-line pattern for boards that split the number across
   * tokens. AQA prints question 1 as "0 1", so the first token is "0" and
   * token matching cannot work. Capture group 1 is the question number;
   * an optional capture group 2 is a NUMERIC sub-part index ("0 2 . 3" -> 2,
   * sub-part 3), which is mapped onto the usual letter parts so it joins to
   * the mark scheme the same way.
   */
  questionStartLine?: RegExp;
  partLabel: RegExp;
  subPartLabel: RegExp;
  indentBands: IndentBands;
  /** Depth order, outermost first. */
  partHierarchy: ('question' | 'part' | 'subpart')[];
}

export interface MarkSchemeRules {
  /** Tried in order; first one to produce a usable result wins. */
  strategies: ('plumber_table_qam' | 'plumber_table_generic' | 'llm')[];
  /** Identifies the header row of an answer table. */
  headerMatch: RegExp;
  /** Validates column 0 of a candidate answer row. */
  qidRegex: RegExp;
  /** Cover-page maximum-mark statement. Soft signal only — never a gate. */
  maxMarkRegex?: RegExp;
}

export interface HeaderProbeRules {
  syllabus?: RegExp;
  session?: RegExp;
  paperVariant?: RegExp;
  totalMarks?: RegExp;
  msMaxMark?: RegExp;
  duration?: RegExp;
}

export interface BoardProfile {
  id: BoardId;
  label: string;
  /** Id used in src/lib/exam-boards.ts. */
  appExamBoardId: string;
  /** Value stored in exam_boards.code. */
  dbExamBoardCode: DbBoardCode | null;

  detect: {
    filenamePatterns: RegExp[];
    textSignatures: TextSignature[];
  };

  filename: FilenamePattern[];
  headerProbe: HeaderProbeRules;
  structure: QuestionStructureRules;
  /** Mark-tag patterns, tried in order. First capture group is the mark count. */
  marks: RegExp[];
  /**
   * Largest believable mark value for a single question on this board. Guards
   * against picking up a stray number, but must not be set below the board's
   * real maximum: an Edexcel literature essay is a single 44-mark question, so
   * a blanket cap of 30 silently discarded it and left the question at 0.
   */
  maxMarksPerQuestion?: number;
  markScheme: MarkSchemeRules;
  /** Lines matching any of these are page furniture, not question content. */
  pageFurniture: RegExp[];
  /** Matches an in-text figure reference, e.g. "Fig. 12.1". */
  figureRefs: RegExp;
  /** Last-resort per-type mark guesses. Only used when no mark tag was found. */
  marksDefaults?: Partial<Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Shared helpers used by several profiles
// ---------------------------------------------------------------------------

/** Cambridge-style series letter -> normalised session code. */
export function seriesLetterToSession(letter: string): SessionCode {
  switch (letter.toLowerCase()) {
    case 's':
      return 'mj';
    case 'w':
      return 'on';
    case 'm':
      return 'fm';
    default:
      return 'unknown';
  }
}

/**
 * Month name -> session code. Note the trap this exists to avoid: the folder
 * says "November" but the paper header says "October/November", so callers must
 * map through the session code rather than comparing strings.
 */
export function monthToSession(month: string): SessionCode {
  const m = month.toLowerCase().slice(0, 3);
  if (m === 'may' || m === 'jun' || m === 'jul') return 'mj';
  if (m === 'oct' || m === 'nov' || m === 'dec') return 'on';
  if (m === 'jan' || m === 'feb' || m === 'mar') return 'fm';
  return 'unknown';
}

/** Two-digit year -> four-digit, assuming the 2000s. */
export function expandYear(yy: string): number {
  const n = Number(yy);
  return n < 100 ? 2000 + n : n;
}

/**
 * Cambridge component codes encode paper and variant: "12" -> paper 1 variant 2,
 * "2" -> paper 2 with no variant.
 */
export function splitComponent(code: string): { paperNumber: string; variant: string | null } {
  const digits = code.replace(/\D/g, '');
  if (digits.length >= 2) {
    return { paperNumber: digits[0], variant: digits.slice(1) };
  }
  return { paperNumber: digits || code, variant: null };
}

export function docTypeFromToken(token: string): DocType {
  const t = token.toLowerCase().replace(/[\s_-]/g, '');
  if (['qp', 'que', 'questionpaper', 'frq', 'mcq', 'sqp', 'sp', 'specimenpaper'].includes(t)) return 'qp';
  if (['ms', 'rms', 'msc', 'markscheme', 'sg', 'scoring', 'wms'].includes(t)) return 'ms';
  if (['in', 'ins', 'insert', 'cr'].includes(t)) return 'insert';
  if (['er', 'rp', 'pef', 'examinerreport'].includes(t)) return 'examiner_report';
  if (['gt', 'gradethresholds'].includes(t)) return 'grade_thresholds';
  if (['sf', 'sourcefiles'].includes(t)) return 'source_files';
  return 'unknown';
}
