// Script to apply the presentation_url migration directly via Supabase Management API
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const PROJECT_REF = 'inmptqnwcgymzkjjppdm';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ACCESS_TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not found in .env.local');
  process.exit(1);
}

const queries = [
  `ALTER TABLE notes ADD COLUMN IF NOT EXISTS presentation_url TEXT`,
  `COMMENT ON COLUMN notes.presentation_url IS 'URL to uploaded HTML slide deck file in Supabase Storage for fullscreen presenter mode'`,
  `UPDATE storage.buckets SET allowed_mime_types = ARRAY['application/pdf', 'text/html']::text[] WHERE id = 'documents'`,
];

async function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Use Supabase Management API to run SQL
async function runMigrationViaAPI(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('Applying presentation_url migration...');
  for (const sql of queries) {
    console.log(`\nRunning: ${sql.substring(0, 60)}...`);
    try {
      const result = await runMigrationViaAPI(sql);
      console.log(`  Status: ${result.status}`);
      console.log(`  Response: ${result.data}`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }
  console.log('\nDone.');
})();
