-- Fix quizzes RLS policies
-- The existing policies check auth.users.raw_user_meta_data->>'role' which is incorrect
-- The app uses public.users.role instead

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view published quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can view all quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can insert quizzes" ON quizzes;
DROP POLICY IF EXISTS "Creators can update their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Creators can delete their quizzes" ON quizzes;

-- Enable RLS (in case it's not enabled)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone (including anon) can view published quizzes
CREATE POLICY "quizzes_public_read" ON quizzes
  FOR SELECT
  TO anon, authenticated
  USING (visibility = 'published');

-- Policy: Authenticated users can view all quizzes (for admin dashboard counts)
CREATE POLICY "quizzes_authenticated_read" ON quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'content_moderator', 'admin', 'teacher')
    )
  );

-- Policy: Admins can insert quizzes
CREATE POLICY "quizzes_admin_insert" ON quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  );

-- Policy: Admins and creators can update quizzes
CREATE POLICY "quizzes_admin_update" ON quizzes
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  );

-- Policy: Admins and creators can delete quizzes
CREATE POLICY "quizzes_admin_delete" ON quizzes
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  );

SELECT 'Quizzes RLS policies fixed!' as status;
