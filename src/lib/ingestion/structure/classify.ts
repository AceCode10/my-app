import type { BoardProfile } from '../profiles/types';
import type { ExtractedQuestion, McqOption, ParsedDocument, QuestionsEnum, TableData } from '../types';

/**
 * Deterministic question typing, option extraction and grid capture.
 *
 * Every type below is decided from the question's own text and the page tables
 * the PDF already provides — no language model. The LLM repair stage only sees
 * questions this pass could not resolve.
 *
 * Types are constrained to the values the `questions` table CHECK accepts:
 * mcq | true_false | short_answer | essay | structured | context | calculation
 * | fill_blank | numeric. Note that `paper_questions` historically tolerated
 * 'multiple_choice', 'long_answer' and 'fill_in_blank', which the `questions`
 * constraint rejects — mapping through one place kills that class of failure.
 */

const OPTION_LINE_RE = /^\s*([A-H])[\s.):]\s*(.+)$/;
const TICK_INSTRUCTION_RE = /\btick\s*\(?[✓✔]?\)?\b/i;
const CIRCLE_INSTRUCTION_RE = /\bcircle\s+(one|two|three|four|\d+)\b/i;
const COMPLETE_SENTENCE_RE = /\b(complete\s+(each\s+of\s+)?the\s+(following\s+)?sentences?|using\s+the\s+most\s+appropriate\s+(item|word|term))\b/i;
const ESSAY_VERB_RE = /\b(discuss|evaluate|analyse|analyze|compare\s+and\s+contrast|to\s+what\s+extent|justify)\b/i;
const EXPLAIN_VERB_RE = /\b(explain|describe|compare|justify|assess)\b/i;
const CALC_RE = /\b(calculate|compute|work\s+out|how\s+many|convert)\b|=\s*[A-Z(]|\d+\s*[+\-*/]\s*\d+/i;
const TRUE_FALSE_RE = /\b(true\s+or\s+false|tick\s+whether\s+.*\b(true|false)\b)/i;
const NUMBERED_SLOT_RE = /^\s*([1-9])\s*\.{4,}/;

/** Normalise any historic or model-produced type string into the DB enum. */
export function toQuestionsEnum(raw: string | null | undefined): QuestionsEnum {
  const t = (raw ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const map: Record<string, QuestionsEnum> = {
    mcq: 'mcq',
    multiple_choice: 'mcq',
    multiplechoice: 'mcq',
    mc: 'mcq',
    choice: 'mcq',
    true_false: 'true_false',
    tf: 'true_false',
    truefalse: 'true_false',
    short_answer: 'short_answer',
    short: 'short_answer',
    structured: 'structured',
    context: 'context',
    essay: 'essay',
    long_answer: 'essay',
    extended: 'essay',
    essay_extended_response: 'essay',
    calculation: 'calculation',
    calc: 'calculation',
    numeric: 'numeric',
    number: 'numeric',
    fill_blank: 'fill_blank',
    fill_in_blank: 'fill_blank',
    fill_in_the_blank: 'fill_blank',
    cloze: 'fill_blank',
    gap_fill: 'fill_blank',
  };
  return map[t] ?? 'short_answer';
}

function extractOptions(text: string): McqOption[] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const options: McqOption[] = [];

  for (const line of lines) {
    const match = line.match(OPTION_LINE_RE);
    if (!match) continue;
    const label = match[1].toUpperCase();
    const body = match[2].trim();
    // Guard against prose that happens to start with a capital and a stop.
    if (!body || body.length > 160) continue;
    if (options.some((o) => o.label === label)) continue;
    options.push({ label, text: body, isCorrect: false });
  }

  if (options.length < 2) return null;

  // Labels must form a run starting at A.
  const expected = options.map((_, i) => String.fromCharCode(65 + i));
  const actual = options.map((o) => o.label);
  if (expected.join('') !== actual.join('')) return null;

  return options;
}

/** Labelled answer slots: "1 .....", "2 .....", "Extreme test data 1 .....". */
function extractSubInputs(text: string): string[] | null {
  const lines = text.split('\n').map((l) => l.trim());
  const labels: string[] = [];

  for (const line of lines) {
    const numbered = line.match(NUMBERED_SLOT_RE);
    if (numbered) {
      labels.push(numbered[1]);
      continue;
    }
    const named = line.match(/^([A-Z][A-Za-z ]{2,40}\s+\d)\s*\.{4,}/);
    if (named) labels.push(named[1].trim());
  }

  return labels.length >= 2 ? labels : null;
}

/**
 * A tick-grid question ("Tick whether the following refer to Backing storage,
 * RAM or ROM") is answerable content, not a picture. The PDF hands us the grid
 * as a real table; store it so the app can render a native HTML table and mark
 * the student's selection.
 */
function findGridTable(
  question: ExtractedQuestion,
  document: ParsedDocument,
): TableData | null {
  const page = document.pages.find((p) => p.index === question.sourcePage);
  if (!page) return null;

  const bbox = question.sourceBBox;
  const candidates = page.tables.filter((t) => {
    if (!bbox) return true;
    // The table must sit inside this question's vertical span.
    return t.bbox[1] >= bbox[1] - 6 && t.bbox[3] <= bbox[3] + 6;
  });

  for (const table of candidates) {
    const rows = table.rows.filter((r) => r.some((c) => c.trim()));
    if (rows.length < 2) continue;

    const headers = rows[0].map((c) => c.trim());
    // A grid has at least two labelled answer columns beyond the row label.
    if (headers.filter(Boolean).length < 3) continue;

    const body = rows.slice(1).filter((r) => r[0]?.trim());
    if (body.length < 2) continue;

    return { headers, rows: body };
  }

  return null;
}

export interface ClassifyResult {
  questions: ExtractedQuestion[];
  /** Questions the deterministic pass could not resolve; candidates for LLM repair. */
  unresolved: string[];
}

export function classifyQuestions(
  questions: ExtractedQuestion[],
  document: ParsedDocument,
  _profile: BoardProfile,
): ClassifyResult {
  const unresolved: string[] = [];

  for (const question of questions) {
    if (question.isContextOnly) {
      question.questionType = 'context';
      continue;
    }

    const text = question.questionText;

    const options = extractOptions(text);
    if (options) {
      question.options = options;
      question.questionType = 'mcq';
      continue;
    }

    const grid = findGridTable(question, document);
    if (grid) {
      question.tableData = grid;
      question.questionType = TRUE_FALSE_RE.test(text) ? 'true_false' : 'structured';
      continue;
    }

    const subInputs = extractSubInputs(text);
    if (subInputs) question.subInputs = subInputs;

    if (TICK_INSTRUCTION_RE.test(text)) {
      question.questionType = 'mcq';
      if (!question.options) unresolved.push(question.ref);
      continue;
    }

    if (CIRCLE_INSTRUCTION_RE.test(text) || COMPLETE_SENTENCE_RE.test(text)) {
      question.questionType = 'fill_blank';
      continue;
    }

    if (CALC_RE.test(text)) {
      question.questionType = 'calculation';
      continue;
    }

    if (question.marks >= 6 && ESSAY_VERB_RE.test(text)) {
      question.questionType = 'essay';
      continue;
    }

    if (question.marks >= 4 && (ESSAY_VERB_RE.test(text) || EXPLAIN_VERB_RE.test(text))) {
      question.questionType = 'structured';
      continue;
    }

    question.questionType = 'short_answer';

    // Anything with no usable text cannot be classified from text alone.
    if (text.trim().length < 10) {
      question.errorCodes.push('E016_TEXT_QUALITY');
      question.confidence = Math.min(question.confidence, 0.4);
      unresolved.push(question.ref);
    }
  }

  return { questions, unresolved };
}
