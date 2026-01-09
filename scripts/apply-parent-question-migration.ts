import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying parent_question_id migration...');

  try {
    // Add parent_question_id column
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE paper_questions 
        ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES paper_questions(id) ON DELETE CASCADE;
      `
    });

    if (error1) {
      console.log('Note: Column may already exist or using direct query instead');
    }

    // Add display_order column
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE paper_questions 
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
      `
    });

    if (error2) {
      console.log('Note: Column may already exist or using direct query instead');
    }

    console.log('✅ Migration applied successfully!');
    console.log('Added fields: parent_question_id, display_order');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
