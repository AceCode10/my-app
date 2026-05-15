/**
 * Seed script: uploads the 10 HTML presentation decks to Supabase Storage
 * and links each to the matching note (or creates a note) for the ICT topic.
 *
 * Usage:
 *   node scripts/seed-presentations.js
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRESENTATIONS_DIR = path.join(__dirname, '..', 'Presentations');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Strip trailing slash
const BASE_URL = SUPABASE_URL.replace(/\/$/, '');
const PROJECT_REF = BASE_URL.match(/https:\/\/([^.]+)\./)?.[1];

// Map HTML filename prefix to topic name fragment (case-insensitive substring match on slug)
const FILENAME_TO_NAME_FRAGMENT = {
  'Topic 01': 'types-and-components',
  'Topic 02': 'input-and-output',
  'Topic 03': 'storage-devices',
  'Topic 04': 'networks-and-the-effects',
  'Topic 05': 'the-effects-of-using-it',
  'Topic 06': 'ict-applications',
  'Topic 07': 'the-systems-life-cycle',
  'Topic 08': 'safety-and-security',
  'Topic 09': 'audience',
  'Topic 10': 'communication',
};

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buf });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function authHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function restGet(path) {
  const res = await request(`${BASE_URL}/rest/v1/${path}`, {
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
  });
  return JSON.parse(res.body.toString());
}

async function restPost(path, data) {
  const body = Buffer.from(JSON.stringify(data));
  const res = await request(`${BASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
      'Content-Length': body.length,
    }),
  }, body);
  return { status: res.status, data: JSON.parse(res.body.toString()) };
}

async function restPatch(path, data) {
  const body = Buffer.from(JSON.stringify(data));
  const res = await request(`${BASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
      'Content-Length': body.length,
    }),
  }, body);
  return { status: res.status, data: JSON.parse(res.body.toString()) };
}

async function uploadToStorage(storagePath, fileBuffer, contentType) {
  const uploadUrl = `${BASE_URL}/storage/v1/object/documents/${storagePath}`;
  const res = await request(uploadUrl, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length,
      'x-upsert': 'true',
    }),
  }, fileBuffer);
  const respBody = JSON.parse(res.body.toString());
  if (res.status >= 300) throw new Error(`Storage upload failed ${res.status}: ${JSON.stringify(respBody)}`);
  return `${BASE_URL}/storage/v1/object/public/documents/${storagePath}`;
}

async function main() {
  console.log('=== IGA Prep Presentation Seeder ===\n');

  // 1. Find the ICT subject (by name match)
  const subjects = await restGet('subjects?select=id,name,slug&order=name');
  console.log(`Found ${subjects.length} subjects`);

  // Try to find ICT subject
  const ictSubject = subjects.find(s =>
    s.name.toLowerCase().includes('ict') ||
    s.slug.toLowerCase().includes('ict') ||
    s.name.toLowerCase().includes('information')
  );

  if (!ictSubject) {
    console.log('\nAvailable subjects:');
    subjects.forEach(s => console.log(`  - ${s.name} (slug: ${s.slug}, id: ${s.id})`));
    console.error('\nCould not find ICT subject. Please check the subject slugs above and update FILENAME_TO_SLUG if needed.');
    process.exit(1);
  }

  console.log(`Using subject: "${ictSubject.name}" (id: ${ictSubject.id})\n`);

  // 2. Load topics for this subject
  const topics = await restGet(`topics?select=id,name,slug&subject_id=eq.${ictSubject.id}&order=display_order`);
  console.log(`Found ${topics.length} topics for ICT:`);
  topics.forEach(t => console.log(`  - ${t.name} (slug: ${t.slug})`));
  console.log('');

  // 3. Get HTML files
  const files = fs.readdirSync(PRESENTATIONS_DIR).filter(f => f.endsWith('.html'));
  console.log(`Found ${files.length} HTML decks in Presentations/\n`);

  for (const filename of files.sort()) {
    const prefix = Object.keys(FILENAME_TO_NAME_FRAGMENT).find(k => filename.startsWith(k));
    if (!prefix) {
      console.log(`⚠️  No mapping found for: ${filename}`);
      continue;
    }

    const fragment = FILENAME_TO_NAME_FRAGMENT[prefix];
    const matchedTopic = topics.find(t => t.slug.startsWith(fragment));

    if (!matchedTopic) {
      console.log(`⚠️  Topic not found for "${filename}" (fragment: ${fragment})`);
      console.log(`   Available slugs: ${topics.map(t => t.slug).join(', ')}`);
      continue;
    }

    console.log(`Processing: ${filename}`);
    console.log(`  → Topic: ${matchedTopic.name} (${matchedTopic.id})`);

    // 4. Upload HTML to Storage
    const filePath = path.join(PRESENTATIONS_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `presentations/${matchedTopic.id}.html`;

    let publicUrl;
    try {
      publicUrl = await uploadToStorage(storagePath, fileBuffer, 'text/html');
      console.log(`  ✓ Uploaded to storage: ${storagePath}`);
    } catch (err) {
      console.error(`  ✗ Upload failed: ${err.message}`);
      continue;
    }

    // 5. Check if a note exists for this topic
    const existingNotes = await restGet(
      `notes?select=id,title,presentation_url&topic_id=eq.${matchedTopic.id}&order=display_order&limit=1`
    );

    if (existingNotes.length > 0) {
      const note = existingNotes[0];
      // Update existing note's presentation_url
      const result = await restPatch(
        `notes?id=eq.${note.id}`,
        { presentation_url: publicUrl }
      );
      console.log(`  ✓ Updated existing note "${note.title}" with presentation_url`);
    } else {
      // Create a new note with the presentation_url
      const topicTitle = matchedTopic.name;
      const slug = `${ictSubject.slug}-${matchedTopic.slug}-presentation`;
      const result = await restPost('notes', {
        title: topicTitle,
        slug,
        content_md: `# ${topicTitle}\n\nPresentation slides for ${topicTitle}.`,
        subject_id: ictSubject.id,
        topic_id: matchedTopic.id,
        visibility: 'public',
        presentation_url: publicUrl,
        is_downloadable: false,
        estimated_read_time: 5,
        has_latex: false,
        display_order: 0,
        published_at: new Date().toISOString(),
      });
      if (result.status >= 300) {
        console.error(`  ✗ Failed to create note: ${JSON.stringify(result.data)}`);
      } else {
        console.log(`  ✓ Created new note with presentation_url`);
      }
    }

    console.log('');
  }

  console.log('=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
