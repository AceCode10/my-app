# Admin Functionality Setup Guide (Simplified)

This guide will help you enhance your existing admin system with audit logging and database-level security.

## What This Adds to Your Existing System

Your current admin system already has:
- Admin dashboard UI
- Role-based navigation (super_admin, content_moderator)
- users.role column with admin roles

This setup adds:
- Audit logging - Track all admin actions
- Helper functions - Simplify permission checks
- RLS policies - Database-level security

## Step 1: Apply Database Migrations

Apply these 3 migrations in order using Supabase SQL Editor:

### Migration 1: Audit Logs
File: supabase/migrations/20241101_create_audit_log.sql

Creates the audit_logs table to track all admin actions.

### Migration 2: Permission Functions
File: supabase/migrations/20241101_simplified_permission_functions.sql

Creates helper functions:
- is_super_admin(user_id)
- is_content_moderator(user_id)
- is_any_admin(user_id)
- has_permission(user_id, permission)

### Migration 3: RLS Policies
File: supabase/migrations/20241101_simplified_admin_rls_policies.sql

Adds Row-Level Security policies for audit logs, users, questions, past papers, subjects, and topics.

## Step 2: Apply Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of each migration file
5. Run each migration in order
6. Verify no errors

## Step 3: Verify Setup

Test permission functions in SQL Editor:

SELECT 
  is_super_admin(auth.uid()) as is_super_admin,
  is_any_admin(auth.uid()) as is_any_admin;

## Step 4: Using Audit Logs

Create audit log entries in your code:

await supabase.rpc('create_audit_log', {
  p_user_id: user.id,
  p_action: 'create',
  p_resource_type: 'question',
  p_resource_id: newQuestionId,
  p_description: 'Created new question',
  p_metadata: {}
});

## What's Protected Now

Database Level (RLS):
- Audit logs are immutable
- Only super admins can manage users
- Only admins can create/edit questions
- Only admins can create/edit past papers

Application Level (Your existing code):
- Role-based navigation
- Route protection in layout
- UI elements hidden based on role

## Next Steps

After applying migrations:
1. Test admin access still works
2. Add audit logging to key admin actions
3. Verify RLS policies work as expected
4. Continue with content moderator feature implementation
