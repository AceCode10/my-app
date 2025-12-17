-- Enhance papers table for past papers feature
-- This migration adds missing columns if they don't exist

-- Create papers table if it doesn't exist
CREATE TABLE IF NOT EXISTS papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    session TEXT NOT NULL,
    paper_number TEXT,
    variant TEXT,
    question_paper_url TEXT,
    mark_scheme_url TEXT,
    examiner_report_url TEXT,
    duration_minutes INTEGER,
    total_marks INTEGER,
    is_published BOOLEAN DEFAULT true,
    is_specimen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'question_paper_url') THEN
        ALTER TABLE papers ADD COLUMN question_paper_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'mark_scheme_url') THEN
        ALTER TABLE papers ADD COLUMN mark_scheme_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'examiner_report_url') THEN
        ALTER TABLE papers ADD COLUMN examiner_report_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'is_published') THEN
        ALTER TABLE papers ADD COLUMN is_published BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'paper_number') THEN
        ALTER TABLE papers ADD COLUMN paper_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'variant') THEN
        ALTER TABLE papers ADD COLUMN variant TEXT;
    END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_papers_subject_id ON papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
CREATE INDEX IF NOT EXISTS idx_papers_session ON papers(session);
CREATE INDEX IF NOT EXISTS idx_papers_is_published ON papers(is_published);

-- Enable RLS
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for papers
DROP POLICY IF EXISTS "Public can view published papers" ON papers;
CREATE POLICY "Public can view published papers"
    ON papers FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage all papers" ON papers;
CREATE POLICY "Admins can manage all papers"
    ON papers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS papers_updated_at ON papers;
CREATE TRIGGER papers_updated_at
    BEFORE UPDATE ON papers
    FOR EACH ROW
    EXECUTE FUNCTION update_papers_updated_at();
