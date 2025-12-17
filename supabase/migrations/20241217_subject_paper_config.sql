-- ============================================
-- SUBJECT-SPECIFIC PAPER CONFIGURATION
-- Defines which paper components and resource types are available per subject
-- ============================================

-- Create table for subject paper components (P1, P2, P3, P4, P5, P6, etc.)
CREATE TABLE IF NOT EXISTS subject_paper_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_board TEXT NOT NULL,
    component_code TEXT NOT NULL, -- e.g., "1", "2", "3", "4", "5", "6"
    component_name TEXT NOT NULL, -- e.g., "Paper 1", "Paper 2 (Extended)"
    component_description TEXT, -- e.g., "Multiple Choice", "Extended Theory"
    duration_minutes INTEGER,
    total_marks INTEGER,
    is_practical BOOLEAN DEFAULT false,
    has_source_files BOOLEAN DEFAULT false, -- For CS/ICT practicals
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, exam_board, component_code)
);

-- Create table for subject resource type availability
CREATE TABLE IF NOT EXISTS subject_resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_board TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- References resource_types.code
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, exam_board, resource_type)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subject_paper_components_subject ON subject_paper_components(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_paper_components_board ON subject_paper_components(exam_board);
CREATE INDEX IF NOT EXISTS idx_subject_resource_types_subject ON subject_resource_types(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_resource_types_board ON subject_resource_types(exam_board);

-- Add component_code column to past_papers for structured paper identification
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'component_code'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN component_code TEXT;
    END IF;
END $$;

-- Create index for component_code lookups
CREATE INDEX IF NOT EXISTS idx_past_papers_component ON past_papers(component_code);

-- ============================================
-- SAMPLE DATA: Common IGCSE Subject Configurations
-- ============================================

-- Note: This is sample data. Actual configurations should be added via admin interface
-- or updated based on specific syllabus requirements.

-- Example: IGCSE Mathematics (0580) - CIE
-- Papers: 1 (Core), 2 (Extended), 3 (Core), 4 (Extended)
-- Resources: Question Paper, Mark Scheme, Examiner Report (no inserts typically)

-- Example: IGCSE Physics (0625) - CIE  
-- Papers: 1 (Multiple Choice), 2 (Core Theory), 3 (Extended Theory), 4 (Core Practical), 5 (Practical Test), 6 (Alternative to Practical)
-- Resources: Question Paper, Mark Scheme, Examiner Report, Confidential Instructions

-- Example: IGCSE Computer Science (0478) - CIE
-- Papers: 1 (Theory), 2 (Problem-Solving and Programming)
-- Resources: Question Paper, Mark Scheme, Examiner Report, Pre-release Material, Source Files

-- Example: IGCSE English Language (0500) - CIE
-- Papers: 1 (Reading), 2 (Directed Writing and Composition), 3 (Coursework)
-- Resources: Question Paper, Mark Scheme, Examiner Report, Insert (for reading passages)

-- ============================================
-- HELPER FUNCTION: Get available resource types for a subject
-- ============================================

CREATE OR REPLACE FUNCTION get_subject_resource_types(
    p_subject_id UUID,
    p_exam_board TEXT DEFAULT NULL
)
RETURNS TABLE (
    resource_type TEXT,
    resource_name TEXT,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.code as resource_type,
        rt.name as resource_name,
        COALESCE(srt.is_available, true) as is_available
    FROM resource_types rt
    LEFT JOIN subject_resource_types srt 
        ON srt.resource_type = rt.code 
        AND srt.subject_id = p_subject_id
        AND (p_exam_board IS NULL OR srt.exam_board = p_exam_board)
    ORDER BY rt.display_order;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Get paper components for a subject
-- ============================================

CREATE OR REPLACE FUNCTION get_subject_paper_components(
    p_subject_id UUID,
    p_exam_board TEXT DEFAULT NULL
)
RETURNS TABLE (
    component_code TEXT,
    component_name TEXT,
    component_description TEXT,
    duration_minutes INTEGER,
    total_marks INTEGER,
    is_practical BOOLEAN,
    has_source_files BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spc.component_code,
        spc.component_name,
        spc.component_description,
        spc.duration_minutes,
        spc.total_marks,
        spc.is_practical,
        spc.has_source_files
    FROM subject_paper_components spc
    WHERE spc.subject_id = p_subject_id
    AND (p_exam_board IS NULL OR spc.exam_board = p_exam_board)
    ORDER BY spc.display_order, spc.component_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE subject_paper_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_resource_types ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view subject paper components"
    ON subject_paper_components FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public can view subject resource types"
    ON subject_resource_types FOR SELECT
    TO public
    USING (true);

-- Admin write access
CREATE POLICY "Admins can manage subject paper components"
    ON subject_paper_components FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage subject resource types"
    ON subject_resource_types FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Subject paper configuration migration complete!' as status;
