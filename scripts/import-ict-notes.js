/**
 * Publish the IGCSE ICT 0417 theory and practical notes into the `notes` table.
 *
 * The note bodies live in the repository under content/ict-0417/notes, already
 * written in the markup HtmlNoteRenderer styles (page-header / section /
 * section-body / sub, device-card, adv-dis, comp-table, check, recap ...), so
 * this script only reads them, works out a read time and upserts one note per
 * topic. There is no cleaning step: what is in the file is what is published.
 *
 * Usage:
 *   node scripts/import-ict-notes.js [--dry-run] [--only=slug-prefix]
 *   node scripts/import-ict-notes.js --restore-preserved [--dry-run]
 *
 * --restore-preserved does not publish anything. It clears the rendered_html on
 * the preserved topics so the revision-notes page falls back to their original
 * content_md again - see PRESERVED_SLUG_PREFIXES below.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESTORE_PRESERVED = args.includes('--restore-preserved');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice('--only='.length) || null;

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'ict-0417', 'notes');
const BACKUP_DIR = path.join(__dirname, '..', 'ict-notes-backup');

/**
 * Topics whose notes must never be overwritten by this script.
 *
 * "Networks and the Effects of Using Them" is the reference version the other
 * topics were written to match. Its text lives in the note's `content_md`, which
 * is what the revision-notes page drew until rendered_html was given priority;
 * an earlier bulk import then wrote a *different* version of the topic into
 * `rendered_html`, which now shadows it. Restoring the topic therefore means
 * clearing that rendered_html, not writing anything new - see --restore-preserved.
 *
 * The topic is deliberately not in SECTIONS and is refused in the publish loop
 * as well, so a mistyped --only or a stray file cannot overwrite it.
 */
const PRESERVED_SLUG_PREFIXES = ['networks-and-the-effects'];

/**
 * One note per topic. `slugPrefixes` are matched against the start of the topic
 * slug in the database; the first topic that matches wins.
 */
const SECTIONS = [
  {
    file: '01-types-and-components.html',
    slugPrefixes: ['types-and-components'],
    title: 'Types and Components of Computer Systems',
  },
  {
    file: '02-input-and-output-devices.html',
    slugPrefixes: ['input-and-output-devices'],
    title: 'Input and Output Devices',
  },
  {
    file: '03-storage-devices-and-media.html',
    slugPrefixes: ['storage-devices-and-media'],
    title: 'Storage Devices and Media',
  },
  // Topic 4, Networks and the Effects of Using Them, is intentionally absent.
  {
    file: '05-the-effects-of-using-it.html',
    slugPrefixes: ['the-effects-of-using-it'],
    title: 'The Effects of Using IT',
  },
  {
    file: '06-ict-applications.html',
    slugPrefixes: ['ict-applications'],
    title: 'ICT Applications',
  },
  {
    file: '07-the-systems-life-cycle.html',
    slugPrefixes: ['the-systems-life-cycle'],
    title: 'The Systems Life Cycle',
  },
  {
    file: '08-safety-and-security.html',
    slugPrefixes: ['safety-and-security'],
    title: 'Safety and Security',
  },
  {
    file: '09-audience.html',
    slugPrefixes: ['audience'],
    title: 'Audience',
  },
  {
    file: '10-communication.html',
    slugPrefixes: ['communication'],
    title: 'Communication',
  },
  {
    file: '11-file-management.html',
    slugPrefixes: ['file-management'],
    title: 'File Management',
  },
  {
    file: '12-document-production.html',
    slugPrefixes: ['document-production'],
    title: 'Document Production',
  },
  {
    file: '13-databases.html',
    slugPrefixes: ['databases', 'database'],
    title: 'Databases',
  },
  {
    file: '14-presentations.html',
    slugPrefixes: ['presentations', 'presentation'],
    title: 'Presentations',
  },
  {
    file: '15-spreadsheets.html',
    slugPrefixes: ['spreadsheets', 'spreadsheet'],
    title: 'Spreadsheets',
  },
  {
    file: '16-web-authoring.html',
    slugPrefixes: ['web-authoring', 'website-authoring'],
    title: 'Web Authoring',
  },
];

// ---------------------------------------------------------------- REST helpers

function authHeaders(extra = {}) {
  return { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra };
}

