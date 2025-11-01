-- ============================================
-- BETTER FIX: Auto-create user profile on signup
-- This uses a database trigger instead of client-side insert
-- Run this in Supabase SQL Editor
-- ============================================

-- First, drop the restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create own profile on signup" ON users;

-- Create a more permissive INSERT policy for the trigger
CREATE POLICY "Allow service role to insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role, subscription_tier, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'teacher' THEN 'pro'
      ELSE 'basic'
    END,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
