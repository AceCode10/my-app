import type { SupabaseClient } from '@supabase/supabase-js';
import type { LlmProvider } from '../llm';
import { extractFigures } from './pdf-client';
import { mirrorToQuestionBank, type MirrorResult } from './mirror-to-question-bank';
import { persistQuestions, upsertPaper, type PersistResult } from './persist';
import type { PaperResult } from './pipeline';
import { buildIngestionKey } from './filename-parser';
import type { FileRef, PipelineOptions } from './types';
import type { PairedPaper } from './pairing';

const PAST_PAPERS_BUCKET = 'past-papers';

/**
 * Ensure the source PDF is in storage and return its public URL.
 *
 * `past_papers.paper_url` is NOT NULL, and a paper row that does not point at
 * its own source is not much use to a teacher anyway. Paths are deterministic,
 * so a re-run overwrites rather than accumulating copies.
 */
async function uploadSource(
  supabase: SupabaseClient,
  ref: FileRef,
  key: string,
  docType: 'qp' | 'ms',
  readFile: (ref: FileRef) => Promise<Uint8Array>,
  warnings: string[],
): Promise<string | null> {
  const path = `ingested/${key.replace(/\|/g, '/')}/${docType}.pdf`;
  try {
    const bytes = await readFile(ref);
    const { error } = await supabase.storage
      .from(PAST_PAPERS_BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from(PAST_PAPERS_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (error) {
    warnings.push(`Uploading ${ref.name} failed: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Turn an in-memory PaperResult into database rows.
 *
 * Kept separate from `runPaper` so a dry run is genuinely side-effect free:
 * nothing here executes unless the caller asks for it.
 */

export interface PersistOutcome {
  paperId: string;
  paperCreated: boolean;
  questions: PersistResult;
  mirror: MirrorResult | null;
  warnings: string[];
}

export async function persistPaperResult(
  supabase: SupabaseClient,
  result: PaperResult,
  pair: PairedPaper,
  options: PipelineOptions & { jobId?: string; llm?: LlmProvider },
  deps: { readFile: (ref: FileRef) => Promise<Uint8Array> },
): Promise<PersistOutcome> {
  const warnings: string[] = [];

  const marksTotal = result.questions.reduce((sum, q) => sum + q.marks, 0);

  const ingestionKey = buildIngestionKey(result.meta);
  const questionPaperUrl = pair.questionPaper
    ? await uploadSource(supabase, pair.questionPaper, ingestionKey, 'qp', deps.readFile, warnings)
    : null;
  const markSchemeUrl = pair.markScheme
    ? await uploadSource(supabase, pair.markScheme, ingestionKey, 'ms', deps.readFile, warnings)
    : null;

  const { paperId, created } = await upsertPaper(supabase, result.meta, options, {
    totalMarks: marksTotal,
    questionPaperUrl: questionPaperUrl ?? undefined,
    markSchemeUrl: markSchemeUrl ?? undefined,
  });

  // Figure PNGs are rendered only now, so a dry run never pays for them.
  if (options.figures && result.figureCount > 0 && pair.questionPaper) {
    try {
      const bytes = await deps.readFile(pair.questionPaper);
      const pages = await extractFigures(bytes, pair.questionPaper.name, result.profile, {
        render: true,
      });

      const byPage = new Map(pages.map((p) => [p.index, p.figures]));
      for (const question of result.questions) {
        const rendered = byPage.get(question.sourcePage);
        if (!rendered) continue;
        for (const figure of question.figures) {
          // Match on position; bboxes come from the same detector, so they align.
          const hit = rendered.find(
            (r) => Math.abs(r.bbox[1] - figure.bbox[1]) < 2 && Math.abs(r.bbox[0] - figure.bbox[0]) < 2,
          );
          if (hit?.png) figure.png = hit.png;
        }
      }
    } catch (error) {
      warnings.push(`Rendering figures failed, continuing without images: ${(error as Error).message}`);
    }
  }

  const questions = await persistQuestions(supabase, paperId, result.questions, result.meta, {
    ...options,
    jobId: options.jobId,
    boardCode: result.profile.dbExamBoardCode ?? 'unknown',
  });
  warnings.push(...questions.warnings);

  let mirror: MirrorResult | null = null;
  if (options.mirror) {
    // A paper that failed a hard gate is mirrored as draft, never published,
    // so flagged content cannot reach a teacher's test builder.
    const publish =
      options.autoPublish &&
      result.status === 'completed' &&
      result.validation.hardFailures.length === 0;

    mirror = await mirrorToQuestionBank(supabase, paperId, result.questions, questions.idByRef, {
      ...options,
      jobId: options.jobId,
      llm: options.llm,
      publish,
    });
    warnings.push(...mirror.warnings);
  }

  return { paperId, paperCreated: created, questions, mirror, warnings };
}

export interface FilesOnlyOutcome {
  paperId: string;
  paperCreated: boolean;
  questionPaperUrl: string | null;
  markSchemeUrl: string | null;
  warnings: string[];
}

/**
 * Upload a pair's PDFs and create or refresh its `past_papers` row — nothing else.
 *
 * This is the download-library path: no PDF service, no language model, no
 * question extraction. Metadata comes from the filename, which is also where
 * `ingestion_key` comes from, so a later full ingest lands on exactly the same
 * row and fills in everything this step could not know.
 *
 * Writes are null-safe for that reason: a row that a full ingest already
 * enriched must not lose its marks, duration or status to a filename-only pass.
 */
export async function persistPaperFiles(
  supabase: SupabaseClient,
  pair: PairedPaper,
  options: PipelineOptions,
  deps: { readFile: (ref: FileRef) => Promise<Uint8Array> },
): Promise<FilesOnlyOutcome> {
  const warnings: string[] = [];
  const ingestionKey = buildIngestionKey(pair.meta);

  const questionPaperUrl = pair.questionPaper
    ? await uploadSource(supabase, pair.questionPaper, ingestionKey, 'qp', deps.readFile, warnings)
    : null;
  const markSchemeUrl = pair.markScheme
    ? await uploadSource(supabase, pair.markScheme, ingestionKey, 'ms', deps.readFile, warnings)
    : null;

  const { paperId, created } = await upsertPaper(supabase, pair.meta, options, {
    questionPaperUrl: questionPaperUrl ?? undefined,
    markSchemeUrl: markSchemeUrl ?? undefined,
    nullSafe: true,
  });

  return { paperId, paperCreated: created, questionPaperUrl, markSchemeUrl, warnings };
}
