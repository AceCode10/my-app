-- Enhanced Notes System with Sections
-- Supports hierarchical notes with sub-topics/sections for chunked reading

-- Add new columns to existing notes table if they don't exist
DO $$ 
BEGIN
    -- Add exam_board_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'exam_board_id') THEN
        ALTER TABLE notes ADD COLUMN exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL;
    END IF;
    
    -- Add display_order column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'display_order') THEN
        ALTER TABLE notes ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
    
    -- Add estimated_read_time column (in minutes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'estimated_read_time') THEN
        ALTER TABLE notes ADD COLUMN estimated_read_time INTEGER DEFAULT 5;
    END IF;
    
    -- Add has_latex column to indicate if note contains LaTeX
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'has_latex') THEN
        ALTER TABLE notes ADD COLUMN has_latex BOOLEAN DEFAULT false;
    END IF;
    
    -- Add search vector for full-text search
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'search_vector') THEN
        ALTER TABLE notes ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- Create note_sections table for chunked content
CREATE TABLE IF NOT EXISTS note_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    parent_section_id UUID REFERENCES note_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content_md TEXT NOT NULL DEFAULT '',
    rendered_html TEXT,
    display_order INTEGER DEFAULT 0,
    has_latex BOOLEAN DEFAULT false,
    estimated_read_time INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(note_id, slug)
);

-- Create note_progress table for tracking student reading progress
CREATE TABLE IF NOT EXISTS note_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES note_sections(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, note_id, section_id)
);

-- Create note_bookmarks table for saved notes
CREATE TABLE IF NOT EXISTS note_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES note_sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, note_id, section_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_sections_note_id ON note_sections(note_id);
CREATE INDEX IF NOT EXISTS idx_note_sections_parent ON note_sections(parent_section_id);
CREATE INDEX IF NOT EXISTS idx_note_sections_order ON note_sections(note_id, display_order);
CREATE INDEX IF NOT EXISTS idx_note_progress_user ON note_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_note_progress_note ON note_progress(note_id);
CREATE INDEX IF NOT EXISTS idx_note_bookmarks_user ON note_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_exam_board ON notes(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_md, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector update
DROP TRIGGER IF EXISTS notes_search_vector_update ON notes;
CREATE TRIGGER notes_search_vector_update
    BEFORE INSERT OR UPDATE OF title, subtitle, content_md, tags
    ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_notes_search_vector();

-- Function to update section updated_at
CREATE OR REPLACE FUNCTION update_note_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for section updated_at
DROP TRIGGER IF EXISTS note_sections_updated_at ON note_sections;
CREATE TRIGGER note_sections_updated_at
    BEFORE UPDATE ON note_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_note_sections_updated_at();

-- Enable RLS on new tables
ALTER TABLE note_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_sections

-- Everyone can view sections of published notes
CREATE POLICY "Public can view sections of public notes"
    ON note_sections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM notes 
            WHERE notes.id = note_sections.note_id 
            AND notes.visibility = 'public' 
            AND notes.published_at IS NOT NULL
        )
    );

-- Authenticated users can view sections of registered notes
CREATE POLICY "Authenticated can view sections of registered notes"
    ON note_sections FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes 
            WHERE notes.id = note_sections.note_id 
            AND notes.visibility IN ('public', 'registered')
            AND notes.published_at IS NOT NULL
        )
    );

-- Premium users can view premium note sections
CREATE POLICY "Premium users can view premium note sections"
    ON note_sections FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM notes n
            JOIN users u ON u.id = auth.uid()
            WHERE n.id = note_sections.note_id 
            AND n.published_at IS NOT NULL
            AND (
                n.visibility IN ('public', 'registered')
                OR (n.visibility = 'premium' AND u.subscription_tier IN ('essential', 'pro'))
            )
        )
    );

-- Admins can manage all sections
CREATE POLICY "Admins can manage all note sections"
    ON note_sections FOR ALL
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

-- RLS Policies for note_progress

-- Users can view their own progress
CREATE POLICY "Users can view own note progress"
    ON note_progress FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own progress
CREATE POLICY "Users can insert own note progress"
    ON note_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "Users can update own note progress"
    ON note_progress FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can view all progress (for analytics)
CREATE POLICY "Admins can view all note progress"
    ON note_progress FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Teachers can view progress of their students
CREATE POLICY "Teachers can view student note progress"
    ON note_progress FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN enrollments e ON e.user_id = note_progress.user_id
            JOIN classes c ON c.id = e.class_id
            WHERE u.id = auth.uid()
            AND c.teacher_id = auth.uid()
            AND e.status = 'active'
        )
    );

-- RLS Policies for note_bookmarks

-- Users can manage their own bookmarks
CREATE POLICY "Users can view own bookmarks"
    ON note_bookmarks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bookmarks"
    ON note_bookmarks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bookmarks"
    ON note_bookmarks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Function to calculate note reading progress percentage
CREATE OR REPLACE FUNCTION get_note_progress_percentage(p_user_id UUID, p_note_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_sections INTEGER;
    completed_sections INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_sections
    FROM note_sections
    WHERE note_id = p_note_id;
    
    IF total_sections = 0 THEN
        -- Check if main note is completed
        SELECT CASE WHEN completed THEN 100 ELSE 0 END INTO completed_sections
        FROM note_progress
        WHERE user_id = p_user_id AND note_id = p_note_id AND section_id IS NULL;
        RETURN COALESCE(completed_sections, 0);
    END IF;
    
    SELECT COUNT(*) INTO completed_sections
    FROM note_progress
    WHERE user_id = p_user_id 
    AND note_id = p_note_id 
    AND section_id IS NOT NULL
    AND completed = true;
    
    RETURN (completed_sections * 100 / total_sections);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's overall notes progress for a topic
CREATE OR REPLACE FUNCTION get_topic_notes_progress(p_user_id UUID, p_topic_id UUID)
RETURNS TABLE(
    total_notes INTEGER,
    completed_notes INTEGER,
    in_progress_notes INTEGER,
    total_time_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT n.id)::INTEGER as total_notes,
        COUNT(DISTINCT CASE WHEN get_note_progress_percentage(p_user_id, n.id) = 100 THEN n.id END)::INTEGER as completed_notes,
        COUNT(DISTINCT CASE WHEN get_note_progress_percentage(p_user_id, n.id) > 0 AND get_note_progress_percentage(p_user_id, n.id) < 100 THEN n.id END)::INTEGER as in_progress_notes,
        COALESCE(SUM(np.time_spent_seconds), 0)::INTEGER as total_time_spent
    FROM notes n
    LEFT JOIN note_progress np ON np.note_id = n.id AND np.user_id = p_user_id
    WHERE n.topic_id = p_topic_id
    AND n.visibility != 'draft'
    AND n.published_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing notes search vectors
UPDATE notes SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(content_md, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'B')
WHERE search_vector IS NULL;
