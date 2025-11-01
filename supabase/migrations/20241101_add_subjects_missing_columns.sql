-- Add missing columns to subjects table

-- Add display_order if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE subjects ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'status'
    ) THEN
        ALTER TABLE subjects ADD COLUMN status TEXT DEFAULT 'draft' 
            CHECK (status IN ('draft', 'pending', 'published', 'archived'));
    END IF;
END $$;

-- Add icon_url if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE subjects ADD COLUMN icon_url TEXT;
    END IF;
END $$;

-- Add color if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'color'
    ) THEN
        ALTER TABLE subjects ADD COLUMN color TEXT;
    END IF;
END $$;

-- Add description if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'description'
    ) THEN
        ALTER TABLE subjects ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_subjects_display_order ON subjects(display_order);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_subjects_status ON subjects(status);

-- Add the same columns to topics table

-- Add display_order to topics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'topics' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE topics ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add status to topics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'topics' AND column_name = 'status'
    ) THEN
        ALTER TABLE topics ADD COLUMN status TEXT DEFAULT 'draft' 
            CHECK (status IN ('draft', 'pending', 'published', 'archived'));
    END IF;
END $$;

-- Add description to topics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'topics' AND column_name = 'description'
    ) THEN
        ALTER TABLE topics ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add updated_at to topics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'topics' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE topics ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create indexes on topics
CREATE INDEX IF NOT EXISTS idx_topics_display_order ON topics(display_order);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);

-- Create trigger to auto-update updated_at for subjects
CREATE OR REPLACE FUNCTION update_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subjects_updated_at ON subjects;
CREATE TRIGGER subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_subjects_updated_at();

-- Create trigger to auto-update updated_at for topics
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topics_updated_at ON topics;
CREATE TRIGGER topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW
    EXECUTE FUNCTION update_topics_updated_at();

-- Verify the columns were added
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('subjects', 'topics')
    AND column_name IN ('display_order', 'status', 'icon_url', 'color', 'description', 'updated_at')
ORDER BY table_name, ordinal_position;
