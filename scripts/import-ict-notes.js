/**
 * Import the standalone IGCSE ICT 0417 theory notes (a folder of self-contained
 * HTML documents) into the `notes` table as rendered_html, one note per topic.
 *
 * The source documents carry their own sidebar, cross-file navigation and
 * "gap analysis" annotations. None of that survives the import: the app supplies
 * navigation, and the gap-analysis material is editorial scaffolding, not content.
 *
 * Usage:
 *   node scripts/import-ict-notes.js [path-to-notes-folder] [--dry-run]
 *
 * Default source folder: C:/Users/Denny/Downloads/ICT Notes/notes
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
// --out=DIR writes the processed HTML to disk for review instead of touching the DB
const OUT_DIR = (args.find((a) => a.startsWith('--out=')) || '').slice('--out='.length) || null;
const SOURCE_DIR = args.find((a) => !a.startsWith('--')) || 'C:/Users/Denny/Downloads/ICT Notes/notes';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const BASE_URL = SUPABASE_URL.replace(/\/$/, '');

/** One note per topic. `files` are concatenated in order into a single note. */
const SECTIONS = [
  { files: ['s1.html'], slugPrefix: 'types-and-components', title: 'Types and Components of Computer Systems' },
  { files: ['s2.html'], slugPrefix: 'input-and-output-devices', title: 'Input and Output Devices' },
  { files: ['s3.html'], slugPrefix: 'storage-devices-and-media', title: 'Storage Devices and Media' },
  { files: ['s4.html'], slugPrefix: 'networks-and-the-effects', title: 'Networks and the Effects of Using Them' },
  { files: ['s5.html'], slugPrefix: 'the-effects-of-using-it', title: 'The Effects of Using IT' },
  { files: ['s6a.html', 's6b.html'], slugPrefix: 'ict-applications', title: 'ICT Applications' },
  { files: ['s7.html'], slugPrefix: 'the-systems-life-cycle', title: 'The Systems Life Cycle' },
  { files: ['s8.html'], slugPrefix: 'safety-and-security', title: 'Safety and Security' },
  { files: ['s9.html'], slugPrefix: 'audience', title: 'Audience' },
  { files: ['s10.html'], slugPrefix: 'communication', title: 'Communication' },
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

// ------------------------------------------------------------ HTML processing

/** Remove a whole element (with nested children) given the opening-tag pattern. */
function stripElement(html, openTagPattern, tagName) {
  let out = '';
  let rest = html;
  for (;;) {
    const match = rest.match(openTagPattern);
    if (!match) return out + rest;

    const start = match.index;
    out += rest.slice(0, start);

    // Walk forward balancing <tag ...> / </tag> to find the true closing tag
    let depth = 0;
    let i = start;
    const openRe = new RegExp(`<${tagName}\\b`, 'gi');
    const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
    let cursor = start;
    for (;;) {
      openRe.lastIndex = cursor;
      closeRe.lastIndex = cursor;
      const nextOpen = openRe.exec(rest);
      const nextClose = closeRe.exec(rest);
      if (!nextClose) {
        i = rest.length;
        break;
      }
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth += 1;
        cursor = nextOpen.index + nextOpen[0].length;
        continue;
      }
      depth -= 1;
      cursor = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        i = cursor;
        break;
      }
    }
    rest = rest.slice(i);
  }
}

function extractMain(html) {
  const match = html.match(/<main class="main">([\s\S]*?)<\/main>/);
  if (!match) throw new Error('No <main class="main"> block found');
  return match[1];
}

function cleanNoteHtml(raw) {
  let html = extractMain(raw);

  // Cross-file navigation (links to s1.html, s2.html, ...) has no meaning in-app
  html = stripElement(html, /<div class="page-nav">/, 'div');

  // Gap-analysis annotations: editorial scaffolding, removed with the gap page
  html = html.replace(/<span class="gap-badge">[\s\S]*?<\/span>/g, '');
  html = stripElement(html, /<div class="gap-summary">/, 'div');
  html = html.replace(/<span class="gap-tag">[\s\S]*?<\/span>/g, '');

  // Wide comparison tables scroll inside their own box instead of stretching the page
  html = html.replace(
    /<table class="comp-table"([^>]*)>([\s\S]*?)<\/table>/g,
    '<div class="table-wrap"><table class="comp-table"$1>$2</table></div>'
  );

  // House style: em dash becomes a plain hyphen
  html = html.replace(/\u2014/g, '-').replace(/&mdash;|&#8212;|&#x2014;/gi, '-');

  // A few source sections carry a stray </div> that would otherwise close the
  // wrapper the app renders the note into
  html = dropStrayClosingDivs(html);

  // Collapse the blank lines left by the removals
  return html.replace(/\n{3,}/g, '\n\n').trim();
}

function dropStrayClosingDivs(html) {
  let depth = 0;
  return html.replace(/<div\b|<\/div>/g, (tag) => {
    if (tag === '<div') {
      depth += 1;
      return tag;
    }
    if (depth === 0) return '';
    depth -= 1;
    return tag;
  });
}

function stripPageHeader(html) {
  return stripElement(html, /<div class="page-header">/, 'div');
}

function estimateReadTime(html) {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ------------------------------------------------------------------------ main

async function main() {
  console.log('=== IGA Prep: ICT theory notes import ===');
  console.log(`Source: ${SOURCE_DIR}${DRY_RUN ? '  (dry run)' : ''}\n`);

  const subjects = await restGet('subjects?select=id,name,slug,code');
  const subject = subjects.find((s) => s.code === '0417') ||
    subjects.find((s) => /information and communication technology/i.test(s.name));
  if (!subject) throw new Error('ICT (0417) subject not found');
  console.log(`Subject: ${subject.name} (${subject.code})`);

  const topics = await restGet(
    `topics?select=id,name,slug,display_order&subject_id=eq.${subject.id}&order=display_order`
  );

  for (const section of SECTIONS) {
    const topic = topics.find((t) => t.slug.startsWith(section.slugPrefix));
    if (!topic) {
      console.log(`! No topic matching "${section.slugPrefix}" - skipped`);
      continue;
    }

    // Concatenate the parts of a multi-file section, keeping only the first header
    let html = '';
    section.files.forEach((file, index) => {
      const raw = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
      const cleaned = cleanNoteHtml(raw);
      html += (index === 0 ? cleaned : stripPageHeader(cleaned)) + '\n';
    });
    html = html.trim();

    const readTime = estimateReadTime(html);
    console.log(
      `${topic.name}\n  ${section.files.join(' + ')} -> ${(html.length / 1024).toFixed(1)} KB, ~${readTime} min`
    );

    if (OUT_DIR) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUT_DIR, `${section.slugPrefix}.html`), html, 'utf8');
    }

    if (DRY_RUN || OUT_DIR) continue;

    const existing = await restGet(
      `notes?select=id,title,display_order&topic_id=eq.${topic.id}&order=display_order`
    );

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
  }

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
