# Quick Start Guide

Get IGCSE Simplified up and running in 30 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Git installed
- Supabase account (free tier works for dev)
- Code editor (VS Code recommended)

---

## Step 1: Clone & Install (5 min)

```bash
# Already cloned, just install dependencies
cd my-app
npm install
```

---

## Step 2: Set Up Supabase (10 min)

### 2.1 Create Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `igcse-simplified-dev`
4. Choose region closest to you
5. Set database password (save it!)
6. Wait for project to provision (~2 min)

### 2.2 Get Credentials
1. Go to Project Settings → API
2. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret!)

### 2.3 Set Environment Variables
```bash
# Create .env.local
cp .env.example .env.local

# Edit .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Don't commit this!
```

---

## Step 3: Deploy Database Schema (10 min)

### 3.1 Enable Extensions
1. In Supabase Dashboard → Database → Extensions
2. Enable: `uuid-ossp`, `pg_trgm`

### 3.2 Run Migrations
```bash
# Get database connection string
# Dashboard → Project Settings → Database → Connection string (URI)

# Run schema
psql "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres" \
  -f docs/migration/DATABASE_SCHEMA.sql

# Run RLS policies
psql "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres" \
  -f docs/migration/RLS_POLICIES.sql
```

**Alternative:** Use Supabase SQL Editor
1. Go to SQL Editor in Dashboard
2. Copy contents of `DATABASE_SCHEMA.sql`
3. Run
4. Repeat for `RLS_POLICIES.sql`

### 3.3 Seed Sample Data
```bash
npm install -g tsx
npm run seed:dev
```

---

## Step 4: Configure Storage (3 min)

1. Go to Storage in Supabase Dashboard
2. Create buckets:
   - `notes-media` (public)
   - `question-media` (private)
   - `papers` (private)
   - `user-avatars` (public)
   - `flashcard-media` (public)

3. Set policies (run in SQL Editor):
```sql
-- Public read for notes-media
CREATE POLICY "Public can view notes media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notes-media');

-- Authenticated upload for avatars
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.uid() IS NOT NULL
  );
```

---

## Step 5: Start Development Server (2 min)

```bash
npm run dev
```

Open http://localhost:3000

---

## Step 6: Create Test Accounts

### Via UI:
1. Go to http://localhost:3000/auth/signup
2. Create accounts:
   - Student: `student@test.com` / `password123`
   - Teacher: `teacher@test.com` / `password123`
   - Admin: `admin@test.com` / `password123`

### Promote to Teacher/Admin:
```sql
-- In Supabase SQL Editor
UPDATE users SET role = 'teacher' WHERE email = 'teacher@test.com';
UPDATE users SET role = 'super_admin' WHERE email = 'admin@test.com';
```

---

## Verify Setup

✅ **Checklist:**
- [ ] Can access http://localhost:3000
- [ ] Can create account
- [ ] Can log in
- [ ] Dashboard loads without errors
- [ ] Database has sample subjects/topics
- [ ] Storage buckets created

---

## Next Steps

1. **Remove Firebase code** → See [01_FOUNDATION.md](./implementation/01_FOUNDATION.md) Task 1.4
2. **Start building features** → Follow [MASTER_PLAN.md](../MASTER_PLAN.md)
3. **Read code examples** → See [CODE_EXAMPLES.md](./code/CODE_EXAMPLES.md)

---

## Troubleshooting

### "Connection refused" when running psql
- **Fix:** Check database password, ensure IP is whitelisted in Supabase

### "RLS policy violation" errors
- **Fix:** Verify RLS_POLICIES.sql ran successfully, check user role

### "Module not found" errors
- **Fix:** Run `npm install` again, delete `node_modules` and reinstall

### Auth redirect loop
- **Fix:** Clear browser cookies, check middleware.ts config

### Storage upload fails
- **Fix:** Verify bucket policies, check file size (<50MB)

---

## Support

- **Documentation:** See `/docs` folder
- **Issues:** Check existing Firebase code for patterns
- **Supabase Docs:** https://supabase.com/docs
