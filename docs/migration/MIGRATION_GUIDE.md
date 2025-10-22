# Firebase to Supabase Migration Guide

## Overview

This guide details the complete migration from Firebase/Firestore to Supabase for IGCSE Simplified.

**Migration Scope:**
- Authentication (Firebase Auth → Supabase Auth)
- Database (Firestore → Postgres)
- Storage (Firebase Storage → Supabase Storage)
- Functions (Cloud Functions → Supabase Edge Functions)
- Realtime (Firestore listeners → Supabase Realtime)

---

## 1. Data Model Mapping

### Firestore Collections → Postgres Tables

| Firestore | Supabase | Key Changes |
|-----------|----------|-------------|
| `users` | `users` | • role: string → enum<br>• Remove `isVerified` (handled by auth)<br>• Add `subscription_tier`, `leaderboard_opt_out` |
| `subjects` | `subjects` | • Add `level` enum, `exam_board`<br>• Rename `code` field |
| `topics` | `topics` | • Add `parent_topic_id` for hierarchy<br>• Add `ordering` for sort |
| `notes` | `notes` | • `contentRaw` → `content_md`<br>• `contentFormat` removed (always markdown)<br>• Add `is_downloadable` boolean |
| `questions` | `questions` | • Add `examiner_comment` (required)<br>• `correctAnswer` → `correct_answer` (jsonb)<br>• Add `paper_id`, `paper_position` |
| `quizzes` | `tests` | • Rename collection<br>• `questionIds` → `sections` (jsonb structure) |
| `classes` | `classes` | • `studentIds` array → separate `enrollments` table<br>• Add `join_code` (auto-generated) |
| N/A | `enrollments` | • New junction table for class membership |
| `assignments` | `assignments` | • Add `time_limit_minutes`, `release_answers_at` |
| `quizAttempts` | `attempts` | • Add `grading_details` jsonb<br>• Add `requires_manual_grading` |
| N/A | `papers` | • New table for full past papers |
| N/A | `notifications` | • New table for in-app notifications |
| N/A | `messages` | • New table for direct messaging |

---

## 2. Authentication Migration

### Firebase Auth → Supabase Auth

**Providers to Migrate:**
- Email/Password ✅
- Google OAuth (optional, deferred)
- Facebook OAuth (optional, deferred)
- Phone/SMS (optional, deferred)

### Migration Steps

#### Step 1: Export Firebase Users
```bash
# Using Firebase Admin SDK
node scripts/export-firebase-users.js
# Outputs: firebase-users-export.json
```

#### Step 2: Transform User Data
```javascript
// scripts/transform-users.js
const firebaseUsers = require('./firebase-users-export.json');

const supabaseUsers = firebaseUsers.map(user => ({
  email: user.email,
  email_confirmed_at: user.emailVerified ? new Date().toISOString() : null,
  user_metadata: {
    display_name: user.displayName,
    avatar_url: user.photoURL
  }
}));
```

#### Step 3: Import to Supabase
```bash
# Use Supabase CLI
supabase db seed --file scripts/seed-users.sql
```

#### Step 4: Create User Profiles
```sql
-- After auth users created, populate users table
INSERT INTO users (id, email, display_name, avatar_url, role, xp, streak_days)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'display_name',
  au.raw_user_meta_data->>'avatar_url',
  COALESCE(au.raw_user_meta_data->>'role', 'student'),
  COALESCE((au.raw_user_meta_data->>'xp')::integer, 0),
  COALESCE((au.raw_user_meta_data->>'streak')::integer, 0)
FROM auth.users au
ON CONFLICT (id) DO NOTHING;
```

### Auth Code Changes

**Before (Firebase):**
```typescript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
const userCredential = await signInWithEmailAndPassword(auth, email, password);
```

