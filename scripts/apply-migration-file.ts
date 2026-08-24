/**
 * Apply ONE migration file to the linked Supabase project.
 *
 *   npx tsx scripts/apply-migration-file.ts supabase/migrations/<file>.sql [--dry-run]
 *
 * The repo's existing scripts/apply-migrations.ts cannot be used for this: it
 * re-applies the whole base schema from docs/migration/, and it depends on an
 * `exec_sql` RPC that does not exist on this project. This runner uses the
 * Supabase Management API's database/query endpoint instead, and sends the file
 * as a single statement so DO blocks and dollar-quoting survive intact.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const file = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!file) {
  console.error('Usage: tsx scripts/apply-migration-file.ts <path-to.sql> [--dry-run]');
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!token || !url) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL in the environment.');
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\./)?.[1];
if (!projectRef) {
  console.error(`Could not read a project ref from NEXT_PUBLIC_SUPABASE_URL (${url}).`);
  process.exit(1);
}

async function query(sql: string): Promise<unknown> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

async function main(): Promise<void> {
  const full = path.resolve(file);
  const sql = fs.readFileSync(full, 'utf-8');

  console.log(`Project : ${projectRef}`);
  console.log(`File    : ${path.relative(process.cwd(), full)} (${sql.length} bytes)`);

  if (dryRun) {
    // Roll back so the statements are validated without being kept.
    console.log('Mode    : DRY RUN (wrapped in a transaction and rolled back)\n');
    await query(`BEGIN;\n${sql}\nROLLBACK;`);
    console.log('Dry run succeeded — every statement is valid. Nothing was kept.');
    return;
  }

  console.log('Mode    : APPLY\n');
  await query(sql);
  console.log('Migration applied.');
}

main().catch((error) => {
  console.error('\nMigration failed:\n', (error as Error).message.slice(0, 2000));
  process.exit(1);
});
