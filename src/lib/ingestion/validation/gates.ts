import { compareQuestionIds, parseQuestionId } from '../question-id';
import type { BoardProfile } from '../profiles/types';
import type { ExtractedQuestion, GateResult, MarkSchemeEntry, ValidationReport } from '../types';

/**
 * Quality gates.
 *
 * Authority order matters. The question paper's own mark tags are the ground
 * truth: their sum equalled the paper's stated total on 37 of 37 papers in the
 * corpus. The mark scheme's cover statement is a SOFT signal only — Cambridge
 * itself gets it wrong (Nov 2023 P11 states "Maximum Mark: 100" on a paper that
 * genuinely totals 80), so it can never fail a paper on its own.
 */

const UNBROKEN_RUN_RE = /[A-Za-z]{25,}/;
const CID_RE = /\(cid:\d+\)/;
const MARGIN_RE = /DO\s*NOT\s*WRITE|NIGRAM|ETIRW/i;

export interface GateInput {
  questions: ExtractedQuestion[];
  markSchemeEntries: MarkSchemeEntry[];
  profile: BoardProfile;
  /** Sum of every mark tag found in the question paper. */
  markTagTotal: number;
  /** "The total mark for this paper is N." */
  statedTotalQp: number | null;
  /** "Maximum Mark: N" from the mark-scheme cover. */
  statedTotalMs: number | null;
  msOnly: string[];
  qpOnly: string[];
  /** False when the paper had no mark scheme at all. */
  hasMarkScheme: boolean;
}

function gate(
  id: string,
  label: string,
  passed: boolean,
  hard: boolean,
  weight: number,
  detail: string,
): GateResult {
  return { id, label, passed, hard, weight, detail };
}

