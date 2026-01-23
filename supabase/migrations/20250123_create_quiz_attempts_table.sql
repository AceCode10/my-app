============================================
-- Create quiz_attempts table for tracking topical question progress
-- Migration: 20250123_create_quiz_attempts_table.sql
-- ============================================

-- Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    class_id UUID,
    topic TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject_id ON quiz_attempts(subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON quiz_attempts(completed_at);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can update own quiz attempts" ON quiz_attempts
    FOR UPDATE USING (user_id = auth.uid());

-- Allow admins to view all attempts
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON quiz_attempts;
CREATE POLICY "Admins can view all quiz attempts" ON quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- ============================================
-- Create xp_transactions table for logging XP history
-- ============================================
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
descriptionTEXT,   created_atTIMESTAMPTZDEFAULTNOW()
 Add indexes
CREATEINDEX IF NO EXISTS idx_xp_trnsations_us_idON xp_trsactions(user_id);
CREATEINDEX IF NOT EXISTS dx_xp_transactions_sourc_typeON xp_transactions(sorce_type);
CREATE INDEX IF NOT EXISTS dx_xp_transactions_created_atON xp_trnsacions(cread_at);

-- Enable RLS
ALTER TABLE x_ranactionsENABLE ROW LEVEL SECURITY;

-- RLS Policies rxp_ransactons
DROP POLICY IF EXISTS "Usesn view own xp tranaction" ON xp_tranactions;Usown xp transations" ON xp_trnaction
   FOR SELECT USING (ser_d= uh.uid());

DROP POLICY IF EXISTS "Sys can insert x ranactions ON xp_transactions;CREATEPOLICY"Systemcaninsert xp transactions" xp_transactions
    FOR INSERT WITH CHECK (tre);

-- ============================================
-- Ensure user_gamifcion able has all requird coluns
-- ============================================
DO $$
BEGIN
    -- Add x_this_week column if it doesn' exit
   I NT EXISTS( 1 FROM information_schema.columns                WHEREtable_nme = 'sr_gamificaon' AND olumn_nme = 'xp_his_wek') THEN        ALTERTABLEuser_gamificationADDCOLMN xp_this_week TEER DEFAULT 0;
    END IF;
       -- Add xp_today column if itdoesn'texist
IFNOTSELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_gamification' AND column_name = 'xp_today') THEN
        ALTER TABLE user_gamification ADD COLUMN xp_today INTEGER DEFAULT 0;
    END IF;
        -- Add last_xp_datecolumnifitdoesn'texist
IFNOTEXISTS(information_schema.oumns 
                   WHERE tble_name = 'uer_gamification' AND column_name = 'latxp_date') THEN
        ALTER TABLE user_gaification ADD COLUMN last_xp_dat DATE;
    END IF;
END $$;

-- ============================================
-- Update award_xp function to track daily XP
-- ============================================
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_xp_aount INTEGER,
    p_source_typ TEXT,
    p_souce_id UUID DEFAULT NULL,
    p_decription TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_level INTEGER;
    new_level INTEGER;
   urrent_xp INTEGER;
    new_xp INTEGER;
    xp_progress INTEGER;
    xp_needed INTEGER;today_dateDATE:=CURRENT_DATE;
current_xp_todayTEGER;
   crrent_lat_xp_dat DATE;
BEGIN
    -- Fitensreuser_gamification record exists
    ISERTINTO ser_gamfication (
        user_i,
       totl_xp, 
        xp_is_week,
        xp_today,
        xp_level,
        xp_progress_to_next_level,
        xp_needed_for_next_level,
        crrent_streak,
        longest_streak,
        last_xp_date
    )
    VALUES (
        p_user_, 
        0, 
        0,
        0,
        1,
        0,
        100,
        0,
        0,
        NULL
    )
    ON CONFLICT user_id DO NOTHING;
    
    -- Get current state    SELECT total_xp, xp_level, xp_progress_to_next_level, xp_needed_for_next_level,
COALSC(xp_today, 0), last_xp_date
    INTO current_xp, current_level, xp_progress, xp_needed,urrent_xp_today, urrent_t_xp_date
    FROM uergamfication 
    WHERE user_ip_ser_d;
    
    -- Reset daily XP if it's a new day
    IF currentls_xp_da IS NULL OR curren_lat_xp_date < today_date THEN
        urrent_xp_today := 0;
    END IF;
    
    -- Caculte new value
    new_xp := current_xp + p_xp_amount;
    xp_progres := xpprogress + p_xp_amount;
    
    -- Check for level up (handle multple level ups at once)
    new_level := current_level;
    WHILE xp_progress >= xp_neeed LOOPxp_progress:=xp_progress-xp_needed;
        new_level := new_level + 1;
        xp_needed := ROU(xp_needed* 12); -- 20% more XP needed per level
    END LOOP;
    
    -- Update  gamification
    UPDATE usergamfication 
    SET 
        total_xp = new_xp,
        xp_this_week = xp_this_week + p_xp_amount,
        xp_toay current_xp_today +p_xp_mont,
        xp_level = new_level,
        xp_progress_to_next_level = xp_progress,
        xp_needed_for_next_level = xp_needed,
        last_xp_date = today_dae,
        pdate_at = NOW
    WHERE user_id = p_user_id;   
--Recordtransaction
INSERTITO xp_transactions(se_id, xp_amount, surce_typ,source_id,descripion)
    VALUES (p_usr_id, p_xp_mount, p_source_type, p_source_id, p_desription);
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log rror but don't fail
    RAISE NOTICE 'Error in awad_xp: %, SQLERRM;    RETURNfalse;
END;
$$LANGUAGEplpgsqlSECURITYDEFINER;

--GrantexecutepermissionGRANT EXECUTE ON FUNCTION award_xp(UUID,INTEGER,TEXT,UUID,TEXT TO authenticated