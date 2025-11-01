-- ============================================
-- ADMIN DASHBOARD SCHEMA
-- Complete database schema for admin features
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CONTENT STATUS ENUM
-- ============================================
CREATE TYPE content_status AS ENUM ('draft', 'pending', 'published', 'archived');

-- ============================================
-- 2. SUBJECTS HIERARCHY
-- ============================================

-- Subjects table (top level)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    exam_board TEXT NOT NULL, -- 'IGCSE', 'Edexcel', 'IB', etc.
    icon_url TEXT,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Topics table (second level)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    UNIQUE(subject_id, slug)
);

-- Subtopics table (third level)
CREATE TABLE IF NOT EXISTS subtopics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    UNIQUE(topic_id, slug)
);

-- ============================================
-- 3. QUESTION BANK
-- ============================================

CREATE TYPE question_type AS ENUM (
    'multiple_choice',
    'true_false',
    'short_answer',
    'numeric',
    'essay',
    'fill_in_blank',
    'matching'
);

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'very_hard');

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Content
    stem_markdown TEXT NOT NULL, -- Question text
    question_type question_type NOT NULL,
    
    -- MCQ options (JSON array for multiple choice)
    options JSONB, -- [{"label": "A", "text": "...", "is_correct": true}, ...]
    
    -- Answers
    correct_answer TEXT, -- For short answer, numeric, true/false
    correct_answers JSONB, -- For multiple correct answers or matching
    answer_tolerance NUMERIC, -- For numeric questions
    
    -- Metadata
    marks INTEGER NOT NULL DEFAULT 1,
    difficulty difficulty_level DEFAULT 'medium',
    examiner_comment TEXT, -- Explanation/marking guidance
    
    -- Relationships
    subject_id UUID REFERENCES subjects(id),
    topic_id UUID REFERENCES topics(id),
    subtopic_id UUID REFERENCES subtopics(id),
    exam_board TEXT,
    
    -- Media
    media_urls JSONB, -- Array of image/diagram URLs
    
    -- Status
    status content_status DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Search
    search_vector tsvector
);

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS questions_search_idx ON questions USING GIN(search_vector);

-- ============================================
-- 4. PAST PAPERS
-- ============================================

CREATE TABLE IF NOT EXISTS past_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metadata
    title TEXT NOT NULL,
    exam_board TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    year INTEGER NOT NULL,
    paper_number TEXT, -- e.g., "Paper 1", "Paper 2"
    variant TEXT, -- e.g., "Variant 1", "Variant 2"
    duration_minutes INTEGER,
    total_marks INTEGER,
    
    -- Files
    paper_url TEXT NOT NULL, -- PDF URL in storage
    mark_scheme_url TEXT, -- Mark scheme PDF
    examiner_report_url TEXT, -- Examiner report PDF
    
    -- Status
    status content_status DEFAULT 'draft',
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Link questions to papers
CREATE TABLE IF NOT EXISTS paper_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES past_papers(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_number TEXT NOT NULL, -- e.g., "1a", "2b(i)"
    display_order INTEGER NOT NULL,
    marks INTEGER NOT NULL,
    UNIQUE(paper_id, question_number)
);

-- ============================================
-- 5. AUDIT LOGS
-- ============================================

CREATE TYPE audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'publish',
    'unpublish',
    'approve',
    'reject',
    'login',
    'logout',
    'role_change',
    'bulk_import',
    'bulk_export'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    user_id UUID REFERENCES users(id),
    user_email TEXT,
    user_role TEXT,
    
    -- What
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL, -- 'subject', 'topic', 'question', 'paper', 'user'
    entity_id UUID,
    
    -- Details
    changes JSONB, -- Before/after values
    metadata JSONB, -- Additional context
    
    -- When
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Where
    ip_address TEXT,
    user_agent TEXT
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action, created_at DESC);

-- ============================================
-- 6. CONTENT APPROVAL WORKFLOW
-- ============================================

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS content_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What needs approval
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Submitted by
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    status approval_status DEFAULT 'pending',
    review_notes TEXT,
    
    -- Snapshot of content at submission
    content_snapshot JSONB
);

-- ============================================
-- 7. ANALYTICS TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Metrics
    view_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    average_score NUMERIC,
    
    -- Time periods
    date DATE NOT NULL,
    
    -- Aggregations
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_type, entity_id, date)
);

