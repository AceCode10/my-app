import type { BoardProfile } from './profiles/types';
import type { ParsedDocument } from './types';

/**
 * Client for the Python PDF service.
 *
 * The service is the only layer that touches PDF bytes. When it is unreachable
 * the caller degrades rather than failing: see `PdfServiceUnavailableError`,
 * which the pipeline turns into `degraded_mode='pdfjs'` plus
 * `figures_pending=true`, with a retry that re-runs the figures stage alone.
 */

// Reconciled to a single value. Previously src/lib/python-pdf-parser.ts
// defaulted to :5000 while all three API routes used :5001, so a local run
// silently hit different services depending on the entry point.
export const DEFAULT_PYTHON_PARSER_URL = 'http://localhost:5001';

export function pythonParserUrl(): string {
  return process.env.PYTHON_PARSER_URL || DEFAULT_PYTHON_PARSER_URL;
}

export class PdfServiceUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'PdfServiceUnavailableError';
  }
}

export interface RawMarkSchemeEntry {
  ref: string;
  answerText: string;
  marks: number | null;
  points: string[];
  answerMap: Record<string, string> | null;
  sourcePage: number;
}

export interface RawMarkScheme {
  entries: RawMarkSchemeEntry[];
  statedMaxMarks: number | null;
  totalMarks: number;
  answerTableCount: number;
  strategy: 'plumber_table_qam';
  warnings: string[];
}

export interface RawFigurePage {
  index: number;
  figures: { bbox: number[]; kind: string; label: string | null; png?: string }[];
  tableRegions: { bbox: number[]; kind: string }[];
}

interface RequestOptions {
  timeoutMs?: number;
  /** Railway cold starts can take 20-30s; one slow retry beats degrading. */
  retries?: number;
}

async function postFile<T>(
  path: string,
  file: Uint8Array,
  filename: string,
  fields: Record<string, string>,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = 120_000, retries = 1 } = options;
  const url = `${pythonParserUrl()}${path}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const form = new FormData();
      // Copy into a fresh ArrayBuffer so Blob gets an exact, standalone view.
      const bytes = new Uint8Array(file.byteLength);
      bytes.set(file);
      form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, value);
      }

      const response = await fetch(url, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`${path} returned ${response.status}: ${body.slice(0, 300)}`);
      }

      const payload = (await response.json()) as { success: boolean; data?: T; error?: string };
      if (!payload.success || !payload.data) {
        throw new Error(payload.error || `${path} returned no data`);
      }
      return payload.data;
    } catch (error) {
      lastError = error;
      // Give a cold-starting service one longer chance before degrading.
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  throw new PdfServiceUnavailableError(
    `Python PDF service unreachable at ${url}: ${(lastError as Error)?.message ?? lastError}`,
    lastError,
  );
}

export async function isPdfServiceAvailable(timeoutMs = 5000): Promise<boolean> {
  try {
    const response = await fetch(`${pythonParserUrl()}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { features?: { v2_extraction?: boolean } };
    return Boolean(body.features?.v2_extraction);
  } catch {
    return false;
  }
}

/** PDF -> canonical ParsedDocument. */
export async function extractDocument(
  file: Uint8Array,
  filename: string,
  profile: BoardProfile,
  opts: { withFigures?: boolean; renderFigures?: boolean; maxPages?: number } = {},
): Promise<ParsedDocument> {
  const fields: Record<string, string> = {
    indentBands: JSON.stringify(profile.structure.indentBands),
    withFigures: opts.withFigures === false ? 'false' : 'true',
    renderFigures: opts.renderFigures ? 'true' : 'false',
    captionPattern: profile.figureRefs.source,
  };
  if (opts.maxPages) fields.maxPages = String(opts.maxPages);

  return postFile<ParsedDocument>('/v2/extract', file, filename, fields, {
    timeoutMs: 180_000,
  });
}

/** Mark-scheme PDF -> deterministic answer entries. Empty list means escalate. */
export async function extractMarkScheme(
  file: Uint8Array,
  filename: string,
  profile: BoardProfile,
): Promise<RawMarkScheme> {
  return postFile<RawMarkScheme>(
    '/v2/mark-scheme',
    file,
    filename,
    {
      qidPattern: profile.markScheme.qidRegex.source,
      headerPattern: profile.markScheme.headerMatch.source,
    },
    { timeoutMs: 180_000 },
  );
}

/** Figure crops as base64 PNGs, per page. */
export async function extractFigures(
  file: Uint8Array,
  filename: string,
  profile: BoardProfile,
  opts: { render?: boolean } = {},
): Promise<RawFigurePage[]> {
  const data = await postFile<{ pages: RawFigurePage[] }>(
    '/v2/figures',
    file,
    filename,
    {
      render: opts.render === false ? 'false' : 'true',
      captionPattern: profile.figureRefs.source,
    },
    { timeoutMs: 240_000 },
  );
  return data.pages;
}
