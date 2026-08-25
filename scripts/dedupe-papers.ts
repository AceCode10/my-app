/**
 * Retire hand-created `past_papers` rows that the ingestion pipeline has since
 * superseded.
 *
 *   npm run dedupe-papers -- --subject-id <uuid>          # report only
 *   npm run dedupe-papers -- --subject-id <uuid> --apply  # archive the losers
 *
 * Two eras of rows sit in this table. Rows with an `ingestion_key` came from
 * the pipeline and carry the parsed marks, duration and component code. Rows
 * without one were entered by hand, and for a sitting that has since been
 * ingested they are pure duplicates — students see the same paper twice.
 *
 * NOTHING IS EVER DELETED. `questions.paper_id` and `assessment_attempts
 * .paper_id` both cascade on delete, so removing a row would take a student's
 * attempt history with it. The duplicate is set to `status = 'archived'`,
 * which every student, teacher and public view already filters out, and the
 * row and its children stay on disk.
 */

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

/** Columns worth rescuing from a duplicate before it is archived. */
const BACKFILL_COLUMNS = [
  'exam_board',
  'exam_board_id',
  'level',
  'duration_minutes',
  'total_marks',
  'examiner_report_url',
  'insert_url',
  'grade_thresholds_url',
  'specimen_url',
  'source_files_url',
] as const;

interface PaperRow {
  id: string;
  title: string | null;
  subject_id: string | null;
  year: number | null;
  session: string | null;
  paper_number: string | number | null;
  variant: string | null;
  component_code: string | null;
  status: string | null;
  ingestion_key: string | null;
  paper_url: string | null;
  mark_scheme_url: string | null;
  created_at: string | null;
  [key: string]: unknown;
}

interface Args {
  subjectId?: string;
  apply: boolean;
  backfill: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false, backfill: true };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--subject-id': args.subjectId = argv[++i]; break;
      case '--apply': args.apply = true; break;
      case '--no-backfill': args.backfill = false; break;
      case '--help':
      case '-h':
        console.log(`
Retire duplicate past_papers rows superseded by ingestion

  --subject-id <uuid>   Limit to one subject (default: every subject)
  --apply               Actually archive; without it this only reports
  --no-backfill         Do not copy the duplicate's extra columns to the survivor
`);
        process.exit(0);
        break;
      default:
        if (argv[i].startsWith('--')) {
          console.error(`Unknown flag: ${argv[i]}`);
          process.exit(1);
        }
    }
  }
  return args;
}

/** First digit in a value like "Paper 1", 1, or "1". */
function paperDigit(row: PaperRow): string | null {
  const fromNumber = String(row.paper_number ?? '').match(/\d/)?.[0];
  if (fromNumber) return fromNumber;
  return String(row.component_code ?? '').match(/\d/)?.[0] ?? null;
}

/**
 * Reduce a variant to its bare digit.
 *
 * Hand-entered rows put the component code in `variant` ("12" for paper 1
 * variant 2, "02" where the leading zero is padding). Ingested rows already
 * hold the digit alone. Both must reduce to the same thing.
 */
function variantDigit(raw: string | null, paper: string | null): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.length === 1) return value;
  if (value.length === 2 && (value[0] === paper || value[0] === '0')) return value[1];
  return value;
}

/** The sitting a row describes, independent of which era wrote it. */
function sittingKey(row: PaperRow): string | null {
  const paper = paperDigit(row);
  const variant = variantDigit(row.variant, paper);
  if (!row.subject_id || !row.year || !row.session || !paper) return null;
  return [row.subject_id, row.year, row.session, paper, variant ?? '-'].join('|');
}

