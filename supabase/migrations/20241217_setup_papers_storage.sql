-- ============================================
-- PAST PAPERS STORAGE BUCKET SETUP
-- Creates storage bucket and policies for past paper PDFs
-- ============================================

-- Note: Storage bucket creation is typically done via Supabase Dashboard
-- or using the Supabase CLI. This SQL sets up the policies.

-- Create storage bucket for past papers (if using SQL - may need dashboard)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'past-papers',
--   'past-papers',
--   true,
--   52428800, -- 50MB limit
--   ARRAY['application/pdf']::text[]
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow public read access to past papers
DROP POLICY IF EXISTS "Public can view past papers" ON storage.objects;
CREATE POLICY "Public can view past papers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'past-papers');

-- Allow any authenticated user to upload past papers (for development/testing)
-- In production, you may want to restrict this to specific roles
DROP POLICY IF EXISTS "Admins can upload past papers" ON storage.objects;
CREATE POLICY "Admins can upload past papers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'past-papers');

-- Allow any authenticated user to update past papers
DROP POLICY IF EXISTS "Admins can update past papers" ON storage.objects;
CREATE POLICY "Admins can update past papers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'past-papers');

-- Allow any authenticated user to delete past papers
DROP POLICY IF EXISTS "Admins can delete past papers" ON storage.objects;
CREATE POLICY "Admins can delete past papers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'past-papers');

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Past papers storage policies created!' as status;
SELECT 'NOTE: Create the "past-papers" bucket in Supabase Dashboard with:' as note;
SELECT '  - Public bucket: Yes' as setting1;
SELECT '  - File size limit: 50MB' as setting2;
SELECT '  - Allowed MIME types: application/pdf' as setting3;
