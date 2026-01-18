# Admin User Setup Guide for Production

## Step 1: Create First User Account

1. **Visit your deployed app:** https://igaprep.com
2. **Sign up** with your admin email: `admin@igaprep.com`
3. **Complete the onboarding process**
4. **Verify email** (if required)

## Step 2: Promote to Super Admin

### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → **Table Editor**
2. **Open the `users` table**
3. **Find your user account** (search by email)
4. **Update the `role` field** to: `super_admin`
5. **Click Save**

### Option B: Via SQL

```sql
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@igaprep.com';
```

## Step 3: Test Admin Access

1. **Log out and log back in** to refresh permissions
2. **Navigate to:** https://igaprep.com/admin
3. **Verify you can access:**
   - ✅ Admin Dashboard
   - ✅ User Management
   - ✅ Subject Management
   - ✅ Question Management
   - ✅ Paper Management

## Step 4: Test Core Functionality

### Authentication Tests
- [ ] Login works with admin credentials
- [ ] Role-based access control functions
- [ ] Student/Teacher role separation works

### Admin Panel Tests
- [ ] Dashboard loads with statistics
- [ ] Can create/edit subjects
- [ ] Can create/edit topics
- [ ] Can upload past papers
- [ ] Can manage users

### Student/Teacher Tests
- [ ] Student dashboard loads
- [ ] Teacher dashboard loads
- [ ] Subject selection works
- [ ] Quiz functionality works (manual questions)

## Step 5: Create Sample Content

### Quick Test Content
1. **Create 1 Subject:** Mathematics
2. **Create 2 Topics:** Algebra, Geometry
3. **Create 5 Sample Questions**
4. **Upload 1 Sample Past Paper**

This ensures the platform demonstrates value to early users.

## Troubleshooting

### Admin Access Not Working
```sql
-- Check user role
SELECT email, role FROM users WHERE email = 'admin@igaprep.com';

-- Update role if needed
UPDATE users SET role = 'super_admin' WHERE email = 'admin@igaprep.com';
```

### Permission Errors
- Check RLS policies in Supabase
- Verify admin role is correctly set
- Clear browser cache and cookies

## Local Testing

Your local development environment remains unchanged:
```bash
npm run dev  # Still works with localhost:3000
```

You can create a separate admin user for local testing if needed.
