-- Add indexes for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update query planner statistics
ANALYZE users;

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "users_read" ON users;
DROP POLICY IF EXISTS "users_authenticated_select" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_own_update" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- Create fast policy: authenticated users can read all users
CREATE POLICY "users_select_policy"
ON users FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_policy"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (for signup)
DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_policy"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
