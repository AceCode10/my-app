# Firebase to Supabase Migration Strategy

## Overview
The existing codebase in `src/` has a complete implementation with Firebase. We need to:
1. **Preserve** all UI/UX (green theme, Inter font, gradient text, hero patterns)
2. **Replace** Firebase with Supabase
3. **Merge** with the new Supabase utilities created in root `app/`, `lib/`, `types/`

## Current Structure

### Existing (src/)
- ✅ Complete UI with green theme
- ✅ Inter font
- ✅ Gradient text & hero patterns  
- ✅ Public pages: landing, login, signup, subjects
- ✅ Dashboard: student, teacher, admin
- ❌ Uses Firebase (needs replacement)

### New (root app/, lib/, types/)
- ✅ Supabase client utilities
- ✅ Auth helpers (get-user, require-auth)
- ✅ Complete TypeScript types
- ✅ Auth actions (signup, signin, signout)
- ❌ Different UI (needs to be discarded)

## Migration Plan

### Phase 1: Setup Supabase Infrastructure in src/
1. Copy Supabase utilities to `src/lib/supabase/`
2. Copy auth helpers to `src/lib/auth/`
3. Copy types to `src/types/`
4. Update imports throughout `src/`

### Phase 2: Replace Firebase Auth
Files to update:
- `src/app/(public)/login/page.tsx` - Replace Firebase auth
- `src/app/(public)/signup/page.tsx` - Replace Firebase auth
- `src/app/layout.tsx` - Replace FirebaseClientProvider
- `src/hooks/withRole.tsx` - Replace Firebase auth checks

### Phase 3: Replace Firestore with Supabase
Files with Firestore usage (152 matches across 52 files):
- All dashboard pages
- All admin pages
- All teacher pages
- Hooks: use-classes.ts, use-notes.ts, use-all-classes.ts
- Components: quiz-client.tsx, notification-bell.tsx, etc.

### Phase 4: Clean Up
1. Delete root `app/` directory (keep src/app)
2. Delete Firebase dependencies
3. Test all features
4. Deploy

## Key Principles

1. **UI First** - Keep all existing UI components and styling
2. **Data Layer Only** - Only replace data fetching/mutations
3. **Incremental** - Test each section before moving to next
4. **Type Safety** - Use the TypeScript types we created

## Next Steps

Starting with Phase 1...
