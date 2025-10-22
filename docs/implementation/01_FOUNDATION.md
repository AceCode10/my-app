# Phase 1: Foundation & Migration (Weeks 1-2)

**Goal:** Clean Supabase backend, Firebase removed, auth working  
**Effort:** 33 hours  
**Status:** Ready to start

---

## Overview

This phase establishes the foundation by:
1. Setting up Supabase infrastructure
2. Deploying database schema with RLS
3. Migrating authentication
4. Removing all Firebase code
5. Creating development utilities

---

## Tasks Breakdown

### Task 1.1: Set up Supabase Projects (4 hours)

**Deliverable:** Three Supabase projects configured

#### Steps:
1. **Create Projects**
   - Go to https://supabase.com/dashboard
   - Create 3 projects:
     - `igcse-simplified-dev`
     - `igcse-simplified-staging`
     - `igcse-simplified-prod`
   - Choose region: closest to target users (e.g., `us-east-1` or `eu-west-1`)
   - Choose plan: Free for dev, Pro for prod

2. **Configure Projects**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to dev project
   supabase link --project-ref <dev-project-ref>
   ```

3. **Set Environment Variables**
   ```bash
   # .env.local (dev)
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Keep secret!
   
   # Add to Vercel for staging/prod
   ```

4. **Enable Required Extensions**
   - Go to Database → Extensions
   - Enable: `uuid-ossp`, `pg_trgm`

**Acceptance Criteria:**
- [ ] All 3 projects created and accessible
- [ ] Environment variables set locally
- [ ] CLI linked to dev project

---

### Task 1.2: Deploy Database Schema (8 hours)

**Deliverable:** Complete Postgres schema with all tables, indexes, triggers

#### Steps:
1. **Run Schema Migration**
   ```bash
   # From project root
   psql -h db.xxx.supabase.co -U postgres -d postgres \
     -f docs/migration/DATABASE_SCHEMA.sql
   ```

2. **Apply RLS Policies**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres \
     -f docs/migration/RLS_POLICIES.sql
   ```

3. **Verify Schema**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   
   -- Check RLS enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   
   -- Check indexes
   SELECT tablename, indexname 
   FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

4. **Test RLS Policies**
   ```sql
   -- Set test user context
   SET LOCAL app.current_user_role = 'student';
   
   -- Try queries (should respect RLS)
   SELECT * FROM questions WHERE visibility = 'published';
   ```

**Acceptance Criteria:**
- [ ] All 20+ tables created
- [ ] All indexes created
- [ ] All triggers working
- [ ] RLS enabled on all tables
- [ ] Helper functions created

---

### Task 1.3: Migrate Auth to Supabase (6 hours)

**Deliverable:** Supabase Auth working, users can sign up/login

#### Steps:
1. **Configure Auth Settings**
   - Go to Authentication → Settings
   - Enable email confirmation (optional for dev)
   - Set site URL: `http://localhost:3000` (dev)
   - Add redirect URLs

2. **Update Auth Components**
   
   **Replace:** `components/login-form.tsx`
   ```typescript
   'use client';
   
   import { signIn } from '@/app/auth/login/actions';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';
   
   export function LoginForm() {
     return (
       <form action={signIn} className="space-y-4">
         <div>
           <Label htmlFor="email">Email</Label>
           <Input id="email" name="email" type="email" required />
         </div>
         <div>
           <Label htmlFor="password">Password</Label>
           <Input id="password" name="password" type="password" required />
         </div>
         <Button type="submit" className="w-full">
           Sign In
         </Button>
       </form>
     );
   }
   ```

3. **Create Auth Actions**
   
   **Create:** `app/auth/login/actions.ts`
   ```typescript
   'use server';
   
   import { createClient } from '@/lib/supabase/server';
   import { redirect } from 'next/navigation';
   
   export async function signIn(formData: FormData) {
     const supabase = await createClient();
     
     const { error } = await supabase.auth.signInWithPassword({
       email: formData.get('email') as string,
       password: formData.get('password') as string,
     });
     
     if (error) {
       redirect('/auth/login?error=Invalid credentials');
     }
     
     redirect('/dashboard');
   }
   ```

