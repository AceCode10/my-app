# 🚀 Quick Start Guide - Apply Migrations & Test

## Step 1: Apply Database Migrations (5 minutes)

### Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar

### Run Migrations in Order

#### Migration 1: Database Schema
```sql
-- Copy entire contents of: docs/migration/DATABASE_SCHEMA.sql
-- Paste into SQL Editor and click "Run"
-- Wait for "Success" message
```

#### Migration 2: User Profile Trigger (FIXES LOGIN!)
```sql
-- Copy entire contents of: docs/migration/FIX_AUTO_USER_PROFILE.sql
-- Paste into SQL Editor and click "Run"
-- This creates automatic user profile creation
```

#### Migration 3: RLS Policies
```sql
-- Copy entire contents of: docs/migration/RLS_POLICIES.sql
-- Paste into SQL Editor and click "Run"
-- This secures all tables with row-level security
```

#### Migration 4: Seed Data (Optional - for testing)
```sql
-- Copy entire contents of: docs/migration/SEED_DATA.sql
-- Paste into SQL Editor and click "Run"
-- This adds sample subjects, topics, and notes
```

### Verify Migrations
```sql
-- Run this to check everything worked:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show 19 tables including: users, subjects, topics, notes, etc.
```

---

## Step 2: Test the Application (10 minutes)

### Start Development Server
```bash
c
```

### Test 1: User Signup
1. Go to http://localhost:3000/signup
2. Create a new account with email/password
3. Check Supabase Dashboard → Authentication → Users
4. Check Supabase Dashboard → Table Editor → users
5. ✅ User profile should be automatically created!

### Test 2: Login
1. Go to http://localhost:3000/login
2. Login with the account you just created
3. ✅ Should redirect to /dashboard (for students)
4. ✅ No "Logging In..." stuck state

### Test 3: Admin Notes (if you have admin access)
1. Create an admin user in Supabase:
   ```sql
   UPDATE users SET role = 'super_admin' WHERE email = 'dennysepiso@gmail.com';
   ```
2. Logout and login again
3. Go to http://localhost:3000/admin/dashboard/notes
4. ✅ Should see notes list (empty or with seed data)
5. ✅ Can filter by subject/topic/visibility

---

## Step 3: Create Your First Admin User

### Option A: Via Supabase Dashboard
1. Go to Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Click "Create User"
5. Go to Table Editor → users
6. Find the user and change `role` to `super_admin`

### Option B: Via SQL
```sql
-- After signing up normally, run this:
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'your@email.com';
```

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Migrations not applied. Go back to Step 1.

### Issue: Login stuck on "Logging In..."
**Solution:** 
1. Check if user profile trigger exists:
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```
2. If not found, run Migration 2 again

### Issue: "permission denied for table users"
**Solution:** RLS policies not applied. Run Migration 3.

### Issue: Can't see notes in admin dashboard
**Solution:**
1. Check if you're logged in as admin
2. Check if seed data was applied
3. Check browser console for errors

---

## Next Steps After Testing

1. ✅ Migrations applied successfully
2. ✅ Login working
3. ✅ Admin dashboard accessible
4. 🔄 Continue with notes CRUD implementation
5. 🔄 Migrate remaining Firebase code
6. 🔄 Implement other features per MASTER_PLAN.md

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Check for TypeScript errors
npm run build

# Run linter
npm run lint
```

---

## Files to Reference

- **Full Instructions:** `MIGRATION_INSTRUCTIONS.md`
- **Progress Summary:** `PROGRESS_SUMMARY.md`
- **Firebase Removal:** `FIREBASE_REMOVAL_PLAN.md`
- **Master Plan:** `docs/planning/MASTER_PLAN.md`

---

**Estimated Time:** 15-20 minutes total

**Ready?** Start with Step 1! 🚀
