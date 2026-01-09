-- Add ALL missing columns to tests table
-- Run this in Supabase SQL Editor

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS allow_calculator BOOLEAN DEFAULT true;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT false;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS randomize_choices BOOLEAN DEFAULT false;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS total_marks NUMERIC DEFAULT 0;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]';

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS subject_id UUID;

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS exam_board_id UUID;

-- Create trigger to auto-calculate totals
CREATE OR REPLACE FUNCTION calculate_test_totals()
RETURNS TRIGGER AS $$
DECLARE
  total_m NUMERIC := 0;
  total_q INTEGER := 0;
  section JSONB;
  question JSONB;
BEGIN
  IF NEW.sections IS NOT NULL THEN
    FOR section IN SELECT * FROM jsonb_array_elements(NEW.sections)
    LOOP
      IF section->'questions' IS NOT NULL THEN
        FOR question IN SELECT * FROM jsonb_array_elements(section->'questions')
        LOOP
          total_m := total_m + COALESCE((question->>'marks')::NUMERIC, 1);
          total_q := total_q + 1;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  NEW.total_marks := total_m;
  NEW.total_questions := total_q;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_test_totals_trigger ON tests;
CREATE TRIGGER calculate_test_totals_trigger
BEFORE INSERT OR UPDATE OF sections ON tests
FOR EACH ROW EXECUTE FUNCTION calculate_test_totals();
