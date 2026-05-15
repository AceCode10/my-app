-- Add presentation_url column to notes table for HTML slide deck presenter mode
ALTER TABLE notes ADD COLUMN IF NOT EXISTS presentation_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN notes.presentation_url IS 'URL to uploaded HTML slide deck file in Supabase Storage for fullscreen presenter mode';

-- Update documents storage bucket to also allow HTML files
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'text/html']::text[]
WHERE id = 'documents';
