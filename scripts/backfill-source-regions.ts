/**
 * Backfill source regions for papers ingested before regions existed.
 *
 *   npx tsx scripts/backfill-source-regions.ts [--subject-id <uuid>] [--paper <uuid>]
 *       [--limit N] [--sheet out.pdf] [--apply]
 *
 * Re-parses each stored question paper with the same segmentation the
 * pipeline uses, matches rows by question_ref, and writes source_regions /
 * source_label to paper_questions and their mirrored questions rows. A row is
 * written only when the freshly extracted text agrees with the stored text, so
 * a paper whose rows were extracted some other way is left alone.
 *
 * Dry run by default. `--sheet` writes every matched question, drawn from its
 * regions, into one PDF for eyeballing before `--apply`.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

import { extractDocument, isPdfServiceAvailable, pythonParserUrl } from '../src/lib/ingestion/pdf-client';
import { resolveProfile } from '../src/lib/ingestion/profiles';
import { segmentQuestions } from '../src/lib/ingestion/structure/segment-questions';
import type { ExtractedQuestion } from '../src/lib/ingestion/types';
import { composeTestPdf, type SourceQuestion } from '../src/lib/pdf/compose-test-pdf';

interface Args {
  subjectId?: string;
  paper?: string;
  limit?: number;
  sheet?: string;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case '--subject-id': args.subjectId = next(); break;
      case '--paper': args.paper = next(); break;
      case '--limit': args.limit = Number(next()); break;
      case '--sheet': args.sheet = next(); break;
      case '--apply': args.apply = true; break;
      default: throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  return args;
}

/** First 40 letters/digits, lower-cased: tolerant of whitespace and punctuation drift. */
function fingerprint(text: string | null | undefined): string {
  return (text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
}

interface StoredRow {
  id: string;
  question_ref: string | null;
  question_text: string | null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  if (!(await isPdfServiceAvailable())) {
    throw new Error(`PDF service is not reachable at ${pythonParserUrl()}. Start it: cd python-parser && PORT=5001 python app.py`);
  }
  const supabase = createClient(url, key);

  let query = supabase.from('past_papers').select('id, title, subject_id, question_paper_url, paper_url').order('id');
  if (args.paper) query = query.eq('id', args.paper);
  if (args.subjectId) query = query.eq('subject_id', args.subjectId);
  const { data: papers, error } = await query;
  if (error) throw error;

  const totals = { papers: 0, rows: 0, matched: 0, textMismatch: 0, missing: 0, noRegions: 0, written: 0 };
  const sheetItems: SourceQuestion[] = [];
  const pdfCache = new Map<string, ArrayBuffer>();

  for (const paper of papers ?? []) {
    if (args.limit !== undefined && totals.papers >= args.limit) break;

    const { data: rows, error: rowsError } = await supabase
      .from('paper_questions')
      .select('id, question_ref, question_text')
      .eq('paper_id', paper.id)
      .is('archived_at', null);
    if (rowsError) throw rowsError;
    if (!rows || rows.length === 0) continue;

    const pdfUrl: string | null = paper.question_paper_url || paper.paper_url;
    if (!pdfUrl) {
      console.log(`- ${paper.title ?? paper.id}: no question paper URL, skipped`);
      continue;
    }
    totals.papers += 1;

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.log(`- ${paper.title ?? paper.id}: download failed (${response.status}), skipped`);
      continue;
    }
    const bytes = await response.arrayBuffer();
    pdfCache.set(pdfUrl, bytes);

    const filename = decodeURIComponent(pdfUrl.split('/').pop() ?? 'paper.pdf');
    const initial = resolveProfile({ filename });
    const document = await extractDocument(new Uint8Array(bytes), filename, initial.profile, {
      withFigures: true,
      renderFigures: false,
    });
    const { profile } = resolveProfile({ filename, headerText: document.headerText });
    const fresh = segmentQuestions(document, profile).questions;
    const freshByRef = new Map(fresh.map((q) => [q.ref, q]));

    const counts = { matched: 0, textMismatch: 0, missing: 0, noRegions: 0 };
    const updates: { row: StoredRow; question: ExtractedQuestion }[] = [];

    for (const row of rows as StoredRow[]) {
      const question = row.question_ref ? freshByRef.get(row.question_ref) : undefined;
      if (!question) { counts.missing += 1; continue; }
      if (fingerprint(question.questionText) !== fingerprint(row.question_text)) { counts.textMismatch += 1; continue; }
      if (question.sourceRegions.length === 0) { counts.noRegions += 1; continue; }
      counts.matched += 1;
      updates.push({ row, question });
    }

    totals.rows += rows.length;
    totals.matched += counts.matched;
    totals.textMismatch += counts.textMismatch;
    totals.missing += counts.missing;
    totals.noRegions += counts.noRegions;
    console.log(
      `- ${paper.title ?? paper.id} [${profile.id}]: ${rows.length} rows, ${counts.matched} matched, ` +
        `${counts.textMismatch} text mismatch, ${counts.missing} not re-found, ${counts.noRegions} without regions`,
    );

    if (args.sheet) {
      // One sheet entry per top-level question, numbered as in the paper.
      const matchedRefs = new Set(updates.map((u) => u.question.ref));
      const byNumber = new Map<number, ExtractedQuestion[]>();
      for (const q of fresh) {
        if (!matchedRefs.has(q.ref)) continue;
        if (!byNumber.has(q.questionNumber)) byNumber.set(q.questionNumber, []);
        byNumber.get(q.questionNumber)!.push(q);
      }
      for (const [number, group] of byNumber) {
        sheetItems.push({
          kind: 'source',
          number,
          pdfUrl,
          regions: group.flatMap((q) => q.sourceRegions),
          label: group.find((q) => q.sourceLabel)?.sourceLabel ?? null,
        });
      }
    }

    if (args.apply) {
      for (const { row, question } of updates) {
        const values = { source_regions: question.sourceRegions, source_label: question.sourceLabel };
        const { error: pqError } = await supabase.from('paper_questions').update(values).eq('id', row.id);
        if (pqError) throw pqError;
        const { error: qError } = await supabase.from('questions').update(values).eq('source_paper_question_id', row.id);
        if (qError) throw qError;
        totals.written += 1;
      }
    }
  }

  console.log('\nTotals', totals);
  if (!args.apply) console.log('Dry run: nothing written. Re-run with --apply to write.');

  if (args.sheet && sheetItems.length > 0) {
    const pdf = await composeTestPdf({
      items: sheetItems,
      footer: { center: 'Source-region backfill check', right: '' },
      fetchPdf: async (u) => pdfCache.get(u)!,
    });
    fs.writeFileSync(path.resolve(args.sheet), pdf);
    console.log(`Sheet: ${args.sheet} (${sheetItems.length} questions)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
