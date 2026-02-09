-- Create storage bucket for note images (diagrams, illustrations, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-images',
  'note-images',
  true,
  10485760, -- 10MB max
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to note images
CREATE POLICY "Public can view note images"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-images');

-- Allow authenticated admins to upload note images
CREATE POLICY "Admins can upload note images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-images'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Allow authenticated admins to update note images
CREATE POLICY "Admins can update note images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'note-images'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Allow authenticated admins to delete note images
CREATE POLICY "Admins can delete note images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'note-images'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);
