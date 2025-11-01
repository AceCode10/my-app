# Notes Page Troubleshooting Guide

## Issue: Notes page stuck on "Loading component..."

Since the `notes` table already exists, the issue is likely one of the following:

---

## 🔍 **Diagnostic Steps**

### **Step 1: Check Browser Console**

1. Open the notes page: `/admin/dashboard/notes`
2. Open DevTools (F12)
3. Go to Console tab
4. Look for errors

**Expected logs:**
```
Notes fetched successfully: X notes
```

**If you see an error:**
- Copy the exact error message
- It will tell us what's wrong (RLS policy, missing column, etc.)

---

### **Step 2: Check RLS Policies**

Run this in Supabase SQL Editor:

```sql
-- Check if RLS is blocking access
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'notes';

-- Check existing policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'notes';
```

**If no admin policies exist:**
- Run the SQL in `FIX_NOTES_RLS.sql`

---

### **Step 3: Test Direct Query**

Run this in Supabase SQL Editor:

```sql
-- Test if you can query notes
SELECT COUNT(*) FROM notes;

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notes'
ORDER BY ordinal_position;
```

**If query fails:**
- Check the error message
- Might be a column mismatch

---

### **Step 4: Check User Permissions**

Run this in Supabase SQL Editor:

```sql
-- Check your user's admin status
SELECT 
    id,
    email,
    is_admin,
    role,
    subscription_tier
FROM users
WHERE id = auth.uid();
```

**If `is_admin` is false or NULL:**
- You need to promote yourself to admin first

---

## 🔧 **Common Fixes**

### **Fix 1: RLS Policy Issue**

If notes table has RLS enabled but no admin policy:

```sql
-- Run FIX_NOTES_RLS.sql
-- Or manually add this policy:

CREATE POLICY "Admins can view all notes"
    ON notes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.is_admin = true OR users.role IN ('super_admin', 'content_moderator'))
        )
    );
```

### **Fix 2: Column Mismatch**

If the notes table has different columns than expected:

Check what columns exist:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'notes';
```

Expected columns:
- id, title, subtitle, slug, content_md, rendered_html
- subject_id, topic_id, author_id
- visibility, tags, is_downloadable
- view_count, version
- created_at, updated_at, published_at

### **Fix 3: Missing Data**

If table is empty and loading forever:

The hook should still finish loading and show "No notes found". If it's stuck, there's a different issue.

---

## 🚀 **Quick Fixes to Try**

### **Option 1: Temporarily Disable RLS (Testing Only)**

```sql
-- ONLY FOR TESTING - DO NOT USE IN PRODUCTION
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
```

Then refresh the page. If it works, the issue is RLS policies.

Re-enable RLS and add proper policies:
```sql
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
-- Then run FIX_NOTES_RLS.sql
```

### **Option 2: Check Supabase Client**

Make sure your Supabase client is authenticated:

Add this to the notes page temporarily:
```typescript
useEffect(() => {
    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user);
        console.log('User ID:', user?.id);
    }
    checkAuth();
}, []);
```

### **Option 3: Simplify the Query**

Try fetching without filters first:

```typescript
// In use-notes.ts, temporarily simplify:
const { data: notesData, error: fetchError } = await supabase
    .from('notes')
    .select('id, title, created_at')
    .limit(10);
```

If this works, the issue is with a specific column or filter.

---

## 📊 **What to Check**

1. **Browser Console Errors** - Most important!
2. **RLS Policies** - Do admins have SELECT permission?
3. **Table Structure** - Do all columns exist?
4. **User Authentication** - Are you logged in as admin?
5. **Network Tab** - Is the request being made? What's the response?

---

## 🎯 **Most Likely Causes**

1. **RLS Policy Missing** (80% probability)
   - Notes table has RLS enabled
   - No policy allows admins to SELECT
   - Fix: Run `FIX_NOTES_RLS.sql`

2. **Column Mismatch** (15% probability)
   - Query expects columns that don't exist
   - Fix: Check table structure and update query

3. **Authentication Issue** (5% probability)
   - User not properly authenticated
   - Fix: Check Supabase client setup

---

## ✅ **After Applying Fix**

1. Restart dev server
2. Clear browser cache (Ctrl+Shift+R)
3. Check console for "Notes fetched successfully: X notes"
4. Page should show either:
   - List of notes (if any exist)
   - "No notes found matching your criteria" (if table is empty)

---

## 📝 **Next Steps**

1. Check browser console first
2. Share any error messages you see
3. Run the diagnostic SQL queries
4. Try the appropriate fix based on the error

**The console error will tell us exactly what's wrong!** 🔍
