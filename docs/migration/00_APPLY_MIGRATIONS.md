# Migration Application Guide

## Order of Execution

Run these SQL files in Supabase SQL Editor in this exact order:

### 1. Database Schema
```sql
-- Run: docs/migration/DATABASE_SCHEMA.sql
-- Creates all tables, indexes, and basic triggers
```

### 2. User Profile Auto-Creation
```sql
-- Run: docs/migration/FIX_AUTO_USER_PROFILE.sql
-- CRITICAL: Sets up automatic user profile creation on signup
-- This fixes the login issue
```

### 3. RLS Policies
```sql
-- Run: docs/migration/RLS_POLICIES.sql
-- Applies all row-level security policies
```

## Verification

After running all migrations, verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check trigger exists
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## Status
- [ ] DATABASE_SCHEMA.sql applied
- [ ] FIX_AUTO_USER_PROFILE.sql applied
- [ ] RLS_POLICIES.sql applied
- [ ] Verification queries run successfully
