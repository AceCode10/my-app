-- Create notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    slug TEXT NOT NULL UNIQUE,
    content_md TEXT NOT NULL,
    rendered_html TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('public', 'registered', 'premium', 'draft')),
    tags TEXT[],
    is_downloadable BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility);
CREATE INDEX IF NOT EXISTS idx_notes_slug ON notes(slug);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes

-- Public can view published public notes
CREATE POLICY "Public can view public notes"
    ON notes FOR SELECT
    USING (visibility = 'public' AND published_at IS NOT NULL);

-- Authenticated users can view registered and premium notes based on their subscription
CREATE POLICY "Authenticated users can view registered notes"
    ON notes FOR SELECT
    TO authenticated
    USING (
        visibility IN ('public', 'registered') 
        AND published_at IS NOT NULL
    );

-- Premium users can view premium notes
CREATE POLICY "Premium users can view premium notes"
    ON notes FOR SELECT
    TO authenticated
    USING (
        (visibility = 'premium' AND published_at IS NOT NULL AND
         EXISTS (
             SELECT 1 FROM users 
             WHERE users.id = auth.uid() 
             AND users.subscription_tier IN ('essential', 'pro')
         ))
        OR visibility IN ('public', 'registered')
    );

-- Authors can view their own notes
CREATE POLICY "Authors can view own notes"
    ON notes FOR SELECT
    TO authenticated
    USING (author_id = auth.uid());

-- Authors can create notes
CREATE POLICY "Authors can create notes"
    ON notes FOR INSERT
    TO authenticated
    WITH CHECK (author_id = auth.uid());

-- Authors can update their own notes
CREATE POLICY "Authors can update own notes"
    ON notes FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Authors can delete their own notes
CREATE POLICY "Authors can delete own notes"
    ON notes FOR DELETE
    TO authenticated
    USING (author_id = auth.uid());

-- Admins can do everything with notes
CREATE POLICY "Admins can manage all notes"
    ON notes FOR ALL
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
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_notes_updated_at();
