/**
 * Read-only coverage report for AI test generation.
 *
 * Answers the two questions that decide whether generation actually works for a
 * given subject:
 *   1. Can we calibrate timing? (>= 3 published papers with marks and duration)
 *   2. Is there enough exportable content? (root questions with no paper_id,
 *      since past-paper content cannot go into a downloadable PDF)
 *
 * Makes no writes. Safe to run against production.
 *
 *   npx tsx scripts/test-generation-coverage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const PAGE = 1000;

interface SubjectRow {
  id: string;
  name: string | null;
  display_name: string | null;
  code: string | null;
  level: string | null;
  status: string | null;
}

interface PaperRow {
  subject_id: string | null;
  total_marks: number | null;
  duration_minutes: number | null;
}

interface QuestionRow {
  subject_id: string | null;
  marks: number | null;
  paper_id: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Supabase caps a response at 1000 rows; walk the whole table in pages. */
async function fetchAll<T>(
  table: string,
  columns: string,
  refine: (q: any) => any = (q) => q,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await refine(
      supabase.from(table).select(columns).range(from, from + PAGE - 1),
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

function label(s: SubjectRow): string {
  const name = s.display_name ?? s.name ?? 'Unnamed';
  const bits = [s.level, name, s.code ? `(${s.code})` : null].filter(Boolean);
  return bits.join(' ');
}

function pad(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value.padEnd(width);
}

async function main() {
  console.log(`Supabase project: ${new URL(supabaseUrl!).host}`);
  console.log('Mode: READ ONLY\n');

  const subjects = await fetchAll<SubjectRow>(
    'subjects',
    'id, name, display_name, code, level, status',
  );

  const papers = await fetchAll<PaperRow>(
    'past_papers',
    'subject_id, total_marks, duration_minutes',
    (q) => q.eq('status', 'published'),
  );

  const questions = await fetchAll<QuestionRow>(
    'questions',
    'subject_id, marks, paper_id',
    (q) => q.eq('status', 'published').is('parent_question_id', null),
  );

  // ---- timing calibration ----------------------------------------------
  const calibratable = new Map<string, { count: number; marks: number; minutes: number }>();
  for (const p of papers) {
    if (!p.subject_id) continue;
    if (!p.total_marks || !p.duration_minutes) continue;
    if (p.total_marks <= 0 || p.duration_minutes <= 0) continue;
    const entry = calibratable.get(p.subject_id) ?? { count: 0, marks: 0, minutes: 0 };
    entry.count += 1;
    entry.marks += p.total_marks;
    entry.minutes += p.duration_minutes;
    calibratable.set(p.subject_id, entry);
  }

  // ---- question bank ----------------------------------------------------
  interface Bank {
    total: number;
    original: number;
    pastPaper: number;
    originalMarks: number;
    pastPaperMarks: number;
  }
  const bank = new Map<string, Bank>();
  for (const q of questions) {
    if (!q.subject_id) continue;
    const entry =
      bank.get(q.subject_id) ??
      { total: 0, original: 0, pastPaper: 0, originalMarks: 0, pastPaperMarks: 0 };
    entry.total += 1;
    if (q.paper_id) {
      entry.pastPaper += 1;
      entry.pastPaperMarks += q.marks ?? 0;
    } else {
      entry.original += 1;
      entry.originalMarks += q.marks ?? 0;
    }
    bank.set(q.subject_id, entry);
  }

  const active = subjects
    .filter((s) => bank.has(s.id) || calibratable.has(s.id))
    .sort((a, b) => (bank.get(b.id)?.total ?? 0) - (bank.get(a.id)?.total ?? 0));

  console.log(
    `${pad('SUBJECT', 34)}${pad('PAPERS', 8)}${pad('RATE', 8)}${pad('ROOTS', 8)}${pad('ORIG', 8)}${pad('ORIG MARKS', 12)}`,
  );
  console.log('-'.repeat(78));

  for (const s of active) {
    const cal = calibratable.get(s.id);
    const b = bank.get(s.id);

    const rate =
      cal && cal.count >= 3 && cal.minutes > 0
        ? (cal.marks / cal.minutes).toFixed(2)
        : 'fallback';

    console.log(
      pad(label(s), 34) +
        pad(String(cal?.count ?? 0), 8) +
        pad(rate, 8) +
        pad(String(b?.total ?? 0), 8) +
        pad(String(b?.original ?? 0), 8) +
        pad(String(b?.originalMarks ?? 0), 12),
    );
  }

  // ---- totals -----------------------------------------------------------
  const totals = [...bank.values()].reduce(
    (acc, b) => ({
      total: acc.total + b.total,
      original: acc.original + b.original,
      originalMarks: acc.originalMarks + b.originalMarks,
      pastPaperMarks: acc.pastPaperMarks + b.pastPaperMarks,
    }),
    { total: 0, original: 0, originalMarks: 0, pastPaperMarks: 0 },
  );

  const calibrated = [...calibratable.values()].filter((c) => c.count >= 3).length;

  console.log('\n--- summary ---');
  console.log(`Subjects with any content:      ${active.length}`);
  console.log(`Subjects with timing calibration: ${calibrated} (rest fall back to 1.0 marks/min)`);
  console.log(`Published root questions:       ${totals.total}`);
  console.log(
    `  original (exportable):        ${totals.original} (${pct(totals.original, totals.total)})`,
  );
  console.log(
    `  from past papers:             ${totals.total - totals.original} (${pct(
      totals.total - totals.original,
      totals.total,
    )})`,
  );
  console.log(`Exportable marks available:     ${totals.originalMarks}`);
  console.log(`Past-paper marks (blocked):     ${totals.pastPaperMarks}`);

  // A 40 minute test needs roughly 40 marks of exportable content per subject.
  const viable = active.filter((s) => (bank.get(s.id)?.originalMarks ?? 0) >= 40);
  console.log(
    `\nSubjects that can fill a 40-mark PDF from original content: ${viable.length} of ${active.length}`,
  );
  if (viable.length > 0) {
    for (const s of viable.slice(0, 10)) {
      console.log(`  - ${label(s)}: ${bank.get(s.id)!.originalMarks} marks`);
    }
  }
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
