import { compareQuestionIds, normalizeQuestionId, parseQuestionId } from './question-id';
import type { ExtractedQuestion, MarkSchemeEntry, TableData } from './types';

/**
 * Attach mark-scheme answers to extracted questions.
 *
 * On Cambridge this is plain string equality — the mark scheme's column 0 emits
 * exactly the canonical id format. Elsewhere the two documents can disagree on
 * granularity, so there is a recovery ladder before anything is declared
 * unmatched, and nothing is ever silently dropped.
 */

export interface JoinResult {
  questions: ExtractedQuestion[];
  matched: number;
  /** Mark-scheme ids with no question to attach to. */
  msOnly: string[];
  /** Answerable questions left with no mark scheme. */
  qpOnly: string[];
  warnings: string[];
  errorCodes: string[];
}

function renderAnswer(entry: MarkSchemeEntry): string {
  if (entry.points.length > 0) {
    return entry.points.map((p) => `- ${p}`).join('\n');
  }
  return entry.answerText.trim();
}

/** The single best short answer, for `correct_answer`. */
function primaryAnswer(entry: MarkSchemeEntry): string {
  if (entry.answerMap) {
    return Object.entries(entry.answerMap)
      .map(([row, column]) => `${row} -> ${column}`)
      .join('; ');
  }
  if (entry.points.length === 1) return entry.points[0];
  if (entry.points.length > 1) return entry.points[0];
  return entry.answerText.split('\n')[0]?.trim() ?? '';
}

/**
 * Split a coarse answer cell that covers several parts inline, e.g. a mark
 * scheme row "4" whose body reads "(a) ... (b) ...".
 */
function splitInlineParts(entry: MarkSchemeEntry): Map<string, string> | null {
  const body = entry.answerText;
  const matches = [...body.matchAll(/\(([a-z])\)\s*/gi)];
  if (matches.length < 2) return null;

  const { number } = parseQuestionId(entry.ref);
  const out = new Map<string, string>();

  for (let i = 0; i < matches.length; i += 1) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? body.length : body.length;
    const text = body.slice(start, end).trim();
    if (!text) continue;
    out.set(`${number}(${matches[i][1].toLowerCase()})`, text);
  }

  return out.size >= 2 ? out : null;
}

