import type { LlmProvider } from '../../llm';
import { extractMarkScheme as fetchMarkScheme, type RawMarkScheme } from '../pdf-client';
import type { BoardProfile } from '../profiles/types';
import { normalizeQuestionId } from '../question-id';
import type { MarkSchemeEntry, ParsedMarkScheme } from '../types';

/**
 * Mark-scheme extraction: deterministic first, language model only if needed.
 *
 * Cambridge publishes answers as `Question | Answer | Marks` tables, and a pure
 * table parse recovers them on 34 of 36 mark schemes in the corpus, with 99% of
 * entries carrying an answer. Edexcel, OCR, AQA, AP and IB publish no such
 * table — Edexcel leads with "General Marking Guidance", OCR with
 * "Annotation | Meaning" — so those escalate to the LLM.
 */

/** Escalate when the table parse recovered fewer ids than this share of the QP. */
const COVERAGE_THRESHOLD = 0.8;

function toEntries(raw: RawMarkScheme): MarkSchemeEntry[] {
  const entries: MarkSchemeEntry[] = [];

  for (const entry of raw.entries) {
    const ref = normalizeQuestionId(entry.ref);
    if (!ref) continue;
    entries.push({
      ref,
      answerText: entry.answerText ?? '',
      marks: entry.marks,
      points: entry.points ?? [],
      answerMap: entry.answerMap ?? undefined,
      sourcePage: entry.sourcePage ?? 0,
    });
  }

  return entries;
}

interface LlmMarkSchemeResponse {
  answers: {
    question: string;
    answer: string;
    marks?: number | string | null;
    points?: string[];
  }[];
}

const LLM_SYSTEM = `You extract model answers from examination mark schemes.

Return every answer that belongs to a specific numbered question.

RULES
1. "question" must be the question identifier exactly as printed: "4", "2(a)", "11(b)(i)".
2. "answer" is the full acceptable-answer text for that question.
3. "points" is the list of individual acceptable answer points, one per marking point.
   A lead-in such as "Four from:", "Three matched pairs from:" is NOT a point - drop it.
4. "marks" is the maximum mark for that question as an integer.
5. IGNORE everything that is not an answer to a numbered question:
   generic marking principles, marking guidance, annotation tables, abbreviation
   keys, grade thresholds, page furniture, and examiner instructions.
6. Do not invent questions. If a question has no answer in the document, omit it.`;

async function llmStrategy(
  markSchemeText: string,
  llm: LlmProvider,
  expectedRefs: string[],
): Promise<{ entries: MarkSchemeEntry[]; warnings: string[]; usedLlm: true }> {
  const warnings: string[] = [];

  // Chunk long documents so a 30-page Edexcel scheme cannot truncate.
  const CHUNK = 60_000;
  const chunks: string[] = [];
  for (let i = 0; i < markSchemeText.length; i += CHUNK) {
    chunks.push(markSchemeText.slice(i, i + CHUNK));
  }

  const merged = new Map<string, MarkSchemeEntry>();

  for (const [index, chunk] of chunks.entries()) {
    const hint = expectedRefs.length
      ? `\n\nThe question paper contains these question identifiers; prefer them when labelling answers:\n${expectedRefs.join(', ')}`
      : '';

    const result = await llm.complete<LlmMarkSchemeResponse>({
      system: LLM_SYSTEM,
      user: `Mark scheme text (part ${index + 1} of ${chunks.length}):\n\n${chunk}${hint}`,
      jsonSchema: {
        answers: [{ question: '4', answer: 'string', marks: 1, points: ['string'] }],
      },
      maxTokens: 8192,
    });

    for (const answer of result.json?.answers ?? []) {
      const ref = normalizeQuestionId(String(answer.question ?? ''));
      if (!ref || merged.has(ref)) continue;

      const marks =
        answer.marks === null || answer.marks === undefined
          ? null
          : Number.parseInt(String(answer.marks), 10);

      merged.set(ref, {
        ref,
        answerText: String(answer.answer ?? '').trim(),
        marks: Number.isFinite(marks as number) ? (marks as number) : null,
        points: Array.isArray(answer.points) ? answer.points.filter(Boolean).map(String) : [],
        sourcePage: 0,
      });
    }
  }

  if (merged.size === 0) {
    warnings.push('The language model returned no usable answers for this mark scheme.');
  }

  return { entries: [...merged.values()], warnings, usedLlm: true };
}

export interface MarkSchemeOptions {
  /** Canonical refs found in the question paper, used to gauge coverage. */
  expectedRefs: string[];
  llm?: LlmProvider;
  /** Plain text of the mark scheme, needed only if the LLM strategy runs. */
  fallbackText?: string;
}

export async function parseMarkScheme(
  file: Uint8Array,
  filename: string,
  profile: BoardProfile,
  options: MarkSchemeOptions,
): Promise<ParsedMarkScheme & { usedLlm: boolean }> {
  const warnings: string[] = [];
  const strategies = profile.markScheme.strategies;

  let entries: MarkSchemeEntry[] = [];
  let statedMaxMarks: number | null = null;
  let strategy: ParsedMarkScheme['strategy'] = 'llm';

  const wantsTable =
    strategies.includes('plumber_table_qam') || strategies.includes('plumber_table_generic');

  if (wantsTable) {
    try {
      const raw = await fetchMarkScheme(file, filename, profile);
      entries = toEntries(raw);
      statedMaxMarks = raw.statedMaxMarks;
      strategy = strategies.includes('plumber_table_qam')
        ? 'plumber_table_qam'
        : 'plumber_table_generic';
      warnings.push(...(raw.warnings ?? []));
    } catch (error) {
      warnings.push(`Table strategy failed: ${(error as Error).message}`);
    }
  }

  const expected = options.expectedRefs.length;
  const coverage = expected > 0 ? entries.length / expected : entries.length > 0 ? 1 : 0;
  const needsLlm = strategies.includes('llm') && coverage < COVERAGE_THRESHOLD;

  if (needsLlm && options.llm && options.fallbackText) {
    if (entries.length > 0) {
      warnings.push(
        `Table strategy recovered ${entries.length} of ${expected} expected answers ` +
          `(${Math.round(coverage * 100)}%); escalating to the language model.`,
      );
    }

    const llmResult = await llmStrategy(options.fallbackText, options.llm, options.expectedRefs);
    warnings.push(...llmResult.warnings);

    // Prefer deterministic entries; the model fills only what the table missed.
    const byRef = new Map(entries.map((e) => [e.ref, e]));
    for (const entry of llmResult.entries) {
      if (!byRef.has(entry.ref)) byRef.set(entry.ref, entry);
    }
    entries = [...byRef.values()];
    strategy = 'llm';

    return { entries, statedMaxMarks, strategy, warnings, usedLlm: true };
  }

  if (needsLlm && (!options.llm || !options.fallbackText)) {
    warnings.push(
      `Only ${entries.length} of ${expected} answers were recovered and no language model ` +
        'was available to escalate to.',
    );
  }

  return { entries, statedMaxMarks, strategy, warnings, usedLlm: false };
}
