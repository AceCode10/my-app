/**
 * Preview (and optionally apply) the past_papers identifier normalisation.
 *
 *   npx tsx scripts/normalise-paper-identifiers.ts            # dry run, default
 *   npx tsx scripts/normalise-paper-identifiers.ts --apply    # write changes
 *
 * The dry run lists every row that would change, before and after, plus the
 * label each row will render as on the past-papers page. It writes nothing.
 *
 * The WHERE clause and the CASE expressions here are the same ones in
 * supabase/migrations/20260827_normalise_paper_identifiers.sql — keep them in
 * step if either is edited.
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apply = process.argv.includes('--apply');

if (!token || !url) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\./)?.[1];
if (!projectRef) {
  console.error(`Could not read a project ref from ${url}.`);
  process.exit(1);
}

/** Rows come back as whatever the SELECT projected; the caller knows the shape. */
type Row = Record<string, unknown>;

async function query(sql: string): Promise<Row[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await response.text();
  if (!response.ok) throw new Error(text.slice(0, 800));
  return text ? JSON.parse(text) : [];
}

/** Derived paper digit — '02' is Paper 2, not Paper 0. */
const DERIVED_PAPER = `CASE WHEN left(variant, 1) = '0' THEN right(variant, 1) ELSE left(variant, 1) END`;
const DERIVED_VARIANT = `CASE WHEN left(variant, 1) = '0' THEN NULL ELSE right(variant, 1) END`;

const TARGET_ROWS = `
  component_code IS NOT NULL
  AND component_code !~ '^[0-9]+$'
  AND variant ~ '^[0-9]{2}$'
  AND (
    paper_number !~ '^[Pp]aper [0-9]+$'
    OR substring(paper_number from '[0-9]+') = ${DERIVED_PAPER}
  )
`;

async function main(): Promise<void> {
  console.log(`Project : ${projectRef}`);
  console.log(`Mode    : ${apply ? 'APPLY' : 'DRY RUN (nothing is written)'}\n`);

  const changes = await query(`
    SELECT
      s.code AS subject,
      p.year,
      p.session,
      p.paper_number || ' | ' || p.component_code || ' | ' || COALESCE(p.variant, 'null') AS before,
      ${DERIVED_PAPER} || ' | ' || p.variant || ' | ' || COALESCE(${DERIVED_VARIANT}, 'null') AS after,
      'Paper ' || ${DERIVED_PAPER} || ' (' || s.code || '/' || p.variant || ')' AS renders_as
    FROM past_papers p
    LEFT JOIN subjects s ON s.id = p.subject_id
    WHERE ${TARGET_ROWS}
    ORDER BY s.code, ${DERIVED_PAPER}, p.variant, p.year;
  `);

  if (changes.length === 0) {
    console.log('Nothing to change — every row already uses the normalised shape.');
  } else {
    console.log(`${changes.length} row(s) would change (paper_number | component_code | variant):\n`);
    console.table(changes);
  }

  // Rows that look broken but are deliberately not touched, so the operator can
  // see the whole picture rather than assuming the job is finished.
  const skipped = await query(`
    SELECT
      s.code AS subject, p.year, p.session,
      p.paper_number, p.component_code, COALESCE(p.variant, 'null') AS variant,
      CASE
        WHEN p.component_code ~ '^[0-9]$'
          THEN 'AMBIGUOUS: one-digit code and no session — cannot derive the real code'
        WHEN p.variant IS NULL
          THEN 'no variant to recover the code from'
        ELSE 'paper_number contradicts the code in variant'
      END AS reason
    FROM past_papers p
    LEFT JOIN subjects s ON s.id = p.subject_id
    WHERE NOT (${TARGET_ROWS})
      AND (p.component_code !~ '^[0-9]{2}$' OR p.component_code IS NULL)
    ORDER BY s.code, p.paper_number, p.component_code;
  `);

  if (skipped.length > 0) {
    console.log(`\n${skipped.length} row(s) NOT changed:\n`);
    console.table(skipped);
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    return;
  }

  if (changes.length === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  await query(`
    UPDATE past_papers
    SET component_code = variant,
        paper_number = ${DERIVED_PAPER},
        variant = ${DERIVED_VARIANT},
        updated_at = now()
    WHERE ${TARGET_ROWS};
  `);

  const remaining = await query(`SELECT count(*)::int AS n FROM past_papers WHERE ${TARGET_ROWS};`);
  console.log(`\nApplied. Rows still matching the broken shape: ${remaining[0]?.n ?? 'unknown'}`);

  console.log('\nShapes now in the table:');
  console.table(
    await query(`
      SELECT s.code AS subject, p.paper_number, p.component_code,
             COALESCE(p.variant, 'null') AS variant, count(*)::int AS rows
      FROM past_papers p LEFT JOIN subjects s ON s.id = p.subject_id
      GROUP BY 1, 2, 3, 4
      ORDER BY 1, p.paper_number, p.component_code;
    `),
  );
}

main().catch((error) => {
  console.error(`\nFailed:\n${(error as Error).message.slice(0, 1500)}`);
  process.exit(1);
});
