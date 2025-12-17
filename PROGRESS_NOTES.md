# IGCSE Simplified - Progress Notes

## Session: 2025-12-17

### Completed Tasks

#### 1. Alphabetic Filter for Subjects
- **File**: `src/components/subjects-grid.tsx`
- Added A-Z letter buttons to filter subjects by first letter
- Letters without subjects are grayed out/disabled
- Selection persisted to localStorage (key: `subjects-alpha-filter`)
- Default: Letter "A" on first visit

#### 2. Bulk Import - Subjects (Fixed)
- **File**: `src/app/(dashboard)/admin/subjects/page.tsx`
- One-at-a-time insertion with 10s timeout
- Slug pattern: `{name}-{level}` (e.g., `physics-igcse`, `physics-as`)
- Level auto-lowercased to match DB constraint
- Handles duplicate errors gracefully

#### 3. Bulk Import - Topics
- **File**: `src/app/(dashboard)/admin/subjects/page.tsx`
- Slug pattern: `{name}-{subject-slug}` for uniqueness across subjects
- Requires subject selection before import

#### 4. Bulk Import - Questions (Improved)
- **File**: `src/app/(dashboard)/admin/topical-questions/page.tsx`
- One-at-a-time insertion with timeout
- Download template button added
- Shows topic name in dialog
- Better error reporting (shows first 3 errors)

#### 5. RLS Fixes
- Fixed infinite recursion in `classes` table RLS
- Created `FIX_CLASSES_RLS.sql`, `FIX_SUBJECTS_RLS.sql`
- User disabled RLS on subjects table manually

### Known Issues

1. **Duplicate code constraint**: `subjects_code_key` prevents same code across levels
   - Solution: `ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key;`

2. **RLS on questions**: May need verification if inserts fail

### JSON Templates

**Subjects:**
```json
[{"name": "Physics", "code": "0625", "exam_board": "Cambridge", "level": "igcse"}]
```

**Topics:**
```json
[{"name": "Algebra", "description": "Basic algebra"}]
```

**Questions:**
```json
[{"question": "What is 2+2?", "type": "short_answer", "difficulty": "easy", "marks": 2, "answer": "4"}]
```

### Next Steps
- Test bulk import end-to-end
- Verify questions display on public page
- Add question count updates after import