async function restGet(pathAndQuery) {
  const res = await fetch(`${BASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: authHeaders({ Accept: 'application/json' }),
  });
  if (!res.ok) throw new Error(`GET ${pathAndQuery} failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function restWrite(method, pathAndQuery, data) {
  const res = await fetch(`${BASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: authHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(data),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} failed ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// --------------------------------------------------------------------- helpers

function estimateReadTime(html) {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function isPreserved(slug) {
  return PRESERVED_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}

function selectedSections() {
  if (!ONLY) return SECTIONS;
  return SECTIONS.filter((section) => section.slugPrefixes.some((p) => p.startsWith(ONLY)));
}

/** Note rows on the preserved topics, with the fields that decide what is drawn. */
async function preservedNotes(topics) {
  const rows = [];
  for (const topic of topics.filter((t) => isPreserved(t.slug))) {
    const notes = await restGet(
      `notes?select=id,title,rendered_html,content_md&topic_id=eq.${topic.id}&order=display_order`
    );
    rows.push(...notes.map((note) => ({ topic, note })));
  }
  return rows;
}

/**
 * Put a preserved topic back to the version the revision-notes page drew before
 * rendered_html took priority, by clearing the rendered_html that shadows its
 * markdown. The cleared HTML is written to ict-notes-backup/ first, so nothing
 * is lost if it turns out to be wanted after all.
 */
async function restorePreserved(topics) {
  const rows = await preservedNotes(topics);
  if (rows.length === 0) {
    console.log('No notes found on the preserved topics - nothing to restore.');
    return;
  }

  let restored = 0;
  for (const { topic, note } of rows) {
    const shadowed = Boolean(note.rendered_html && note.rendered_html.trim());
    const markdown = (note.content_md || '').trim();

    if (!shadowed) {
      console.log(`= ${topic.name}: already drawn from content_md - nothing to do`);
      continue;
    }
    if (!markdown) {
      // Clearing here would leave the topic with no content at all.
      console.log(
        `! ${topic.name}: rendered_html is set but content_md is empty - refusing to clear it.\n` +
          '  Nothing was changed. This topic has no earlier version to fall back to.'
      );
      continue;
    }

    console.log(
      `${topic.name}\n  clearing rendered_html (${(note.rendered_html.length / 1024).toFixed(1)} KB)` +
        ` so content_md (${(markdown.length / 1024).toFixed(1)} KB) is drawn again`
    );
    if (DRY_RUN) continue;

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backup = path.join(BACKUP_DIR, `${topic.slug}-${note.id}.html`);
    fs.writeFileSync(backup, note.rendered_html, 'utf8');
    console.log(`  backed up to ${path.relative(process.cwd(), backup)}`);

    await restWrite('PATCH', `notes?id=eq.${note.id}`, {
      rendered_html: null,
      updated_at: new Date().toISOString(),
    });
    restored += 1;
  }

  console.log(`\n=== Done: ${restored} note(s) restored ===`);
}

/** Warn when a preserved topic is showing something other than its own markdown. */
async function warnIfShadowed(topics) {
  const shadowed = (await preservedNotes(topics)).filter(
    ({ note }) => note.rendered_html && note.rendered_html.trim() && (note.content_md || '').trim()
  );
  for (const { topic } of shadowed) {
    console.log(
      `! ${topic.name} is preserved, but an imported rendered_html is shadowing its markdown.\n` +
        '  Run with --restore-preserved to draw the original version again.'
    );
  }
}

// ------------------------------------------------------------------------ main

let BASE_URL;

async function main() {
  const mode = RESTORE_PRESERVED ? 'restore preserved topics' : 'publish';
  console.log(`=== IGA Prep: ICT 0417 notes - ${mode} ===`);
  console.log(`Source: ${CONTENT_DIR}${DRY_RUN ? '  (dry run)' : ''}`);
  console.log(`Preserved, never overwritten: ${PRESERVED_SLUG_PREFIXES.join(', ')}\n`);

  const sections = RESTORE_PRESERVED ? [] : selectedSections();
  if (!RESTORE_PRESERVED && sections.length === 0) {
    throw new Error(`No note matches --only=${ONLY}`);
  }

  const subjects = await restGet('subjects?select=id,name,slug,code');
  const subject =
    subjects.find((s) => s.code === '0417') ||
    subjects.find((s) => /information and communication technology/i.test(s.name));
  if (!subject) throw new Error('ICT (0417) subject not found');
  console.log(`Subject: ${subject.name} (${subject.code})\n`);

  const topics = await restGet(
    `topics?select=id,name,slug,display_order&subject_id=eq.${subject.id}&order=display_order`
  );

  if (RESTORE_PRESERVED) {
    await restorePreserved(topics);
    return;
  }

  let written = 0;
  let skipped = 0;

  for (const section of sections) {
    const topic = topics.find((t) => section.slugPrefixes.some((p) => t.slug.startsWith(p)));
    if (!topic) {
      console.log(`! No topic matching "${section.slugPrefixes[0]}" - skipped`);
      skipped += 1;
      continue;
    }

    if (isPreserved(topic.slug)) {
      console.log(`= ${topic.name} is preserved - left untouched`);
      skipped += 1;
      continue;
    }

    const html = fs.readFileSync(path.join(CONTENT_DIR, section.file), 'utf8').trim();
    const readTime = estimateReadTime(html);
    console.log(
      `${topic.name}\n  ${section.file} -> ${(html.length / 1024).toFixed(1)} KB, ~${readTime} min`
    );

    if (DRY_RUN) continue;

    const existing = await restGet(
      `notes?select=id,title,display_order,rendered_html,content_md&topic_id=eq.${topic.id}` +
        '&order=display_order'
    );

    // Publishing overwrites whatever is on the topic now, so keep a copy first.
    for (const note of existing) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(BACKUP_DIR, `${topic.slug}-${note.id}.before.json`),
        JSON.stringify(
          { id: note.id, title: note.title, rendered_html: note.rendered_html, content_md: note.content_md },
          null,
          2
        ),
        'utf8'
      );
    }

    const payload = {
      title: section.title,
      rendered_html: html,
      estimated_read_time: readTime,
      is_downloadable: true,
      visibility: 'public',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing.length > 0) {
      // Every note on the topic gets the same content, so duplicate rows cannot
      // leave a stale version showing depending on which one is picked first.
      for (const note of existing) {
        await restWrite('PATCH', `notes?id=eq.${note.id}`, payload);
      }
      console.log(`  updated ${existing.length} existing note row(s)`);
    } else {
      await restWrite('POST', 'notes', {
        ...payload,
        slug: `${topic.slug}-notes`,
        subject_id: subject.id,
        topic_id: topic.id,
        content_md: '',
        display_order: 0,
        has_latex: false,
        view_count: 0,
      });
      console.log('  created new note');
    }
    written += 1;
  }

  console.log(`\n=== Done: ${written} published, ${skipped} skipped ===`);
  await warnIfShadowed(topics);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

BASE_URL = SUPABASE_URL.replace(/\/$/, '');

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
