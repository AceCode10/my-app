# Admin Functionality Setup Guide

This guide will help you set up the admin functionality for IGCSE Simplified.

## Step 1: Apply Database Migrations

You need to apply the SQL migrations to your Supabase database. You can do this in two ways:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:
   - `20241101_create_admin_roles.sql`
   - `20241101_add_admin_columns_to_users.sql`
   - `20241101_create_permission_functions.sql`
   - `20241101_create_audit_log.sql`
   - `20241101_create_admin_rls_policies.sql`
   - `20241101_create_test_admins.sql`

### Option B: Using Supabase CLI

```bash
# Make sure you're in the project directory
cd my-app

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
npx supabase db push
```

## Step 2: Create Your First Super Admin

After applying migrations, you need to promote a user to Super Admin.

### Method 1: Using SQL (Recommended for first admin)

1. First, create a regular user account through your app's signup page
2. Then run this SQL in Supabase SQL Editor:

```sql
-- Replace 'your-email@example.com' with your actual email
SELECT promote_user_to_admin('your-email@example.com', 'super_admin');
```

### Method 2: Direct SQL Update

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE users 
SET 
  is_admin = true,
  admin_role_id = (SELECT id FROM admin_roles WHERE code = 'super_admin'),
  admin_approved_at = NOW(),
  role = 'super_admin'
WHERE email = 'your-email@example.com';
```

## Step 3: Verify Admin Access

1. Log out and log back in with your admin account
2. Navigate to `/admin/dashboard`
3. You should see the admin panel with full access

## Step 4: Create Content Moderator (Optional)

Once you have a Super Admin, you can promote other users:

```sql
-- Promote user to Content Moderator
SELECT promote_user_to_admin(
  'moderator@example.com', 
  'content_moderator',
  'your-super-admin@example.com'  -- Your super admin email
);
```

## Admin Roles Overview

### Super Administrator
**Full system access including:**
- User management (create, edit, delete users)
- Promote/demote admins
- System settings and configuration
- All content management capabilities
- Full audit log access
- Analytics and reports

### Content Moderator
**Content management only:**
- Create/edit/delete questions
- Upload past papers
- Create flashcard sets
- Manage subjects and topics
- View content analytics
- View their own audit logs

## Testing Admin Functionality

### Test Super Admin Access:
1. Log in as Super Admin
2. Go to `/admin/dashboard` ✅
3. Go to `/admin/users` ✅
4. Go to `/admin/settings` ✅
5. Go to `/admin/content/questions` ✅

### Test Content Moderator Access:
1. Log in as Content Moderator
2. Go to `/admin/dashboard` ✅
3. Go to `/admin/content/questions` ✅
4. Try to go to `/admin/users` ❌ Should redirect
5. Try to go to `/admin/settings` ❌ Should redirect

## Security Features

✅ **Row-Level Security (RLS)** - Database-level access control
✅ **Permission-based routing** - Server-side route protection
✅ **Audit logging** - All admin actions are logged
✅ **Immutable audit trail** - Logs cannot be edited or deleted
✅ **Role-based UI** - Sidebar shows only allowed features

## Troubleshooting

### "Access Denied" when accessing /admin
- Verify user has `is_admin = true` in database
- Check `admin_role_id` is set correctly
- Ensure you're logged in

### Content Moderator can access /admin/users
- Check RLS policies are enabled
- Verify `admin_role_id` points to content_moderator role
- Clear browser cache and re-login

### Audit logs not appearing
- Check `audit_logs` table exists
- Verify RLS policies allow reading
- Ensure `create_audit_log` function exists

## Next Steps

After setup is complete:

1. ✅ **Section 1 Complete** - Database foundation ready
2. 🔄 **Section 2** - Implement admin dashboard pages
3. 🔄 **Section 3** - Build Content Moderator features
4. 🔄 **Section 4** - Build Super Admin features
5. 🔄 **Section 5** - Test resource distribution flow

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify all migrations applied successfully
3. Test database functions in SQL Editor
4. Check browser console for client-side errors
