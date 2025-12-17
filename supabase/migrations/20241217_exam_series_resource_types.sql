-- ============================================
-- EXAM SERIES AND RESOURCE TYPES
-- Adds resource_type field and updates session/series options
-- ============================================

-- Add resource_type column to past_papers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'resource_type'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN resource_type TEXT DEFAULT 'question_paper';
    END IF;
END $$;

-- Add resource_type to papers table as well for consistency
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'resource_type'
    ) THEN
        ALTER TABLE papers ADD COLUMN resource_type TEXT DEFAULT 'question_paper';
    END IF;
END $$;

-- Create index for resource_type lookups
CREATE INDEX IF NOT EXISTS idx_past_papers_resource_type ON past_papers(resource_type);
CREATE INDEX IF NOT EXISTS idx_past_papers_session ON past_papers(session);

-- ============================================
-- REFERENCE DATA: Exam Board Series/Sessions
-- ============================================

-- Create a reference table for exam board series
CREATE TABLE IF NOT EXISTS exam_board_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_board TEXT NOT NULL,
    series_code TEXT NOT NULL,
    series_name TEXT NOT NULL,
    months TEXT, -- e.g., "February/March"
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_board, series_code)
);

-- Insert exam board series data
INSERT INTO exam_board_series (exam_board, series_code, series_name, months, display_order) VALUES
-- Cambridge (CIE)
('CIE', 'fm', 'February/March', 'February/March', 1),
('CIE', 'mj', 'May/June', 'May/June', 2),
('CIE', 'on', 'October/November', 'October/November', 3),

-- Edexcel
('Edexcel', 'jan', 'January', 'January', 1),
('Edexcel', 'mj', 'May/June', 'May/June', 2),
('Edexcel', 'on', 'October/November', 'October/November', 3),

-- AQA
('AQA', 'may', 'May', 'May', 1),
('AQA', 'jun', 'June', 'June', 2),

-- OCR
('OCR', 'may', 'May', 'May', 1),
('OCR', 'jun', 'June', 'June', 2),

-- IB
('IB', 'am', 'April/May', 'April/May', 1),
('IB', 'on', 'October/November', 'October/November', 2),

-- AP
('AP', 'may', 'May', 'May', 1)

ON CONFLICT (exam_board, series_code) DO NOTHING;

-- ============================================
-- REFERENCE DATA: Resource Types
-- ============================================

CREATE TABLE IF NOT EXISTS resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- For UI display
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert resource types
INSERT INTO resource_types (code, name, description, icon, display_order) VALUES
('question_paper', 'Question Paper', 'The main examination paper with questions', 'FileText', 1),
('mark_scheme', 'Mark Scheme', 'Official marking guidelines and answers', 'CheckCircle', 2),
('insert', 'Insert/Source Booklet', 'Additional materials provided with the exam', 'BookOpen', 3),
('source_files', 'Source Files', 'Pre-release materials and data files for practical exams', 'FolderOpen', 4),
('examiner_report', 'Examiner Report', 'Principal examiner feedback on candidate performance', 'FileBarChart', 5),
('grade_thresholds', 'Grade Thresholds', 'Grade boundary information', 'BarChart', 6),
('specimen', 'Specimen Paper', 'Sample papers for new syllabuses', 'FileQuestion', 7),
('syllabus', 'Syllabus', 'Course content and assessment information', 'List', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Exam series and resource types migration complete!' as status;