export function joinAnswers(
  questions: ExtractedQuestion[],
  entries: MarkSchemeEntry[],
): JoinResult {
  const warnings: string[] = [];
  const errorCodes: string[] = [];

  const byRef = new Map<string, ExtractedQuestion>();
  for (const question of questions) byRef.set(question.ref, question);

  const msByRef = new Map<string, MarkSchemeEntry>();
  for (const entry of entries) {
    const ref = normalizeQuestionId(entry.ref);
    if (ref) msByRef.set(ref, { ...entry, ref });
  }

  const consumed = new Set<string>();
  let matched = 0;

  const attach = (question: ExtractedQuestion, entry: MarkSchemeEntry, scope?: string): void => {
    const rendered = renderAnswer(entry);
    // A row that matched but carries no text is a CAPTURE failure, not a
    // missing answer. Reporting it as "no answer at all" would send an admin
    // hunting in the wrong document, so it gets its own code and a placeholder
    // that records what is known (the mark allocation).
    if (!rendered.trim() && !entry.answerMap) {
      question.markScheme = `[Answer content not captured — see the mark scheme for ${entry.ref}]`;
      question.correctAnswer = '';
      question.errorCodes.push('E017_ANSWER_EMPTY');
      question.confidence = Math.min(question.confidence, 0.5);
      if (question.marks === 0 && entry.marks && !question.isContextOnly) {
        question.marks = entry.marks;
        question.errorCodes = question.errorCodes.filter((c) => c !== 'E010_NO_MARK_TAG');
      }
      if (scope) warnings.push(scope);
      matched += 1;
      return;
    }

    question.markScheme = rendered;
    question.correctAnswer = primaryAnswer(entry);
    if (entry.answerMap && question.tableData) {
      question.tableData = { ...question.tableData, answerMap: entry.answerMap } as TableData;
    }
    // The mark scheme is authoritative for marks when the paper had no tag.
    if (question.marks === 0 && entry.marks && !question.isContextOnly) {
      question.marks = entry.marks;
      question.errorCodes = question.errorCodes.filter((c) => c !== 'E010_NO_MARK_TAG');
    }
    if (scope) warnings.push(scope);
    matched += 1;
  };

  // --- Rung 1: exact match -------------------------------------------------
  for (const question of questions) {
    const entry = msByRef.get(question.ref);
    if (entry) {
      attach(question, entry);
      consumed.add(question.ref);
    }
  }

  // --- Rung 2: mark scheme is COARSER than the paper ------------------------
  // MS has "4"; paper has "4(a)", "4(b)".
  for (const [ref, entry] of msByRef) {
    if (consumed.has(ref)) continue;
    if (byRef.has(ref) && byRef.get(ref)!.markScheme) continue;

    const children = questions.filter((q) => q.parentRef === ref && !q.markScheme);
    if (children.length === 0) continue;

    const inline = splitInlineParts(entry);
    if (inline) {
      let used = false;
      for (const child of children) {
        const text = inline.get(child.ref);
        if (!text) continue;
        attach(child, { ...entry, answerText: text, points: [], marks: child.marks || entry.marks });
        used = true;
      }
      if (used) {
        consumed.add(ref);
        continue;
      }
    }

    // No inline split available: attach the whole cell to the parent as
    // reference, and copy it down so no child is left with nothing.
    const parent = byRef.get(ref);
    if (parent) {
      attach(parent, entry, `Mark scheme ${ref} is coarser than the paper; attached to the parent.`);
    }
    for (const child of children) {
      child.markScheme = renderAnswer(entry);
      child.correctAnswer = primaryAnswer(entry);
      child.errorCodes.push('E013_MS_COARSER');
    }
    consumed.add(ref);
  }

  // --- Rung 3: mark scheme is FINER than the paper --------------------------
  // MS has "4(a)", "4(b)"; paper has only "4".
  for (const question of questions) {
    if (question.markScheme || question.isContextOnly) continue;

    const finer = [...msByRef.entries()]
      .filter(([ref]) => !consumed.has(ref))
      .filter(([ref]) => {
        try {
          const parsed = parseQuestionId(ref);
          return parsed.number === question.questionNumber && ref !== question.ref;
        } catch {
          return false;
        }
      })
      .sort((a, b) => compareQuestionIds(a[0], b[0]));

    if (finer.length === 0) continue;

    question.markScheme = finer
      .map(([ref, entry]) => `**${ref}**\n${renderAnswer(entry)}`)
      .join('\n\n');
    question.correctAnswer = primaryAnswer(finer[0][1]);
    question.errorCodes.push('E013_MS_FINER');
    warnings.push(
      `Mark scheme is finer than the paper for question ${question.ref}; ` +
        `merged ${finer.map(([r]) => r).join(', ')}.`,
    );
    for (const [ref] of finer) consumed.add(ref);
    matched += 1;
  }

  // --- Report what is still unmatched --------------------------------------
  const msOnly = [...msByRef.keys()].filter((ref) => !consumed.has(ref)).sort(compareQuestionIds);

  const qpOnly = questions
    .filter((q) => !q.markScheme && q.needsAnswer && q.marks > 0)
    .map((q) => q.ref)
    .sort(compareQuestionIds);

  for (const ref of qpOnly) {
    const question = byRef.get(ref);
    if (question) question.errorCodes.push('E013_QP_ID_UNMATCHED');
  }

  if (msOnly.length > 0) {
    errorCodes.push('E012_MS_ID_UNMATCHED');
    warnings.push(`Mark scheme ids with no matching question: ${msOnly.join(', ')}.`);
  }
  if (qpOnly.length > 0) {
    errorCodes.push('E013_QP_ID_UNMATCHED');
    warnings.push(`Answerable questions with no mark scheme: ${qpOnly.join(', ')}.`);
  }

  return { questions, matched, msOnly, qpOnly, warnings, errorCodes };
}

/**
 * Build stub questions for mark-scheme ids the paper never yielded, so an
 * answer is never silently discarded. Stubs are flagged and are NOT mirrored
 * into the question bank.
 */
export function stubsForUnmatched(
  msOnly: string[],
  entries: MarkSchemeEntry[],
): ExtractedQuestion[] {
  const byRef = new Map(entries.map((e) => [normalizeQuestionId(e.ref) ?? e.ref, e]));

  return msOnly.flatMap((ref) => {
    const entry = byRef.get(ref);
    if (!entry) return [];
    const parsed = parseQuestionId(ref);
    return [
      {
        ref,
        questionNumber: parsed.number,
        partLabel: parsed.partLabel,
        parentRef: null,
        questionText: '[Question text not extracted - see the source PDF]',
        contextText: null,
        isContextOnly: false,
        needsAnswer: true,
        questionType: 'short_answer',
        marks: entry.marks ?? 0,
        displayOrder: 0,
        options: null,
        subInputs: null,
        tableData: null,
        sectionName: null,
        sourcePage: entry.sourcePage,
        sourceBBox: null,
        markScheme: renderAnswer(entry),
        correctAnswer: primaryAnswer(entry),
        figures: [],
        confidence: 0.2,
        errorCodes: ['E012_MS_ID_UNMATCHED'],
      } satisfies ExtractedQuestion,
    ];
  });
}
