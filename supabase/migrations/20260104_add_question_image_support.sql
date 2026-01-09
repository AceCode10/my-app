-- ============================================
-- ADD IMAGE SUPPORT FOR PAPER QUESTIONS
-- Enables storing question screenshots for visual questions
-- ============================================

-- Add column to store base64 image data or reference
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS question_image_data TEXT;

-- Add column to track if question has visual elements
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT false;

-- Add column to store image metadata (dimensions, format, etc)
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS image_metadata JSONB;

-- Add column to store structured table content for clean HTML rendering
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS table_data JSONB;

-- Add index for filtering questions with images
CREATE INDEX IF NOT EXISTS idx_paper_questions_has_image 
ON paper_questions(has_image) WHERE has_image = true;

-- Add comment
COMMENT ON COLUMN paper_questions.question_image_data IS 'Base64 encoded image data or Supabase Storage URL for question screenshots';
COMMENT ON COLUMN paper_questions.has_image IS 'True if question contains diagrams, illustrations, or complex visual elements';
COMMENT ON COLUMN paper_questions.image_metadata IS 'JSON metadata: {width, height, format, page_number, extraction_method}';
COMMENT ON COLUMN paper_questions.table_data IS 'Structured table data with headers and rows for clean HTML table rendering';

SELECT 'Question image support added successfully!' as status;
