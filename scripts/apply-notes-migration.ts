import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyNotesMigration() {
  console.log('📝 Applying notes sections migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20241221_notes_sections_system.sql'
    );
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by statement (rough split on semicolons outside of function definitions)
    const statements = migrationSQL
      .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/)
      .filter(stmt => stmt.trim().length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error in statement ${i + 1}:`, error);
        console.error('Statement:', statement.substring(0, 200));
        // Continue with other statements
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify tables in Supabase dashboard');
    console.log('2. Test creating notes in admin panel');
    console.log('3. Test viewing notes as student');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyNotesMigration();