4. **Create User Profile on Signup**
   
   **Create:** `app/auth/signup/actions.ts`
   ```typescript
   'use server';
   
   import { createClient } from '@/lib/supabase/server';
   import { redirect } from 'next/navigation';
   
   export async function signUp(formData: FormData) {
     const supabase = await createClient();
     
     const email = formData.get('email') as string;
     const password = formData.get('password') as string;
     const displayName = formData.get('displayName') as string;
     
     const { data, error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         data: { display_name: displayName },
       },
     });
     
     if (error) {
       redirect('/auth/signup?error=' + error.message);
     }
     
     // Create user profile
     if (data.user) {
       await supabase.from('users').insert({
         id: data.user.id,
         email: data.user.email!,
         display_name: displayName,
         role: 'student',
       });
     }
     
     redirect('/dashboard');
   }
   ```

5. **Update Middleware** (enhance existing)
   - See CODE_EXAMPLES.md → Middleware section
   - Add role-based route protection

**Acceptance Criteria:**
- [ ] Users can sign up with email/password
- [ ] Users can log in
- [ ] User profile created in `users` table on signup
- [ ] Protected routes redirect to login
- [ ] Session persists across page reloads

---

### Task 1.4: Remove Firebase Dependencies (4 hours)

**Deliverable:** All Firebase code removed, app compiles

#### Steps:
1. **Delete Firebase Files**
   ```bash
   rm -rf src/firebase/
   rm firestore.rules
   rm firebase-debug.log
   rm src/firebase/config.ts
   rm apphosting.yaml
   ```

2. **Uninstall Firebase Packages**
   ```bash
   npm uninstall firebase firebase-admin
   ```

3. **Find and Replace Firebase Imports**
   ```bash
   # Search for Firebase imports
   grep -r "from 'firebase" src/
   grep -r "from '@/firebase" src/
   
   # Replace with Supabase equivalents
   # Use CODE_EXAMPLES.md as reference
   ```

4. **Update Affected Components**
   - Replace `src/hooks/use-classes.ts` (uses Firestore)
   - Replace `src/hooks/use-notes.ts`
   - Replace `src/hooks/use-all-classes.ts`
   - Remove `src/components/FirebaseErrorListener.tsx`

5. **Clean Package.json**
   ```json
   {
     "dependencies": {
       "@supabase/ssr": "latest",
       "@supabase/supabase-js": "latest"
       // Remove firebase, firebase-admin
     }
   }
   ```

6. **Verify Build**
   ```bash
   npm run build
   # Should compile without errors
   ```

**Acceptance Criteria:**
- [ ] No Firebase imports remain
- [ ] `npm run build` succeeds
- [ ] No Firebase packages in package.json
- [ ] All TypeScript errors resolved

---

### Task 1.5: Create Supabase Client Utilities (4 hours)

**Deliverable:** Reusable client utilities and hooks

#### Files to Create:

1. **`lib/supabase/client.ts`** (client-side)
   ```typescript
   import { createBrowserClient } from '@supabase/ssr';
   
   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
     );
   }
   ```

2. **`lib/auth/get-user.ts`**
   ```typescript
   import { createClient } from '@/lib/supabase/server';
   
   export async function getCurrentUser() {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     
     if (!user) return null;
     
     const { data: profile } = await supabase
       .from('users')
       .select('*')
       .eq('id', user.id)
       .single();
     
     return profile;
   }
   ```

3. **`lib/auth/require-auth.ts`**
   ```typescript
   import { getCurrentUser } from './get-user';
   import { redirect } from 'next/navigation';
   
   export async function requireAuth(allowedRoles?: string[]) {
     const user = await getCurrentUser();
     
     if (!user) redirect('/auth/login');
     
     if (allowedRoles && !allowedRoles.includes(user.role)) {
       redirect('/unauthorized');
     }
     
     return user;
   }
   ```

4. **`hooks/use-user.ts`**
   - See CODE_EXAMPLES.md

5. **`types/database.ts`**
   - Add TypeScript interfaces for all tables
   - See CODE_EXAMPLES.md

**Acceptance Criteria:**
- [ ] Client utilities created
- [ ] Auth helpers working
- [ ] TypeScript types defined
- [ ] Hooks tested in components

---

### Task 1.6: Set up Storage Buckets (3 hours)

**Deliverable:** Storage buckets configured with policies

