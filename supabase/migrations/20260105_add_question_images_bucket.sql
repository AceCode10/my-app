-- ============================================
-- CREATE STORAGE BUCKET FOR QUESTION IMAGES
-- Allows admins to upload diagrams/illustrations for questions
-- ============================================

-- Create the storage bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-images',
  'question-images',
  true,  -- Public so images can be displayed without auth
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update question images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'question-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete question images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'question-images');

-- Allow public read access (images need to be visible to students)
CREATE POLICY "Public can view question images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'question-images');

-- Add image_position column to paper_questions table
-- This controls where images appear relative to question text
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'after_text'
CHECK (image_position IN ('before_text', 'after_text', 'inline'));

-- Add use_image_question column for full question image mode
-- When true, the question is displayed as an image with answer options below (like SaveMyExams)
ALTER TABLE paper_questions
ADD COLUMN IF NOT EXISTS use_image_question BOOLEAN DEFAULT false;

-- Add question_image_url for storing the uploaded question image URL
-- This is separate from the existing image_url which was for diagrams/illustrations
ALTER TABLE paper_questions
ADD COLUMN IF NOT EXISTS question_image_url TEXT;

COMMENT ON COLUMN paper_questions.image_position IS 'Where to display the image: before_text, after_text, inline';

SELECT 'Question images bucket and policies created!' as status;
