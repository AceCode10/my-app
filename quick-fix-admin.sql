-- Quick fix: Run this directly in Supabase SQL Editor
-- This will restore admin access for sepisodenny@gmail.com

-- First, get the user ID
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'sepisodenny@gmail.com';
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Insert or update user with super_admin role
  INSERT INTO users (
    id,
    email,
    display_name,
    role,
    subscription_tier,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    'sepisodenny@gmail.com',
    'Denny Sepiso',
    'super_admin',
    'pro',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    updated_at = NOW();
    
  RAISE NOTICE 'Admin access restored for sepisodenny@gmail.com';
END $$;

-- Verify the result
SELECT id, email, role, created_at FROM users WHERE email = 'sepisodenny@gmail.com';
