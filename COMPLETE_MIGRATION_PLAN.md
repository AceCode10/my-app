# Complete Firebase → Supabase Migration Plan

## Current Status

✅ **Supabase Setup Complete**
- Supabase project created: `https://inmptqnwcgymzkjjppdm.supabase.co`
- Client utilities created in `src/lib/supabase/`
- Ready to migrate

✅ **Existing Codebase Analysis**
- **152 Firebase references** across **52 files**
- Complete UI implementation in `src/app/`
- Green theme (HSL: 142.1 76.2% 36.3%)
- Inter font
- Gradient text & hero patterns

## Migration Strategy

### Approach: **Incremental Replacement**
Replace Firebase with Supabase file-by-file, testing as we go.

---

## Phase 1: Core Infrastructure (PRIORITY)

### 1.1 Auth System
**Files:**
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/signup/page.tsx`
- `src/app/layout.tsx` (remove FirebaseClientProvider)
- `src/hooks/withRole.tsx`

**Changes:**
```typescript
// OLD (Firebase)
import { auth } from '@/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

// NEW (Supabase)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
await supabase.auth.signInWithPassword({ email, password });
```

### 1.2 User State Management
**Files:**
- Create `src/hooks/use-user.ts` (Supabase version)
- Update `src/hooks/withRole.tsx`

**Implementation:**
```typescript
// src/hooks/use-user.ts
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
            setUser(data);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data } = await supabase.from('users').select('*')
            .eq('id', session.user.id).single();
          setUser(data);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return { user, loading };
}
```

---

## Phase 2: Data Layer Replacement

### 2.1 Classes (use-classes.ts, use-all-classes.ts)
**Pattern:**
```typescript
// OLD (Firestore)
const classesRef = collection(db, 'classes');
const q = query(classesRef, where('teacherId', '==', userId));
const snapshot = await getDocs(q);

// NEW (Supabase)
const { data: classes } = await supabase
  .from('classes')
  .select('*')
  .eq('teacher_id', userId);
```

### 2.2 Notes (use-notes.ts)
**Pattern:**
```typescript
// OLD
const notesRef = collection(db, 'notes');
const q = query(notesRef, where('topicId', '==', topicId));

// NEW
const { data: notes } = await supabase
  .from('notes')
  .select('*')
  .eq('topic_id', topicId);
```

### 2.3 Realtime Subscriptions
**Pattern:**
```typescript
// OLD (Firebase)
onSnapshot(docRef, (doc) => {
  setData(doc.data());
});

// NEW (Supabase)
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'classes' },
    (payload) => setData(payload.new)
  )
  .subscribe();

