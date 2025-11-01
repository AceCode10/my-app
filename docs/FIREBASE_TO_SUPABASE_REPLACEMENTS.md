# Firebase to Supabase Migration - Quick Reference

## Import Replacements

### Before (Firebase):
```typescript
import { useUser, useAuth, useFirestore } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
```

### After (Supabase):
```typescript
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
```

## Code Pattern Replacements

### 1. Authentication
**Before:**
```typescript
const auth = useAuth();
await auth.signOut();
```

**After:**
```typescript
const supabase = createClient();
await supabase.auth.signOut();
```

### 2. User Data
**Before:**
```typescript
const { user, profile, isSubscribed } = useUser();
const username = profile?.displayName || user?.displayName;
```

**After:**
```typescript
const { user, loading } = useUser();
const username = user?.display_name || user?.email;
const isSubscribed = user?.subscription_tier === 'pro' || user?.subscription_tier === 'essential';
```

### 3. Firestore Queries
**Before:**
```typescript
const firestore = useFirestore();
const q = query(collection(firestore, 'notes'), where('authorId', '==', userId));
const snapshot = await getDocs(q);
const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**After:**
```typescript
const supabase = createClient();
const { data, error } = await supabase
  .from('notes')
  .select('*')
  .eq('author_id', userId);
```

### 4. Document References
**Before:**
```typescript
const docRef = doc(firestore, 'users', userId);
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
  const data = docSnap.data();
}
```

**After:**
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### 5. Insert/Update
**Before:**
```typescript
await setDoc(doc(firestore, 'notes', noteId), {
  title: 'New Note',
  content: 'Content',
  createdAt: serverTimestamp()
});
```

**After:**
```typescript
const { error } = await supabase
  .from('notes')
  .insert({
    title: 'New Note',
    content: 'Content',
    created_at: new Date().toISOString()
  });
```

## Field Name Changes (snake_case)

| Firebase (camelCase) | Supabase (snake_case) |
|---------------------|----------------------|
| `displayName` | `display_name` |
| `photoURL` | `avatar_url` |
| `authorId` | `author_id` |
| `subjectId` | `subject_id` |
| `topicId` | `topic_id` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `teacherId` | `teacher_id` |
| `studentIds` | (use enrollments table) |

## Files Migrated ✅
- [x] src/app/layout.tsx
- [x] src/app/(public)/login/page.tsx
- [x] src/app/(public)/signup/page.tsx
- [x] src/app/dashboard/layout.tsx
- [x] src/hooks/use-user.ts
- [x] src/hooks/use-classes.ts
- [x] src/hooks/use-notes.ts
- [x] src/hooks/use-all-classes.ts

## Files Remaining (37 files)
See grep output for full list of files still using Firebase imports.
