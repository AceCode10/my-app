-- Add subscription-related fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'essential', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON users(subscription_expires_at);

-- Add comments
COMMENT ON COLUMN users.subscription_tier IS 'Current subscription tier: basic, essential, or pro';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status: active, inactive, cancelled, or expired';
COMMENT ON COLUMN users.subscription_expires_at IS 'When the current subscription expires';
COMMENT ON COLUMN users.subscription_updated_at IS 'When the subscription was last updated';