-- ============================================
-- 8. BULK IMPORT JOBS
-- ============================================

CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS bulk_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job details
    import_type TEXT NOT NULL, -- 'questions', 'papers', 'subjects'
    file_url TEXT NOT NULL,
    file_name TEXT,
    
    -- Status
    status import_status DEFAULT 'pending',
    
    -- Results
    total_rows INTEGER,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_log JSONB,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_imports ENABLE ROW LEVEL SECURITY;

-- Subjects policies
CREATE POLICY "Public can view published subjects"
    ON subjects FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage subjects"
    ON subjects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Topics policies
CREATE POLICY "Public can view published topics"
    ON topics FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage topics"
    ON topics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Subtopics policies
CREATE POLICY "Public can view published subtopics"
    ON subtopics FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage subtopics"
    ON subtopics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Questions policies
CREATE POLICY "Teachers can view published questions"
    ON questions FOR SELECT
    USING (
        status = 'published' OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator', 'teacher')
        )
    );

CREATE POLICY "Admins can manage questions"
    ON questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Past papers policies
CREATE POLICY "Users can view published papers"
    ON past_papers FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage papers"
    ON past_papers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Audit logs policies (super admin only)
CREATE POLICY "Super admin can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Content approvals policies
CREATE POLICY "Admins can view approvals"
    ON content_approvals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

CREATE POLICY "Admins can manage approvals"
    ON content_approvals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Analytics policies
CREATE POLICY "Admins can view analytics"
    ON content_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Bulk imports policies
CREATE POLICY "Admins can manage imports"
    ON bulk_imports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- ============================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON subtopics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_past_papers_updated_at BEFORE UPDATE ON past_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit log function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        user_email,
        user_role,
        action,
        entity_type,
        entity_id,
        changes
    )
    SELECT
        auth.uid(),
        u.email,
        u.role,
        CASE TG_OP
            WHEN 'INSERT' THEN 'create'::audit_action
            WHEN 'UPDATE' THEN 'update'::audit_action
            WHEN 'DELETE' THEN 'delete'::audit_action
        END,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    FROM users u
    WHERE u.id = auth.uid();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_subjects AFTER INSERT OR UPDATE OR DELETE ON subjects
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_topics AFTER INSERT OR UPDATE OR DELETE ON topics
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_questions AFTER INSERT OR UPDATE OR DELETE ON questions
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_past_papers AFTER INSERT OR UPDATE OR DELETE ON past_papers
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Update search vector for questions
CREATE OR REPLACE FUNCTION update_question_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.stem_markdown, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.examiner_comment, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_search_vector BEFORE INSERT OR UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_question_search_vector();

-- ============================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================

-- Subjects
CREATE INDEX IF NOT EXISTS subjects_status_idx ON subjects(status);
CREATE INDEX IF NOT EXISTS subjects_exam_board_idx ON subjects(exam_board);

-- Topics
CREATE INDEX IF NOT EXISTS topics_subject_id_idx ON topics(subject_id);
CREATE INDEX IF NOT EXISTS topics_status_idx ON topics(status);

-- Subtopics
CREATE INDEX IF NOT EXISTS subtopics_topic_id_idx ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS subtopics_status_idx ON subtopics(status);

-- Questions
CREATE INDEX IF NOT EXISTS questions_subject_id_idx ON questions(subject_id);
CREATE INDEX IF NOT EXISTS questions_topic_id_idx ON questions(topic_id);
CREATE INDEX IF NOT EXISTS questions_subtopic_id_idx ON questions(subtopic_id);
CREATE INDEX IF NOT EXISTS questions_status_idx ON questions(status);
CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON questions(difficulty);
CREATE INDEX IF NOT EXISTS questions_type_idx ON questions(question_type);

-- Past papers
CREATE INDEX IF NOT EXISTS past_papers_subject_id_idx ON past_papers(subject_id);
CREATE INDEX IF NOT EXISTS past_papers_year_idx ON past_papers(year);
CREATE INDEX IF NOT EXISTS past_papers_status_idx ON past_papers(status);

-- ============================================
-- SCHEMA COMPLETE
-- ============================================

-- Verify installation
SELECT 'Admin schema installed successfully!' as status;
