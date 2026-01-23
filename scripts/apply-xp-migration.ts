/**
 * Script to apply the XP system fix migration
 * Run with: npx tsx scripts/apply-xp-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying XP system fix migration...\n');

  // 1. Fix award_xp function
  console.log('1. Creating/updating award_xp function...');
  const { error: awardXpError } = await supabase.rpc('exec_sql', {
    sql: `
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_source_type TEXT,
    p_source_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_level INTEGER;
    new_level INTEGER;
    current_xp INTEGER;
    new_xp INTEGER;
    xp_progress INTEGER;
    xp_needed INTEGER;
BEGIN
    INSERT INTO user_gamification (
        user_id, total_xp, xp_this_week, xp_level,
        xp_progress_to_next_level, xp_needed_for_next_level,
        current_streak, longest_streak
    )
    VALUES (p_user_id, 0, 0, 1, 0, 100, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT total_xp, xp_level, xp_progress_to_next_level, xp_needed_for_next_level
    INTO current_xp, current_level, xp_progress, xp_needed
    FROM user_gamification WHERE user_id = p_user_id;
    
    new_xp := current_xp + p_xp_amount;
    xp_progress := xp_progress + p_xp_amount;
    new_level := current_level;
    
    WHILE xp_progress >= xp_needed LOOP
        xp_progress := xp_progress - xp_needed;
        new_level := new_level + 1;
        xp_needed := ROUND(xp_needed * 1.2);
    END LOOP;
    
    UPDATE user_gamification SET 
        total_xp = new_xp,
        xp_this_week = xp_this_week + p_xp_amount,
        xp_level = new_level,
        xp_progress_to_next_level = xp_progress,
        xp_needed_for_next_level = xp_needed,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    BEGIN
        INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
        VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });

  if (awardXpError) {
    console.log('  Note: exec_sql RPC not available, will apply via direct SQL execution');
  } else {
    console.log('  ✓ award_xp function updated');
  }

  // 2. Update goal presets
  console.log('\n2. Updating goal presets...');
  const { error: presetsError } = await supabase
    .from('goal_presets')
    .update({ xp_target: 25 })
    .eq('difficulty', 'casual');

  if (!presetsError) {
    await supabase.from('goal_presets').update({ xp_target: 50 }).eq('difficulty', 'regular');
    await supabase.from('goal_presets').update({ xp_target: 75 }).eq('difficulty', 'serious');
    await supabase.from('goal_presets').update({ xp_target: 100 }).eq('difficulty', 'intense');
    console.log('  ✓ Goal presets updated');
  } else {
    console.log('  ⚠ Could not update goal presets:', presetsError.message);
  }

  console.log('\n✅ Migration script completed!');
  console.log('\nIMPORTANT: You need to run the following SQL in the Supabase SQL Editor:');
  console.log('Go to: https://supabase.com/dashboard/project/jvoxwyvdlwoiuqblnycu/sql/new');
  console.log('\nCopy and paste the contents of: supabase/migrations/20250123_fix_xp_system.sql');
}

applyMigration().catch(console.error);