export function runGates(input: GateInput): ValidationReport {
  const {
    questions,
    markSchemeEntries,
    markTagTotal,
    statedTotalQp,
    statedTotalMs,
    msOnly,
    qpOnly,
    hasMarkScheme,
  } = input;

  const gates: GateResult[] = [];
  const warnings: string[] = [];
  const errorCodes = new Set<string>();

  const answerable = questions.filter((q) => !q.isContextOnly);
  const questionMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const msMarks = markSchemeEntries.reduce((sum, e) => sum + (e.marks ?? 0), 0);

  // --- G1: extracted marks vs the paper's own stated total ------------------
  gates.push(
    gate(
      'qp_total',
      'Extracted marks match the paper total',
      statedTotalQp === null ? true : questionMarks === statedTotalQp,
      true,
      0.2,
      statedTotalQp === null
        ? 'The paper states no total; skipped.'
        : `extracted ${questionMarks} vs stated ${statedTotalQp}`,
    ),
  );
  if (statedTotalQp !== null && questionMarks !== statedTotalQp) {
    errorCodes.add('E015_TOTAL_MARKS_MISMATCH');
  }

  // --- G2: mark scheme marks vs the question paper -------------------------
  gates.push(
    gate(
      'ms_total',
      'Mark scheme total matches the question paper',
      !hasMarkScheme || msMarks === markTagTotal,
      true,
      0.15,
      hasMarkScheme
        ? `mark scheme ${msMarks} vs question paper ${markTagTotal}`
        : 'No mark scheme supplied; skipped.',
    ),
  );
  if (hasMarkScheme && msMarks !== markTagTotal) {
    errorCodes.add('E015_TOTAL_MARKS_MISMATCH_VS_MS');
  }

  // --- G3: the two stated totals agree (SOFT — never hard) -----------------
  const statedAgree =
    statedTotalQp === null || statedTotalMs === null || statedTotalQp === statedTotalMs;
  gates.push(
    gate(
      'totals_agree',
      'Stated totals agree (advisory)',
      statedAgree,
      false,
      0.05,
      statedAgree
        ? 'Stated totals agree.'
        : `The paper states ${statedTotalQp} but the mark scheme cover states ${statedTotalMs}. ` +
          'The paper is authoritative; boards do publish this incorrectly.',
    ),
  );
  if (!statedAgree) {
    warnings.push(
      `Stated totals disagree (paper ${statedTotalQp}, mark scheme ${statedTotalMs}); ` +
        'treating the question paper as authoritative.',
    );
  }

  // --- G4: question counts --------------------------------------------------
  const countsMatch = !hasMarkScheme || answerable.length === markSchemeEntries.length;
  gates.push(
    gate(
      'question_count',
      'Question count matches the mark scheme',
      countsMatch,
      false,
      0.1,
      hasMarkScheme
        ? `${answerable.length} answerable questions vs ${markSchemeEntries.length} mark scheme entries`
        : 'No mark scheme supplied; skipped.',
    ),
  );

  // --- G5: every answerable question has an answer -------------------------
  const missingAnswers = answerable.filter((q) => q.needsAnswer && q.marks > 0 && !q.markScheme);
  const coverageOk = !hasMarkScheme || (missingAnswers.length === 0 && msOnly.length === 0);
  gates.push(
    gate(
      'id_coverage',
      'Every question has an answer and every answer has a question',
      coverageOk,
      true,
      0.2,
      hasMarkScheme
        ? `${missingAnswers.length} questions without an answer, ${msOnly.length} answers without a question`
        : 'No mark scheme supplied; skipped.',
    ),
  );
  if (missingAnswers.length > 0) errorCodes.add('E013_QP_ID_UNMATCHED');
  if (msOnly.length > 0) errorCodes.add('E012_MS_ID_UNMATCHED');

  // --- G6: numbering is sequential and parts are contiguous ----------------
  const numbers = [...new Set(questions.map((q) => q.questionNumber))].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < numbers.length; i += 1) {
    for (let n = numbers[i - 1] + 1; n < numbers[i]; n += 1) gaps.push(n);
  }
  const duplicates = questions
    .map((q) => q.ref)
    .filter((ref, i, all) => all.indexOf(ref) !== i);

  gates.push(
    gate(
      'sequence',
      'Question numbering is complete and unique',
      gaps.length === 0 && duplicates.length === 0,
      false,
      0.1,
      gaps.length || duplicates.length
        ? `missing numbers: ${gaps.join(', ') || 'none'}; duplicates: ${duplicates.join(', ') || 'none'}`
        : `${numbers.length} questions, 1-${numbers[numbers.length - 1] ?? 0}`,
    ),
  );
  if (gaps.length) errorCodes.add('E002_MISSING_QUESTION_NUMBERS');
  if (duplicates.length) errorCodes.add('E003_DUPLICATE_ENTRIES');

  // --- G7: text quality (the space-glyph / margin-noise regression guard) ---
  // Terse is not corrupt. A sub-part under "Describe the following types of
  // memory:" legitimately reads just "ROM" — the meaning lives in the parent's
  // context text. Only genuine extraction damage fails this gate.
  const dirty = questions.filter(
    (q) =>
      CID_RE.test(q.questionText) ||
      MARGIN_RE.test(q.questionText) ||
      UNBROKEN_RUN_RE.test(q.questionText) ||
      // Empty text is only a defect when nothing else carries the content.
      // Some questions are legitimately wordless: "(i)" followed by a barcode
      // image, or a tick-grid whose content lives in table_data.
      (!q.isContextOnly &&
        q.needsAnswer &&
        q.questionText.trim().length === 0 &&
        q.figures.length === 0 &&
        !q.tableData),
  );

  // Very short text is still worth surfacing, just not as a hard failure.
  const terse = questions.filter(
    (q) => !q.isContextOnly && q.questionText.trim().length > 0 && q.questionText.trim().length < 6,
  );
  if (terse.length > 0) {
    warnings.push(
      `${terse.length} questions have very short text (${terse.slice(0, 5).map((q) => q.ref).join(', ')}); ` +
        'check that the parent context carries their meaning.',
    );
  }
  gates.push(
    gate(
      'text_quality',
      'Question text is clean',
      dirty.length === 0,
      true,
      0.1,
      dirty.length === 0
        ? 'No CID artefacts, margin text, collapsed word runs or empty questions.'
        : `${dirty.length} questions look corrupted: ${dirty.slice(0, 5).map((q) => q.ref).join(', ')}`,
    ),
  );
  if (dirty.length) errorCodes.add('E016_TEXT_QUALITY');

  // --- G8: figure references resolved --------------------------------------
  const missingFigures = questions.filter((q) => q.errorCodes.includes('E014_FIGURE_MISSING'));
  gates.push(
    gate(
      'figures',
      'Referenced figures were captured',
      missingFigures.length === 0,
      false,
      0.05,
      missingFigures.length === 0
        ? 'All figure references resolved.'
        : `${missingFigures.length} questions reference a figure that was not captured: ` +
          missingFigures.slice(0, 5).map((q) => q.ref).join(', '),
    ),
  );
  if (missingFigures.length) errorCodes.add('E014_FIGURE_MISSING');

  // --- G9: types are storable ----------------------------------------------
  const allowed = new Set([
    'mcq',
    'true_false',
    'short_answer',
    'essay',
    'structured',
    'context',
    'calculation',
    'fill_blank',
    'numeric',
  ]);
  const badTypes = questions.filter((q) => !allowed.has(q.questionType));
  gates.push(
    gate(
      'types',
      'Every question type is storable',
      badTypes.length === 0,
      true,
      0.05,
      badTypes.length === 0
        ? 'All types satisfy the questions table constraint.'
        : `unstorable types: ${[...new Set(badTypes.map((q) => q.questionType))].join(', ')}`,
    ),
  );

  // --- Score ----------------------------------------------------------------
  const totalWeight = gates.reduce((sum, g) => sum + g.weight, 0);
  const earned = gates.reduce((sum, g) => sum + (g.passed ? g.weight : 0), 0);
  const confidence = totalWeight > 0 ? earned / totalWeight : 0;

  const hardFailures = gates.filter((g) => g.hard && !g.passed).map((g) => g.id);

  for (const q of questions) {
    for (const code of q.errorCodes) errorCodes.add(code);
  }

  if (qpOnly.length > 0) {
    warnings.push(`Questions with no mark scheme: ${[...qpOnly].sort(compareQuestionIds).join(', ')}`);
  }

  return {
    gates,
    confidence: Number(confidence.toFixed(3)),
    hardFailures,
    errorCodes: [...errorCodes],
    warnings,
  };
}

