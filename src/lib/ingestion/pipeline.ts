import type { LlmProvider } from '../llm';
import { probeHeader, reconcileMetadata } from './header-probe';
import { joinAnswers, stubsForUnmatched } from './join';
import { parseMarkScheme } from './mark-scheme';
import { extractDocument, PdfServiceUnavailableError } from './pdf-client';
import { getProfile, resolveProfile } from './profiles';
import type { BoardProfile } from './profiles/types';
import { classifyQuestions } from './structure/classify';
import { segmentQuestions } from './structure/segment-questions';
import type {
  ExtractedQuestion,
  FileRef,
  MarkSchemeEntry,
  PaperMeta,
  PipelineEvent,
  PipelineOptions,
  ValidationReport,
} from './types';
import { DEFAULT_PIPELINE_OPTIONS } from './types';
import { applyMarksDefaults, runGates, synthesiseMissingParents } from './validation/gates';
import type { PairedPaper } from './pairing';

/**
 * The ingestion orchestrator, shared verbatim by the CLI and the API route.
 *
 * Dependencies are injected so the same code can read from the local file
 * system (CLI, `--dry-run`) or from Supabase storage (API), and so a dry run
 * performs no writes at all.
 */

export interface PipelineDeps {
  readFile: (ref: FileRef) => Promise<Uint8Array>;
  llm?: LlmProvider;
  log?: (event: PipelineEvent) => void;
}

export interface PaperResult {
  pairKey: string;
  meta: PaperMeta;
  profile: BoardProfile;
  questions: ExtractedQuestion[];
  markSchemeEntries: MarkSchemeEntry[];
  validation: ValidationReport;
  /** Sum of every mark tag found in the question paper. */
  markTagTotal: number;
  markTagCount: number;
  answersMatched: number;
  msOnly: string[];
  qpOnly: string[];
  figureCount: number;
  usedLlm: boolean;
  degradedMode: 'pdfjs' | 'vision' | null;
  warnings: string[];
  errors: string[];
  status: 'completed' | 'completed_with_warnings' | 'needs_review' | 'failed';
}

function emit(deps: PipelineDeps, event: PipelineEvent): void {
  deps.log?.(event);
}

/**
 * Run every stage for one QP/MS pair and return the fully-joined result.
 * Performs no database or storage writes — persistence is a separate step so
 * `--dry-run` is genuinely side-effect free.
 */
