-- Add school_name and notification_preferences to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

-- Add index for notification_preferences if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences ON users USING GIN (notification_preferences);
