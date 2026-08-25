/**
 * Batch exam-paper ingestion CLI.
 *
 *   npm run ingest -- --dir "Information and Communication Technology (0417)" --dry-run
 *
 * Shares src/lib/ingestion/pipeline.ts verbatim with the API route; the only
 * difference is that files are read from disk here and from Supabase storage
 * there. `--dry-run` performs no writes of any kind.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Load the same env files Next.js does, so the CLI sees Supabase and LLM keys.
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

import { getLlmProvider } from '../src/lib/llm';
import { persistPaperResult } from '../src/lib/ingestion/persist-result';
import { pairDocuments } from '../src/lib/ingestion/pairing';
import { runPaper, type PaperResult } from '../src/lib/ingestion/pipeline';
import { isPdfServiceAvailable, pythonParserUrl } from '../src/lib/ingestion/pdf-client';
import { DEFAULT_PIPELINE_OPTIONS } from '../src/lib/ingestion/types';
import type { FileRef, PipelineOptions } from '../src/lib/ingestion/types';

interface CliArgs {
  dir?: string;
  files: string[];
  subjectId?: string;
  board?: string;
  profile?: string;
  level?: string;
  dryRun: boolean;
  mirror: boolean;
  figures: boolean;
  autoPublish: boolean;
  force: boolean;
  confidenceGate: number;
  concurrency: number;
  limit?: number;
  only?: string;
  report?: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    files: [],
    dryRun: false,
    mirror: true,
    figures: true,
    autoPublish: true,
    force: false,
    confidenceGate: 0.92,
    concurrency: 3,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];

    switch (arg) {
      case '--dir': args.dir = next(); break;
      case '--file': args.files.push(next()); break;
      case '--subject-id': args.subjectId = next(); break;
      case '--board': args.board = next(); break;
      case '--profile': args.profile = next(); break;
      case '--level': args.level = next(); break;
      case '--dry-run': args.dryRun = true; break;
      case '--no-mirror': args.mirror = false; break;
      case '--no-figures': args.figures = false; break;
      case '--no-auto-publish': args.autoPublish = false; break;
      case '--force': args.force = true; break;
      case '--confidence-gate': args.confidenceGate = Number(next()); break;
      case '--concurrency': args.concurrency = Number(next()); break;
      case '--limit': args.limit = Number(next()); break;
      case '--only': args.only = next(); break;
      case '--report': args.report = next(); break;
      case '--verbose': args.verbose = true; break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown flag: ${arg}`);
          process.exit(1);
        }
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Batch exam-paper ingestion

Usage:
  npm run ingest -- --dir <folder> [options]
  npm run ingest -- --file <a.pdf> --file <b.pdf> [options]

Options:
  --dir <path>            Recurse for PDFs (handles a Question Papers/ + mark schemes/ split)
  --file <path>           Single file; repeatable
  --subject-id <uuid>     Target subject; required unless --dry-run
  --board <code>          Force the exam board (CIE, EDEX, AQA, OCR, IB, AP)
  --profile <id>          Force the parser profile, skipping detection
  --level <id>            Qualification level (igcse, as, a2, ...)
  --dry-run               Parse and validate only; no database or storage writes
  --no-mirror             Populate paper_questions but not the question bank
  --no-figures            Skip figure detection and cropping
  --no-auto-publish       Ingest everything as draft
  --force                 Re-extract even when the file hash is unchanged
  --confidence-gate <n>   Auto-publish threshold (default 0.92)
  --concurrency <n>       Papers processed in parallel (default 3)
  --limit <n>             Stop after n papers
  --only <substring>      Only papers whose pair key or filename contains this
  --report <path.json>    Write a machine-readable report
  --verbose               Per-stage logging
`);
}

function collectPdfs(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

function formatRow(result: PaperResult): string {
  const marks = result.questions.reduce((s, q) => s + q.marks, 0);
  const stated = result.meta.statedTotalMarks ?? '-';
  const icon =
    result.status === 'completed' ? 'ok  ' :
    result.status === 'completed_with_warnings' ? 'warn' :
    result.status === 'needs_review' ? 'REVW' : 'FAIL';

  return [
    icon,
    result.pairKey.padEnd(34).slice(0, 34),
    `q=${String(result.questions.length).padStart(3)}`,
    `marks=${String(marks).padStart(3)}/${String(stated).padEnd(3)}`,
    `ans=${String(result.answersMatched).padStart(3)}`,
    `fig=${String(result.figureCount).padStart(2)}`,
    `conf=${result.validation.confidence.toFixed(2)}`,
    result.usedLlm ? 'LLM' : '   ',
  ].join('  ');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.dir && args.files.length === 0) {
    printHelp();
    console.error('Nothing to do: pass --dir or --file.');
    process.exit(1);
  }

  if (!args.dryRun && !args.subjectId) {
    console.error('--subject-id is required unless you pass --dry-run.');
    process.exit(1);
  }

  const available = await isPdfServiceAvailable();
  if (!available) {
    console.error(
      `The PDF service is not answering at ${pythonParserUrl()}.\n` +
        'Start it with:  cd python-parser && PORT=5001 python app.py\n' +
        'or point PYTHON_PARSER_URL at your deployed instance.',
    );
    process.exit(1);
  }

  let paths = args.dir ? collectPdfs(args.dir) : [];
  paths.push(...args.files);
  if (args.only) {
    const needle = args.only.toLowerCase();
    paths = paths.filter((p) => p.toLowerCase().includes(needle));
  }

  const refs: FileRef[] = paths.map((p) => ({
    name: path.basename(p),
    path: p,
    size: fs.statSync(p).size,
  }));

  const pairing = pairDocuments(refs, { overrideProfile: args.profile ?? null });

  console.log(`\nFiles: ${pairing.stats.files}`);
  console.log(
    `Pairs: ${pairing.pairs.length}  ` +
      `(complete ${pairing.stats.complete}, ` +
      `question-paper-only ${pairing.stats.questionPaperOnly}, ` +
      `mark-scheme-only ${pairing.stats.markSchemeOnly}, ` +
      `duplicates ${pairing.stats.duplicates})`,
  );
  for (const item of pairing.unresolved) {
    console.log(`  unresolved: ${item.file.name} — ${item.reason}`);
  }

  let runnable = pairing.pairs.filter((p) => p.questionPaper);
  if (args.limit) runnable = runnable.slice(0, args.limit);

  const fullOptions: PipelineOptions = {
    ...DEFAULT_PIPELINE_OPTIONS,
    dryRun: args.dryRun,
    mirror: args.mirror,
    figures: args.figures,
    autoPublish: args.autoPublish,
    confidenceGate: args.confidenceGate,
    force: args.force,
    subjectId: args.subjectId,
    level: args.level,
    profileId: args.profile as PipelineOptions['profileId'],
  };

  // A real run needs service-role credentials; a dry run needs none.
  let supabase: SupabaseClient | null = null;
  if (!args.dryRun) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error(
        'A live run needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
          'Add them to .env.local, or pass --dry-run to parse without writing.',
      );
      process.exit(1);
    }
    supabase = createClient(url, key, { auth: { persistSession: false } });
  }

  const hasLlmKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  const llm = hasLlmKey ? getLlmProvider() : undefined;
  if (!hasLlmKey) {
    console.log(
      'No ANTHROPIC_API_KEY or OPENAI_API_KEY set: running fully deterministically. ' +
        'Mark schemes on boards without an answer table will come back empty.',
    );
  }

  const deps = {
    readFile: async (ref: FileRef) => new Uint8Array(fs.readFileSync(ref.path)),
    llm,
    log: args.verbose
      ? (event: { level: string; stage: string; message: string }) =>
          console.log(`    [${event.stage}] ${event.message}`)
      : undefined,
  };

  console.log(`\nProcessing ${runnable.length} papers (concurrency ${args.concurrency})…\n`);
  const started = Date.now();

  let totalMirrored = 0;
  let totalPersisted = 0;

  const results = await mapWithConcurrency(runnable, args.concurrency, async (pair) => {
    try {
      const result = await runPaper(pair, deps, fullOptions);

      let suffix = '';
      if (supabase && result.status !== 'failed') {
        try {
          const outcome = await persistPaperResult(supabase, result, pair, { ...fullOptions, llm }, deps);
          totalPersisted += outcome.questions.inserted + outcome.questions.updated;
          totalMirrored += outcome.mirror?.mirrored ?? 0;
          suffix =
            `  saved=${outcome.questions.inserted}+${outcome.questions.updated}` +
            (outcome.questions.archived ? ` archived=${outcome.questions.archived}` : '') +
            (outcome.mirror ? ` bank=${outcome.mirror.mirrored}` : '');
          for (const warning of outcome.warnings) result.warnings.push(warning);
        } catch (error) {
          suffix = `  SAVE FAILED: ${(error as Error).message}`;
          result.errors.push(`Persisting failed: ${(error as Error).message}`);
        }
      }

      console.log(formatRow(result) + suffix);
      return result;
    } catch (error) {
      console.log(`FAIL  ${pair.pairKey}  ${(error as Error).message}`);
      return null;
    }
  });

  const ok = results.filter((r): r is PaperResult => r !== null);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const byStatus = (status: PaperResult['status']) => ok.filter((r) => r.status === status).length;
  const totalQuestions = ok.reduce((s, r) => s + r.questions.length, 0);
  const totalAnswers = ok.reduce((s, r) => s + r.answersMatched, 0);
  const totalFigures = ok.reduce((s, r) => s + r.figureCount, 0);
  const llmPapers = ok.filter((r) => r.usedLlm).length;

  console.log(`\n${'-'.repeat(78)}`);
  console.log(`Papers processed: ${ok.length}/${runnable.length} in ${elapsed}s`);
  console.log(
    `  completed ${byStatus('completed')}  ` +
      `with-warnings ${byStatus('completed_with_warnings')}  ` +
      `needs-review ${byStatus('needs_review')}  ` +
      `failed ${byStatus('failed')}`,
  );
  console.log(`Questions: ${totalQuestions}   answers matched: ${totalAnswers}   figures: ${totalFigures}`);
  console.log(`Papers that required a language model: ${llmPapers}`);

  if (args.dryRun) {
    console.log('\nDry run: nothing was written to the database or storage.');
  }

  const reviewNeeded = ok.filter((r) => r.status === 'needs_review' || r.status === 'failed');
  if (reviewNeeded.length > 0) {
    console.log(`\nPapers needing review (${reviewNeeded.length}):`);
    for (const result of reviewNeeded) {
      console.log(`  ${result.pairKey}`);
      for (const gate of result.validation.gates.filter((g) => !g.passed)) {
        console.log(`      ${gate.hard ? 'HARD' : 'soft'}  ${gate.label}: ${gate.detail}`);
      }
      for (const error of result.errors) console.log(`      error: ${error}`);
    }
  }

  if (args.report) {
    const payload = ok.map((r) => ({
      pairKey: r.pairKey,
      status: r.status,
      confidence: r.validation.confidence,
      meta: r.meta,
      questionCount: r.questions.length,
      answerableCount: r.questions.filter((q) => !q.isContextOnly).length,
      marksExtracted: r.questions.reduce((s, q) => s + q.marks, 0),
      markTagTotal: r.markTagTotal,
      statedTotal: r.meta.statedTotalMarks,
      answersMatched: r.answersMatched,
      msOnly: r.msOnly,
      qpOnly: r.qpOnly,
      figureCount: r.figureCount,
      usedLlm: r.usedLlm,
      gates: r.validation.gates,
      warnings: r.warnings,
      errors: r.errors,
      refs: r.questions.map((q) => ({ ref: q.ref, marks: q.marks, type: q.questionType })),
    }));
    fs.mkdirSync(path.dirname(path.resolve(args.report)), { recursive: true });
    fs.writeFileSync(args.report, JSON.stringify(payload, null, 2));
    console.log(`\nReport written to ${args.report}`);
  }

  const hardFailures = ok.filter((r) => r.status === 'failed').length;
  process.exit(hardFailures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
