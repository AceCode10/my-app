-- Create index on users.id to dramatically improve lookup performance
-- This will fix the slow query: FROM users WHERE id = ?

-- Check if index exists first to avoid errors on re-runs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'users_id_idx'
    ) THEN
        CREATE INDEX IF NOT EXISTS users_id_idx ON public.users(id);
    END IF;
END
$$;

-- Note: auth.users already has a primary key index on id
-- No need to create additional index there