**After (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

---

## 3. Database Migration

### Step 1: Export Firestore Data

```javascript
// scripts/export-firestore.js
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

async function exportCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const docs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  fs.writeFileSync(
    `exports/${collectionName}.json`,
    JSON.stringify(docs, null, 2)
  );
}

// Export all collections
const collections = ['subjects', 'topics', 'notes', 'questions', 'classes', 'assignments'];
Promise.all(collections.map(exportCollection));
```

### Step 2: Transform Data

```javascript
// scripts/transform-data.js
const subjects = require('./exports/subjects.json');

// Transform Firestore timestamps to ISO strings
const transformedSubjects = subjects.map(s => ({
  id: s.id,
  name: s.name,
  code: s.code,
  slug: s.slug,
  level: s.level || 'IGCSE',
  exam_board: s.examBoard || 'Cambridge',
  created_at: s.createdAt._seconds ? new Date(s.createdAt._seconds * 1000).toISOString() : new Date().toISOString(),
  updated_at: s.updatedAt._seconds ? new Date(s.updatedAt._seconds * 1000).toISOString() : new Date().toISOString()
}));

// Generate SQL insert statements
const sql = transformedSubjects.map(s => 
  `INSERT INTO subjects (id, name, code, slug, level, exam_board, created_at, updated_at) 
   VALUES ('${s.id}', '${s.name}', '${s.code}', '${s.slug}', '${s.level}', '${s.exam_board}', '${s.created_at}', '${s.updated_at}');`
).join('\n');

fs.writeFileSync('migrations/seed-subjects.sql', sql);
```

### Step 3: Import to Postgres

```bash
# Run migrations
psql -h db.xxx.supabase.co -U postgres -d postgres -f docs/migration/DATABASE_SCHEMA.sql
psql -h db.xxx.supabase.co -U postgres -d postgres -f docs/migration/RLS_POLICIES.sql

# Import data
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/seed-subjects.sql
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/seed-topics.sql
# ... repeat for all collections
```

### Step 4: Verify Data Integrity

```sql
-- Check record counts
SELECT 'subjects' as table_name, COUNT(*) as count FROM subjects
UNION ALL
SELECT 'topics', COUNT(*) FROM topics
UNION ALL
SELECT 'notes', COUNT(*) FROM notes
UNION ALL
SELECT 'questions', COUNT(*) FROM questions;

-- Verify foreign key relationships
SELECT 
  t.subject_id,
  s.name as subject_name,
  COUNT(*) as topic_count
FROM topics t
LEFT JOIN subjects s ON t.subject_id = s.id
GROUP BY t.subject_id, s.name;
```

---

## 4. Storage Migration

### Firebase Storage → Supabase Storage

**Bucket Structure:**
- `notes-media` - Images/diagrams in notes
- `question-media` - Question diagrams
- `papers` - PDF past papers
- `user-avatars` - Profile pictures
- `flashcard-media` - Flashcard images

### Migration Steps

#### Step 1: Create Buckets
```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('notes-media', 'notes-media', true),
  ('question-media', 'question-media', false),
  ('papers', 'papers', false),
  ('user-avatars', 'user-avatars', true),
  ('flashcard-media', 'flashcard-media', true);
```

#### Step 2: Set Storage Policies
```sql
-- Public read for public buckets
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
    (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'content_moderator')
  );
```

#### Step 3: Transfer Files
```javascript
// scripts/migrate-storage.js
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const bucket = admin.storage().bucket();

async function migrateFile(firebasePath, supabaseBucket, supabasePath) {
  // Download from Firebase
  const [fileBuffer] = await bucket.file(firebasePath).download();
  
  // Upload to Supabase
  const { data, error } = await supabase.storage
    .from(supabaseBucket)
    .upload(supabasePath, fileBuffer, {
      contentType: 'auto',
      upsert: false
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(supabaseBucket)
    .getPublicUrl(supabasePath);
  
  return publicUrl;
}

// Migrate all files
const files = await bucket.getFiles();
for (const file of files[0]) {
  const newUrl = await migrateFile(file.name, 'notes-media', file.name);
  console.log(`Migrated: ${file.name} -> ${newUrl}`);
}
```

#### Step 4: Update Database References
```sql
-- Update storage paths in database
UPDATE notes
SET content_md = REPLACE(
  content_md,
  'https://firebasestorage.googleapis.com/v0/b/igcse-simplified',
  'https://xxx.supabase.co/storage/v1/object/public'
);

UPDATE questions
SET media_refs = ARRAY(
  SELECT REPLACE(
    unnest(media_refs),
    'gs://igcse-simplified',
    'https://xxx.supabase.co/storage/v1/object/public'
  )
);
```

---

## 5. Realtime Migration

### Firestore Listeners → Supabase Realtime

**Before (Firestore):**
```typescript
import { onSnapshot, collection, query, where } from 'firebase/firestore';

const q = query(
  collection(db, 'classes'),
  where('teacherId', '==', userId)
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setClasses(classes);
});
```

**After (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Initial fetch
const { data: classes } = await supabase
  .from('classes')
  .select('*')
  .eq('teacher_id', userId);

setClasses(classes);

// Subscribe to changes
const channel = supabase
  .channel('classes-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'classes',
      filter: `teacher_id=eq.${userId}`
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setClasses(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setClasses(prev => prev.map(c => 
          c.id === payload.new.id ? payload.new : c
        ));
      } else if (payload.eventType === 'DELETE') {
        setClasses(prev => prev.filter(c => c.id !== payload.old.id));
      }
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

## 6. Cloud Functions → Edge Functions

### Migration Strategy

Most Firebase Cloud Functions can be replaced with:
1. **Supabase Edge Functions** (Deno runtime)
2. **Postgres Functions** (for database triggers)
3. **Next.js API Routes** (for complex logic)

### Example: Auto-grading Function

**Before (Cloud Function):**
```javascript
// functions/src/autograde.js
exports.autogradeAttempt = functions.firestore
  .document('attempts/{attemptId}')
  .onUpdate(async (change, context) => {
    const attempt = change.after.data();
    if (attempt.status !== 'submitted') return;
    
    // Grading logic...
  });
```

**After (Postgres Function):**
```sql
-- Trigger on attempt submission
CREATE OR REPLACE FUNCTION autograde_attempt()
RETURNS TRIGGER AS $$
DECLARE
  question_record RECORD;
  total_score numeric := 0;
  max_score numeric := 0;
BEGIN
  -- Only grade when status changes to 'submitted'
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    
    -- Loop through questions and grade
    FOR question_record IN
      SELECT q.id, q.question_type, q.correct_answer, q.marks
      FROM questions q
      WHERE q.id IN (
        SELECT (jsonb_array_elements(t.sections)->>'id')::uuid
        FROM tests t
        WHERE t.id = NEW.test_id
      )
    LOOP
      max_score := max_score + question_record.marks;
      
      -- Grade based on question type
      IF question_record.question_type = 'mcq' THEN
        IF (NEW.answers->question_record.id::text->>'answer') = 
           (question_record.correct_answer->>'answer') THEN
          total_score := total_score + question_record.marks;
        END IF;
      END IF;
      -- Add more question types...
    END LOOP;
    
    -- Update attempt with score
    NEW.score := total_score;
    NEW.max_score := max_score;
    NEW.percentage := (total_score / NULLIF(max_score, 0)) * 100;
    NEW.graded := true;
    NEW.status := 'graded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER autograde_on_submit
BEFORE UPDATE ON attempts
FOR EACH ROW
EXECUTE FUNCTION autograde_attempt();
```

---

## 7. Code Removal Checklist

### Files to Delete
```bash
rm -rf src/firebase/
rm firestore.rules
rm firebase-debug.log
rm src/firebase/config.ts
rm src/firebase/index.ts
rm src/firebase/provider.tsx
rm src/firebase/auth/
rm src/firebase/firestore/
```

### Dependencies to Remove
```bash
npm uninstall firebase firebase-admin
```

### Update package.json
```json
{
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest"
  }
}
```

---

## 8. Cutover Plan

### Pre-Cutover (1 week before)
- [ ] Complete data migration to staging
- [ ] Run parallel writes (Firebase + Supabase)
- [ ] Verify data consistency
- [ ] Test all critical paths in staging
- [ ] Train admins on new CMS

### Cutover Day
1. **T-2 hours:** Announce maintenance window
2. **T-1 hour:** Set Firebase to read-only
3. **T-30 min:** Final data sync
4. **T-15 min:** Deploy new code to production
5. **T-0:** Switch DNS/routing to new app
6. **T+15 min:** Verify critical flows
7. **T+1 hour:** Monitor errors, rollback if needed
8. **T+4 hours:** All-clear announcement

### Rollback Plan
If critical issues arise:
1. Revert DNS to old Firebase app
2. Re-enable Firebase writes
3. Sync any new data from Supabase → Firebase
4. Investigate issues in staging
5. Schedule new cutover date

---

## 9. Verification Checklist

After migration, verify:

- [ ] All users can log in
- [ ] User roles preserved correctly
- [ ] All subjects/topics display
- [ ] Notes render with images
- [ ] Questions load in Test Builder
- [ ] Teachers can create classes
- [ ] Students can join classes
- [ ] Assignments can be created
- [ ] Quiz attempts save correctly
- [ ] Auto-grading works
- [ ] Leaderboard updates
- [ ] File uploads work
- [ ] Storage URLs resolve

---

## 10. Performance Optimization

Post-migration optimizations:

```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_attempts_user_status 
  ON attempts(user_id, status) 
  WHERE status = 'in_progress';

CREATE INDEX CONCURRENTLY idx_questions_visibility_type 
  ON questions(visibility, question_type) 
  WHERE visibility = 'published';

-- Analyze tables
ANALYZE users;
ANALYZE questions;
ANALYZE attempts;

-- Enable query plan caching
ALTER DATABASE postgres SET plan_cache_mode = 'auto';
```

---

## Support & Troubleshooting

**Common Issues:**

1. **RLS blocking queries** → Check user role function, verify auth.uid()
2. **Storage 404s** → Verify bucket policies, check file paths
3. **Slow queries** → Add indexes, use EXPLAIN ANALYZE
4. **Realtime not updating** → Check channel subscriptions, verify RLS

**Contact:** See MASTER_PLAN.md for escalation
