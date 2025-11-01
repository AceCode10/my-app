# Troubleshooting Migration Errors

## Error: "column user_id does not exist"

This error means your existing `audit_logs` table has a different structure than expected.

### Solution:

**Step 1: Check Your Current Table Structure**

Run this SQL in Supabase SQL Editor:

```sql
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
```

**Step 2: Choose Your Approach**

### Option A: Update Existing Table (Recommended)

The updated `20241101_create_audit_log.sql` now handles this automatically. It will:
- Skip creating the table if it exists
- Add missing columns to your existing table
- Preserve your existing data

Just re-run: `20241101_create_audit_log.sql`

### Option B: Drop and Recreate (If you don't need existing audit data)

```sql
-- WARNING: This deletes all existing audit log data!
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Now run: 20241101_create_audit_log.sql
```

### Option C: Skip Audit Logs (Temporary)

If you want to continue without audit logs for now:
1. Skip `20241101_create_audit_log.sql`
2. Run `20241101_simplified_permission_functions.sql`
3. Comment out audit_logs sections in `20241101_simplified_admin_rls_policies.sql`

---

## Error: "function does not exist"

### Cause
You're trying to use a function before creating it.

### Solution
Make sure you run migrations in this order:
1. `20241101_create_audit_log.sql`
2. `20241101_simplified_permission_functions.sql`
3. `20241101_simplified_admin_rls_policies.sql`

---

## Error: "policy already exists"

### Cause
You've run the migration before and policies already exist.

### Solution
The migrations now include `DROP POLICY IF EXISTS` statements. Just re-run the migration.

---

## Error: "table does not exist" for questions/past_papers/etc.

### Cause
Your database doesn't have these tables yet.

### Solution
Comment out the sections in `20241101_simplified_admin_rls_policies.sql` for tables you don't have:

```sql
-- Comment out sections like this:
/*
-- ============================================
-- QUESTIONS TABLE POLICIES
-- ============================================
... entire section ...
*/
```

You can uncomment and run them later when you create those tables.

---

## Verify Everything Works

After successful migration, run these tests:

### Test 1: Audit Logs Table
```sql
-- Should return empty result (not an error)
SELECT * FROM audit_logs LIMIT 1;
```

### Test 2: Permission Functions
```sql
-- Should return true or false (not an error)
SELECT is_super_admin(auth.uid());
```

### Test 3: Create Audit Log
```sql
-- Should succeed
SELECT create_audit_log(
  auth.uid(),
  'test',
  'system',
  null,
  'Test entry',
  '{}'::jsonb
);

-- Verify it was created
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
```

---

## Still Having Issues?

1. Run `CHECK_EXISTING_SCHEMA.sql` to see your current database structure
2. Share the output and the exact error message
3. We can create a custom migration for your specific setup