/** Marks derived from the mark scheme when the paper had no tag at all. */
export function applyMarksDefaults(
  questions: ExtractedQuestion[],
  profile: BoardProfile,
): number {
  if (!profile.marksDefaults) return 0;

  let applied = 0;
  for (const question of questions) {
    if (question.marks > 0 || question.isContextOnly) continue;
    const fallback = profile.marksDefaults[question.questionType];
    if (fallback) {
      question.marks = fallback;
      question.errorCodes.push('E011_MARKS_INFERRED');
      question.confidence = Math.min(question.confidence, 0.6);
      applied += 1;
    }
  }
  return applied;
}

/** Ensure every referenced parent exists, synthesising context rows as needed. */
export function synthesiseMissingParents(questions: ExtractedQuestion[]): ExtractedQuestion[] {
  const byRef = new Map(questions.map((q) => [q.ref, q]));
  const added: ExtractedQuestion[] = [];

  for (const question of questions) {
    let parentRef = question.parentRef;
    while (parentRef && !byRef.has(parentRef)) {
      const parsed = parseQuestionId(parentRef);
      const synthetic: ExtractedQuestion = {
        ref: parentRef,
        questionNumber: parsed.number,
        partLabel: parsed.partLabel,
        parentRef: parsed.partLabel ? String(parsed.number) : null,
        questionText: '',
        contextText: null,
        isContextOnly: true,
        needsAnswer: false,
        questionType: 'context',
        marks: 0,
        displayOrder: 0,
        options: null,
        subInputs: null,
        tableData: null,
        sectionName: null,
        sourcePage: question.sourcePage,
        sourceBBox: null,
        markScheme: null,
        correctAnswer: null,
        figures: [],
        confidence: 0.5,
        errorCodes: ['E004_SYNTHESISED_PARENT'],
      };
      byRef.set(parentRef, synthetic);
      added.push(synthetic);
      parentRef = synthetic.parentRef;
    }
  }

  return added;
}
