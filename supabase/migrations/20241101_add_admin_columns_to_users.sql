-- ============================================
-- ADD ADMIN COLUMNS TO USERS TABLE
-- Extends users table with admin-related fields
-- ============================================

-- Add admin role reference
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL;

-- Add admin status flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add admin approval tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add last admin activity timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_admin_activity_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_users_admin_role_id ON users(admin_role_id) WHERE admin_role_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.admin_role_id IS 'Reference to admin_roles table if user is an admin';
COMMENT ON COLUMN users.is_admin IS 'Quick flag to check if user has admin privileges';
COMMENT ON COLUMN users.admin_approved_at IS 'Timestamp when admin privileges were granted';
COMMENT ON COLUMN users.admin_approved_by IS 'User ID of the super admin who granted privileges';
