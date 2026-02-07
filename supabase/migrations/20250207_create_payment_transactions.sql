-- Create payment_transactions table for logging all payment activities
-- Handle case where table might already exist from previous migration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions' AND table_schema = 'public') THEN
        CREATE TABLE payment_transactions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          user_email TEXT NOT NULL,
          plan TEXT NOT NULL CHECK (plan IN ('essential', 'pro')),
          billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
          amount DECIMAL(10,2) NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          reference TEXT NOT NULL UNIQUE,
          lenco_reference TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
          payment_type TEXT, -- 'card', 'mobile-money'
          fee DECIMAL(10,2),
          verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Table exists, check if user_id column exists and add if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE payment_transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
        
        -- Add other missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'plan' AND table_schema = 'public') THEN
            ALTER TABLE payment_transactions ADD COLUMN plan TEXT NOT NULL CHECK (plan IN ('essential', 'pro'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'billing_cycle' AND table_schema = 'public') THEN
            ALTER TABLE payment_transactions ADD COLUMN billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'verified_at' AND table_schema = 'public') THEN
            ALTER TABLE payment_transactions ADD COLUMN verified_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_email ON payment_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON payment_transactions;

-- Users can only view their own transactions
CREATE POLICY "Users can view their own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service_role (server-side) can insert/update - no public inserts
CREATE POLICY "Service role can insert transactions" ON payment_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update transactions" ON payment_transactions
  FOR UPDATE USING (auth.role() = 'service_role');

COMMENT ON TABLE payment_transactions IS 'Logs all payment transactions processed through Lenco by Broadpay';