async function countRefs(
  supabase: SupabaseClient,
  table: string,
  paperId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('paper_id', paperId);
  return error ? null : count ?? 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let query = supabase.from('past_papers').select('*');
  if (args.subjectId) query = query.eq('subject_id', args.subjectId);
  const { data, error } = await query;
  if (error) {
    console.error(`Reading past_papers failed: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as PaperRow[];
  const ingested = rows.filter((r) => r.ingestion_key);
  const legacy = rows.filter((r) => !r.ingestion_key);

  console.log(`\nRows: ${rows.length}  (ingested ${ingested.length}, hand-entered ${legacy.length})`);

  // A sitting can only have one ingested row — ingestion_key is unique — so a
  // plain map is enough.
  const survivorBySitting = new Map<string, PaperRow>();
  for (const row of ingested) {
    const sitting = sittingKey(row);
    if (sitting) survivorBySitting.set(sitting, row);
  }

  const duplicates: { legacy: PaperRow; survivor: PaperRow }[] = [];
  const untouched: PaperRow[] = [];

  for (const row of legacy) {
    const sitting = sittingKey(row);
    const survivor = sitting ? survivorBySitting.get(sitting) : undefined;
    if (survivor && survivor.id !== row.id) duplicates.push({ legacy: row, survivor });
    else untouched.push(row);
  }

  console.log(`Duplicates of an ingested sitting: ${duplicates.length}`);
  console.log(`Hand-entered rows with no ingested twin (left alone): ${untouched.length}\n`);

  if (duplicates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  console.log(`${'-'.repeat(78)}`);
  let withHistory = 0;

  for (const { legacy: dup, survivor } of duplicates) {
    const [questions, paperQuestions, attempts] = await Promise.all([
      countRefs(supabase, 'questions', dup.id),
      countRefs(supabase, 'paper_questions', dup.id),
      countRefs(supabase, 'assessment_attempts', dup.id),
    ]);
    const refs = (questions ?? 0) + (paperQuestions ?? 0) + (attempts ?? 0);
    if (refs > 0) withHistory += 1;

    const backfill: Record<string, unknown> = {};
    if (args.backfill) {
      for (const column of BACKFILL_COLUMNS) {
        const mine = dup[column];
        const theirs = survivor[column];
        if ((theirs === null || theirs === undefined) && mine !== null && mine !== undefined) {
          backfill[column] = mine;
        }
      }
    }

    console.log(`\narchive  ${dup.id}  ${dup.title ?? '(untitled)'}`);
    console.log(`  keeps    ${survivor.id}  ${survivor.ingestion_key}`);
    console.log(
      `  refs     questions=${questions ?? '?'} paper_questions=${paperQuestions ?? '?'} attempts=${attempts ?? '?'}` +
        (refs > 0 ? '   (rows kept; only the status changes)' : ''),
    );
    if (Object.keys(backfill).length > 0) {
      console.log(`  backfill ${Object.entries(backfill).map(([k, v]) => `${k}=${String(v)}`).join(' ')}`);
    }

    if (!args.apply) continue;

    if (Object.keys(backfill).length > 0) {
      const { error: backfillError } = await supabase
        .from('past_papers')
        .update(backfill)
        .eq('id', survivor.id);
      if (backfillError) {
        console.log(`  BACKFILL FAILED: ${backfillError.message}`);
      }
    }

    const { error: archiveError } = await supabase
      .from('past_papers')
      .update({ status: 'archived' })
      .eq('id', dup.id);
    if (archiveError) {
      console.log(`  ARCHIVE FAILED: ${archiveError.message}`);
    } else {
      console.log('  done');
    }
  }

  console.log(`\n${'-'.repeat(78)}`);
  if (args.apply) {
    console.log(`Archived ${duplicates.length} duplicate rows. Nothing was deleted.`);
  } else {
    console.log(
      `Report only — nothing was changed. Re-run with --apply to archive these ${duplicates.length} rows.`,
    );
  }
  if (withHistory > 0) {
    console.log(
      `${withHistory} of them still carry questions or attempts. Those rows and their ` +
        'children stay in the database; archiving only hides them from the paper lists.',
    );
  }
  if (untouched.length > 0) {
    console.log(`\nLeft alone (no ingested twin):`);
    for (const row of untouched) console.log(`  ${row.id}  ${row.title ?? '(untitled)'}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