#### Steps:
1. **Create Buckets**
   - Go to Storage in Supabase Dashboard
   - Create buckets:
     - `notes-media` (public)
     - `question-media` (private)
     - `papers` (private)
     - `user-avatars` (public)
     - `flashcard-media` (public)

2. **Set Bucket Policies**
   ```sql
   -- Public read for notes-media
   CREATE POLICY "Public can view notes media"
     ON storage.objects FOR SELECT
     USING (bucket_id = 'notes-media');
   
   -- Authenticated upload
   CREATE POLICY "Authenticated users can upload avatars"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'user-avatars' AND
       auth.uid() IS NOT NULL
     );
   
   -- Admin upload for content
   CREATE POLICY "Admins can upload question media"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'question-media' AND
       (SELECT role FROM users WHERE id = auth.uid()) 
       IN ('super_admin', 'content_moderator')
     );
   ```

3. **Create Upload Utilities**
   
   **Create:** `lib/storage/upload.ts`
   - See CODE_EXAMPLES.md → Storage Operations

4. **Test Upload/Download**
   ```typescript
   // Test in a component
   const file = new File(['test'], 'test.txt');
   const url = await uploadFile('notes-media', 'test/test.txt', file);
   console.log('Uploaded:', url);
   ```

**Acceptance Criteria:**
- [ ] All 5 buckets created
- [ ] Policies applied and tested
- [ ] Upload utility working
- [ ] Public URLs accessible

---

### Task 1.7: Create Seed Data Scripts (4 hours)

**Deliverable:** Scripts to populate dev database with sample data

#### Create: `scripts/seed-dev.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedDatabase() {
  // 1. Create subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .insert([
      {
        name: 'Mathematics',
        code: 'MATH',
        slug: 'mathematics',
        level: 'IGCSE',
        exam_board: 'Cambridge',
      },
      {
        name: 'Physics',
        code: 'PHYS',
        slug: 'physics',
        level: 'IGCSE',
        exam_board: 'Cambridge',
      },
    ])
    .select();
  
  // 2. Create topics
  await supabase.from('topics').insert([
    {
      subject_id: subjects![0].id,
      name: 'Algebra',
      slug: 'algebra',
      ordering: 1,
    },
    {
      subject_id: subjects![0].id,
      name: 'Geometry',
      slug: 'geometry',
      ordering: 2,
    },
  ]);
  
  // 3. Create sample questions
  await supabase.from('questions').insert([
    {
      subject_id: subjects![0].id,
      topic_id: topics![0].id,
      question_type: 'mcq',
      stem_md: 'What is 2 + 2?',
      options: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
        { id: 'c', text: '5' },
      ],
      correct_answer: { answer: 'b' },
      marks: 1,
      examiner_comment: 'Basic addition',
      visibility: 'published',
    },
  ]);
  
  // 4. Create test users
  // (Use Supabase Auth API or dashboard)
  
  console.log('✅ Database seeded successfully');
}

seedDatabase().catch(console.error);
```

#### Add Script to package.json
```json
{
  "scripts": {
    "seed:dev": "tsx scripts/seed-dev.ts"
  }
}
```

**Acceptance Criteria:**
- [ ] Seed script creates sample data
- [ ] At least 2 subjects, 5 topics, 20 questions
- [ ] Test users created (student, teacher, admin)
- [ ] Script is idempotent (can run multiple times)

---

## Testing Checklist

After completing all tasks:

- [ ] Can create new account via signup
- [ ] Can log in with credentials
- [ ] Session persists after page refresh
- [ ] Protected routes redirect unauthenticated users
- [ ] Database queries respect RLS policies
- [ ] File uploads work to all buckets
- [ ] No Firebase code remains
- [ ] `npm run build` succeeds
- [ ] Dev server runs without errors

---

## Troubleshooting

**Issue:** RLS blocking queries
- **Fix:** Check `get_user_role()` function, verify auth.uid() is set

**Issue:** Storage upload fails
- **Fix:** Check bucket policies, verify file size limits

**Issue:** Build errors after Firebase removal
- **Fix:** Search for remaining Firebase imports, replace with Supabase

**Issue:** Auth redirect loop
- **Fix:** Check middleware matcher config, verify cookie handling

---

## Next Steps

Once Phase 1 is complete:
→ Proceed to [02_CORE_FEATURES.md](./02_CORE_FEATURES.md)