return () => supabase.removeChannel(channel);
```

---

## Phase 3: Component Updates

### Files to Update (52 total)
Organized by priority:

**HIGH PRIORITY** (Core functionality):
1. `src/app/(public)/login/page.tsx`
2. `src/app/(public)/signup/page.tsx`
3. `src/app/dashboard/page.tsx`
4. `src/hooks/use-classes.ts`
5. `src/hooks/use-notes.ts`
6. `src/hooks/use-all-classes.ts`
7. `src/hooks/withRole.tsx`

**MEDIUM PRIORITY** (Student features):
8. `src/app/dashboard/subjects/[subject]/[topic]/page.tsx`
9. `src/app/dashboard/subjects/[subject]/[topic]/notes/page.tsx`
10. `src/app/dashboard/subjects/[subject]/[topic]/flashcards/page.tsx`
11. `src/app/dashboard/classes/page.tsx`
12. `src/app/dashboard/classes/[classId]/page.tsx`
13. `src/app/dashboard/progress/page.tsx`
14. `src/app/dashboard/settings/page.tsx`

**MEDIUM PRIORITY** (Teacher features):
15. `src/app/teacher/dashboard/page.tsx`
16. `src/app/teacher/dashboard/classes/[classId]/page.tsx`
17. `src/app/teacher/dashboard/assessments/page.tsx`
18. `src/app/teacher/dashboard/notes/page.tsx`
19. `src/app/teacher/dashboard/flashcards/page.tsx`

**LOW PRIORITY** (Admin features):
20. `src/app/admin/dashboard/page.tsx`
21. `src/app/admin/dashboard/users/page.tsx`
22. `src/app/admin/dashboard/notes/page.tsx`
23. `src/app/admin/dashboard/quizzes/page.tsx`
24. `src/app/admin/dashboard/flashcards/page.tsx`
25. `src/app/admin/dashboard/analytics/page.tsx`

**COMPONENTS** (Shared):
26. `src/components/quiz-client.tsx`
27. `src/components/notification-bell.tsx`
28. `src/components/subjects-grid.tsx`
29. `src/components/teacher/create-class-modal.tsx`
30. `src/components/content-seeder.tsx`

---

## Phase 4: Database Setup

### Required Actions:
1. ✅ Supabase project created
2. ⏳ Run `docs/migration/DATABASE_SCHEMA.sql`
3. ⏳ Run `docs/migration/RLS_POLICIES.sql`
4. ⏳ Create storage buckets
5. ⏳ Seed sample data

### SQL to Run:
```bash
# In Supabase SQL Editor:
1. Copy contents of docs/migration/DATABASE_SCHEMA.sql
2. Execute
3. Copy contents of docs/migration/RLS_POLICIES.sql
4. Execute
```

---

## Phase 5: Testing & Cleanup

### Testing Checklist:
- [ ] Login/Signup works
- [ ] Dashboard loads
- [ ] Can view subjects/topics
- [ ] Can view notes
- [ ] Can take quizzes
- [ ] Teacher can create classes
- [ ] Teacher can create assessments
- [ ] Admin can manage content
- [ ] Realtime updates work
- [ ] Notifications work

### Cleanup:
- [ ] Remove Firebase dependencies from package.json
- [ ] Delete unused Firebase files
- [ ] Delete root `app/` directory (keep `src/app`)
- [ ] Update .gitignore
- [ ] Test production build

---

## Implementation Order

### Week 1: Core (Days 1-2)
1. ✅ Setup Supabase utilities
2. ⏳ Update login/signup pages
3. ⏳ Replace FirebaseClientProvider
4. ⏳ Create use-user hook
5. ⏳ Update withRole

### Week 1: Data Hooks (Days 3-4)
6. ⏳ Migrate use-classes.ts
7. ⏳ Migrate use-notes.ts
8. ⏳ Migrate use-all-classes.ts

### Week 1: Student Dashboard (Day 5)
9. ⏳ Update dashboard/page.tsx
10. ⏳ Update subjects pages
11. ⏳ Update notes pages

### Week 2: Teacher & Admin (Days 6-8)
12. ⏳ Update teacher dashboard
13. ⏳ Update admin dashboard
14. ⏳ Update shared components

### Week 2: Testing & Deploy (Days 9-10)
15. ⏳ Run full test suite
16. ⏳ Fix bugs
17. ⏳ Deploy to production

---

## Quick Reference: Common Patterns

### Auth
```typescript
// Sign In
const { error } = await supabase.auth.signInWithPassword({ email, password });

// Sign Up
const { data, error } = await supabase.auth.signUp({ email, password });

// Sign Out
await supabase.auth.signOut();

// Get User
const { data: { user } } = await supabase.auth.getUser();
```

### CRUD Operations
```typescript
// Create
const { data, error } = await supabase.from('table').insert({ ...data });

// Read
const { data, error } = await supabase.from('table').select('*').eq('id', id);

// Update
const { error } = await supabase.from('table').update({ ...data }).eq('id', id);

// Delete
const { error } = await supabase.from('table').delete().eq('id', id);
```

### Realtime
```typescript
const channel = supabase
  .channel('changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

---

## Next Steps

**IMMEDIATE:**
1. Run database migrations in Supabase
2. Start with login/signup pages
3. Test auth flow
4. Continue with data hooks

**Ready to start Phase 1!**
