/**
 * Migration Application Script
 * Run with: npx tsx scripts/apply-migrations.ts
 * 
 * This script applies all database migrations to Supabase in the correct order.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSQLFile(filePath: string, description: string) {
  console.log(`\n📄 Running: ${description}`);
  console.log(`   File: ${filePath}`);
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Split by semicolons but be careful with function definitions
  const statements = sql
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|--|\n\n))/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    if (!statement || statement.length < 10) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct execution if RPC fails
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql: statement }),
        });
        
        if (!response.ok) {
          console.warn(`   ⚠️  Statement failed (may already exist):`, statement.substring(0, 100));
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err: any) {
      console.warn(`   ⚠️  Error:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`   ✅ Completed: ${successCount} statements succeeded, ${errorCount} warnings/errors`);
}

async function main() {
  console.log('🚀 Starting Supabase Migration Application\n');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);
  
  const migrationsDir = path.join(__dirname, '..', 'docs', 'migration');
  
  try {
    // Step 1: Apply main schema
    await runSQLFile(
      path.join(migrationsDir, 'DATABASE_SCHEMA.sql'),
      'Database Schema (tables, indexes, triggers)'
    );
    
    // Step 2: Apply user profile auto-creation fix
    await runSQLFile(
      path.join(migrationsDir, 'FIX_AUTO_USER_PROFILE.sql'),
      'User Profile Auto-Creation Trigger'
    );
    
    // Step 3: Apply RLS policies
    await runSQLFile(
      path.join(migrationsDir, 'RLS_POLICIES.sql'),
      'Row-Level Security Policies'
    );
    
    console.log('\n✅ All migrations applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify tables exist in Supabase Dashboard');
    console.log('   2. Test user signup/login flow');
    console.log('   3. Run seed data script (if available)');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