export async function runPaper(
  pair: PairedPaper,
  deps: PipelineDeps,
  options: Partial<PipelineOptions> = {},
): Promise<PaperResult> {
  const opts: PipelineOptions = { ...DEFAULT_PIPELINE_OPTIONS, ...options };
  const warnings: string[] = [...pair.issues];
  const errors: string[] = [];

  let profile = getProfile(opts.profileId ?? pair.meta.profileId);
  let meta = pair.meta;
  let degradedMode: PaperResult['degradedMode'] = null;
  let usedLlm = false;

  const fail = (message: string): PaperResult => {
    errors.push(message);
    return {
      pairKey: pair.pairKey,
      meta,
      profile,
      questions: [],
      markSchemeEntries: [],
      validation: { gates: [], confidence: 0, hardFailures: [], errorCodes: [], warnings: [] },
      markTagTotal: 0,
      markTagCount: 0,
      answersMatched: 0,
      msOnly: [],
      qpOnly: [],
      figureCount: 0,
      usedLlm,
      degradedMode,
      warnings,
      errors,
      status: 'failed',
    };
  };

  if (!pair.questionPaper) {
    return fail('No question paper in this pair; nothing to extract.');
  }

  // --- text -----------------------------------------------------------------
  emit(deps, { level: 'info', stage: 'text', message: `Extracting ${pair.questionPaper.name}` });

  let qpBytes: Uint8Array;
  try {
    qpBytes = await deps.readFile(pair.questionPaper);
  } catch (error) {
    return fail(`Could not read the question paper: ${(error as Error).message}`);
  }

  let document;
  try {
    document = await extractDocument(qpBytes, pair.questionPaper.name, profile, {
      withFigures: opts.figures,
      renderFigures: false,
    });
  } catch (error) {
    if (error instanceof PdfServiceUnavailableError) {
      degradedMode = 'pdfjs';
      return fail(
        `The PDF service is unreachable, so this paper could not be parsed: ${error.message}`,
      );
    }
    return fail(`Question paper extraction failed: ${(error as Error).message}`);
  }

  warnings.push(...document.warnings);

  // --- probe: confirm the board and the metadata from the paper itself ------
  const detection = resolveProfile({
    filename: pair.questionPaper.name,
    headerText: document.headerText,
    override: opts.profileId ?? null,
  });
  if (detection.profile.id !== profile.id && detection.reason === 'text') {
    emit(deps, {
      level: 'info',
      stage: 'probe',
      message: `Board reclassified ${profile.id} -> ${detection.profile.id} from the paper's own text`,
    });
    profile = detection.profile;
  }

  const probe = probeHeader(document.headerText, profile);
  const reconciled = reconcileMetadata(meta, probe, profile);
  meta = reconciled.meta;
  warnings.push(...reconciled.conflicts.map((c) => `Metadata conflict — ${c}`));

  // --- structure ------------------------------------------------------------
  const segment = segmentQuestions(document, profile);
  warnings.push(...segment.warnings);

  if (segment.questions.length === 0) {
    return fail('No questions could be segmented from the question paper.');
  }

  // --- classify -------------------------------------------------------------
  const classified = classifyQuestions(segment.questions, document, profile);
  let questions = classified.questions;

  const synthesised = synthesiseMissingParents(questions);
  if (synthesised.length > 0) {
    questions = [...questions, ...synthesised].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  applyMarksDefaults(questions, profile);

  const figureCount = questions.reduce((sum, q) => sum + q.figures.length, 0);

  // --- mark scheme ----------------------------------------------------------
  let markSchemeEntries: MarkSchemeEntry[] = [];
  let statedTotalMs: number | null = null;

  if (pair.markScheme) {
    emit(deps, { level: 'info', stage: 'markScheme', message: `Parsing ${pair.markScheme.name}` });
    try {
      const msBytes = await deps.readFile(pair.markScheme);
      const expectedRefs = questions.filter((q) => !q.isContextOnly).map((q) => q.ref);

      // Only fetch the plain text when an LLM escalation is actually possible.
      let fallbackText: string | undefined;
      if (deps.llm && profile.markScheme.strategies.includes('llm')) {
        try {
          const msDoc = await extractDocument(msBytes, pair.markScheme.name, profile, {
            withFigures: false,
          });
          fallbackText = msDoc.pages.map((p) => p.text).join('\n\n');
        } catch {
          // A missing fallback text simply disables the escalation.
        }
      }

      const parsed = await parseMarkScheme(msBytes, pair.markScheme.name, profile, {
        expectedRefs,
        llm: deps.llm,
        fallbackText,
      });

      markSchemeEntries = parsed.entries;
      statedTotalMs = parsed.statedMaxMarks;
      usedLlm = usedLlm || parsed.usedLlm;
      warnings.push(...parsed.warnings);
    } catch (error) {
      warnings.push(`Mark scheme parsing failed: ${(error as Error).message}`);
    }
  }

  // --- join -----------------------------------------------------------------
  const join = joinAnswers(questions, markSchemeEntries);
  warnings.push(...join.warnings);

  if (join.msOnly.length > 0) {
    // Never discard an answer: keep it as a flagged stub for admin review.
    const stubs = stubsForUnmatched(join.msOnly, markSchemeEntries);
    questions = [...join.questions, ...stubs];
  } else {
    questions = join.questions;
  }

  // --- validate -------------------------------------------------------------
  const validation = runGates({
    questions,
    markSchemeEntries,
    profile,
    markTagTotal: segment.totalMarkTags,
    statedTotalQp: meta.statedTotalMarks,
    statedTotalMs,
    msOnly: join.msOnly,
    qpOnly: join.qpOnly,
    hasMarkScheme: Boolean(pair.markScheme) && markSchemeEntries.length > 0,
  });
  warnings.push(...validation.warnings);

  const status: PaperResult['status'] =
    validation.hardFailures.length > 0 || validation.confidence < 0.75
      ? 'needs_review'
      : validation.confidence >= opts.confidenceGate
        ? 'completed'
        : 'completed_with_warnings';

  emit(deps, {
    level: status === 'completed' ? 'info' : 'warn',
    stage: 'gate',
    message: `${pair.pairKey}: ${questions.length} questions, confidence ${validation.confidence}, ${status}`,
  });

  return {
    pairKey: pair.pairKey,
    meta,
    profile,
    questions,
    markSchemeEntries,
    validation,
    markTagTotal: segment.totalMarkTags,
    markTagCount: segment.markTagCount,
    answersMatched: join.matched,
    msOnly: join.msOnly,
    qpOnly: join.qpOnly,
    figureCount,
    usedLlm,
    degradedMode,
    warnings,
    errors,
    status,
  };
}
