-- Add pdf_url column to notes table for presenter mode
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN notes.pdf_url IS 'URL to uploaded PDF file for presenter mode viewing';
