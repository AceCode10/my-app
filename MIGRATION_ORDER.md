# Migration Order and Troubleshooting

## Correct Order to Apply Migrations

Apply these migrations in **EXACTLY** this order:

### 1. Create Audit Log Table
**File:** `20241101_create_audit_log.sql`

This creates the `audit_logs` table and helper function.

### 2. Create Permission Functions  
**File:** `20241101_simplified_permission_functions.sql`

This creates helper functions that the RLS policies will use:
- `is_super_admin(user_id)`
- `is_content_moderator(user_id)`
- `is_any_admin(user_id)`
- `has_permission(user_id, permission)`

### 3. Create RLS Policies
**File:** `20241101_simplified_admin_rls_policies.sql`

This creates Row-Level Security policies using the functions from step 2.

### 4. Create User Promotion Functions
**File:** `20241101_user_promotion_functions.sql`

This creates functions to promote/demote users:
- `promote_user_to_admin(email, role)`
- `demote_admin_to_user(email, new_role)`
- `change_user_role(email, new_role)`

## Common Errors and Solutions

### Error: "column user_id does not exist"

**Cause:** You're trying to run the RLS policies migration before creating the audit_logs table.

**Solution:** 
1. Make sure you ran `20241101_create_audit_log.sql` first
2. Verify the audit_logs table exists:
   ```sql
   SELECT * FROM audit_logs LIMIT 1;
   ```

### Error: "function is_super_admin does not exist"

**Cause:** You're trying to run the RLS policies before creating the permission functions.

**Solution:**
1. Run `20241101_simplified_permission_functions.sql` first
2. Verify functions exist:
   ```sql
   SELECT is_super_admin(auth.uid());
   ```

### Error: "policy already exists"

**Cause:** You're trying to create a policy that already exists.

**Solution:** The migration now includes `DROP POLICY IF EXISTS` statements, so just re-run it.

### Error: "table does not exist" for questions/past_papers/subjects/topics

**Cause:** Your database doesn't have these tables yet.

**Solution:** Comment out the sections for tables that don't exist yet. You can add them later when you create those tables.

## Verification Steps

After applying all migrations, verify everything works:

### 1. Check Audit Logs Table
```sql
SELECT * FROM audit_logs LIMIT 1;
```

### 2. Check Permission Functions
```sql
-- Replace with your actual user ID
SELECT 
  is_super_admin('YOUR-USER-ID'),
  is_any_admin('YOUR-USER-ID'),
  has_permission('YOUR-USER-ID', 'manage_content');
```

### 3. Check RLS Policies
```sql
-- List all policies on audit_logs
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'audit_logs';
```

### 4. Test Audit Log Creation
```sql
SELECT create_audit_log(
  auth.uid(),
  'test',
  'system',
  null,
  'Testing audit log',
  '{}'::jsonb
);
```

## If You Need to Start Over

If something went wrong and you want to reset:

```sql
-- Drop all policies
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Content moderators can view their own logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;

-- Drop functions
DROP FUNCTION IF EXISTS is_super_admin(UUID);
DROP FUNCTION IF EXISTS is_content_moderator(UUID);
DROP FUNCTION IF EXISTS is_any_admin(UUID);
DROP FUNCTION IF EXISTS has_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS create_audit_log;

-- Drop audit_logs table (WARNING: This deletes all audit data!)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Now re-run migrations in order
```

## Success Indicators

You'll know everything is working when:
- ✅ No errors when running migrations
- ✅ `SELECT * FROM audit_logs` returns empty result (not an error)
- ✅ `SELECT is_super_admin(auth.uid())` returns true/false (not an error)
- ✅ Your admin dashboard still loads correctly
- ✅ You can create audit log entries
