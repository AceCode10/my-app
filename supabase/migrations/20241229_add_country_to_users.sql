-- ============================================
-- ADD COUNTRY FIELD TO USERS TABLE
-- For personalized content based on location
-- ============================================

-- Add country column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'country'
    ) THEN
        ALTER TABLE users ADD COLUMN country TEXT;
    END IF;
END $$;

-- Create index for faster filtering by country
CREATE INDEX IF NOT EXISTS idx_users_country ON users (country);

-- Add comment for documentation
COMMENT ON COLUMN users.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, GB, NG)';
