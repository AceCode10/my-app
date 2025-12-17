-- ============================================
-- STORAGE BUCKET SETUP FOR TOPICAL QUESTIONS PDFs
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- This creates the storage bucket and sets up permissions for PDF uploads

-- Step 1: Create the storage bucket for topical PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'topical-pdfs', 
  'topical-pdfs', 
  true,  -- Public bucket so students can view PDFs
  52428800,  -- 50MB file size limit
  ARRAY['application/pdf']  -- Only allow PDF files
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Step 2: Allow public read access to all files in the bucket
CREATE POLICY "Public can view topical PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'topical-pdfs');

-- Step 3: Allow authenticated admins to upload files
CREATE POLICY "Admins can upload topical PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'topical-pdfs' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'content_moderator')
  )
);

-- Step 4: Allow authenticated admins to update/replace files
CREATE POLICY "Admins can update topical PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'topical-pdfs'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'content_moderator')
  )
);

-- Step 5: Allow authenticated admins to delete files
CREATE POLICY "Admins can delete topical PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'topical-pdfs'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'content_moderator')
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup:

-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'topical-pdfs';

-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%topical%';
