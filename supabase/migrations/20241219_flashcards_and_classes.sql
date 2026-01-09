-- ============================================
-- FLASHCARD DECKS AND CARDS TABLES
-- ============================================

-- Create flashcard_decks table
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    visibility TEXT DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_created_by ON flashcard_decks(created_by);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject ON flashcard_decks(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id);

-- Enable RLS
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flashcard_decks
DROP POLICY IF EXISTS "Users can view own decks" ON flashcard_decks;
CREATE POLICY "Users can view own decks"
ON flashcard_decks FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR visibility = 'public');

DROP POLICY IF EXISTS "Users can insert own decks" ON flashcard_decks;
CREATE POLICY "Users can insert own decks"
ON flashcard_decks FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own decks" ON flashcard_decks;
CREATE POLICY "Users can update own decks"
ON flashcard_decks FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own decks" ON flashcard_decks;
CREATE POLICY "Users can delete own decks"
ON flashcard_decks FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- RLS Policies for flashcards
DROP POLICY IF EXISTS "Users can view flashcards of accessible decks" ON flashcards;
CREATE POLICY "Users can view flashcards of accessible decks"
ON flashcards FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND (flashcard_decks.created_by = auth.uid() OR flashcard_decks.visibility = 'public')
    )
);

DROP POLICY IF EXISTS "Users can insert flashcards to own decks" ON flashcards;
CREATE POLICY "Users can insert flashcards to own decks"
ON flashcards FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update flashcards in own decks" ON flashcards;
CREATE POLICY "Users can update flashcards in own decks"
ON flashcards FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete flashcards from own decks" ON flashcards;
CREATE POLICY "Users can delete flashcards from own decks"
ON flashcards FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.created_by = auth.uid()
    )
);

-- ============================================
-- CLASSES TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code TEXT UNIQUE NOT NULL,
    capacity INTEGER DEFAULT 999,
    auto_approve BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active', -- 'pending', 'active', 'removed'
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

-- Create indexes for classes
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON classes(join_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

-- Enable RLS on classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
CREATE POLICY "Teachers can view own classes"
ON classes FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
CREATE POLICY "Students can view enrolled classes"
ON classes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.class_id = classes.id
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
    )
);

DROP POLICY IF EXISTS "Teachers can insert classes" ON classes;
CREATE POLICY "Teachers can insert classes"
ON classes FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
CREATE POLICY "Teachers can update own classes"
ON classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
CREATE POLICY "Teachers can delete own classes"
ON classes FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- RLS Policies for enrollments
DROP POLICY IF EXISTS "Teachers can view class enrollments" ON enrollments;
CREATE POLICY "Teachers can view class enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = enrollments.class_id
        AND classes.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
CREATE POLICY "Users can view own enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own enrollments" ON enrollments;
CREATE POLICY "Users can insert own enrollments"
ON enrollments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage class enrollments" ON enrollments;
CREATE POLICY "Teachers can manage class enrollments"
ON enrollments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = enrollments.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- ============================================
-- ASSESSMENTS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    visibility TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
    question_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON assessments(subject_id);

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessments
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
CREATE POLICY "Users can view own assessments"
ON assessments FOR SELECT
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
CREATE POLICY "Users can insert own assessments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
CREATE POLICY "Users can update own assessments"
ON assessments FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;
CREATE POLICY "Users can delete own assessments"
ON assessments FOR DELETE
TO authenticated
USING (created_by = auth.uid());

SELECT 'Flashcards, Classes, and Assessments tables created successfully!' as status;
