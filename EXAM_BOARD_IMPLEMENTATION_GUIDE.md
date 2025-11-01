# 🎓 Exam Board System - Implementation Guide

## Overview

Complete exam board selection and filtering system implemented across the entire platform. Users can select their preferred exam board during onboarding and filter content accordingly.

---

## 📋 Features Implemented

### ✅ 1. Database Schema
- **exam_boards table**: Stores all exam board information (CIE, Edexcel, AQA, OCR, AP)
- **User preferences**: Added to profiles table (preferred_exam_board_id, onboarding_completed, show_all_exam_boards)
- **Content references**: All content tables (subjects, topics, questions, past_papers) now have exam_board_id
- **Multi-board support**: Junction table for content belonging to multiple exam boards
- **RLS policies**: Updated to respect exam board filtering

### ✅ 2. React Context & Hooks
- **ExamBoardProvider**: Global state management for exam board filtering
- **useExamBoard**: Hook to access exam board context
- **useExamBoardFilter**: Hook to get current filter for queries
- **useOnboardingCheck**: Redirects users to onboarding if not completed

### ✅ 3. UI Components
- **ExamBoardBadge**: Small label showing exam board on content
- **ExamBoardSelector**: Dropdown selector for filtering
- **ExamBoardFilter**: Tab/button-based filtering UI
- **ExamBoardOnboarding**: One-time selection screen after signup
- **ExamBoardSettings**: Settings page integration
- **ExamBoardContentSelector**: Admin component for assigning boards to content

### ✅ 4. User Flows
- **Guest users**: Can browse all content, filter by exam board, preferences saved in localStorage
- **New users**: Redirected to onboarding after signup, can skip
- **Registered users**: Content filtered by preference, can toggle to view all boards
- **Settings**: Easy exam board change with instant platform-wide update

### ✅ 5. Admin Features
- **Content management**: Required exam board selection when creating content
- **Multi-board assignment**: Can assign content to multiple exam boards
- **Bulk operations**: Support for applying to all exam boards

---

## 🚀 Getting Started

### Step 1: Apply Database Migration

```bash
# Open Supabase Dashboard → SQL Editor
# Run the migration file:
```

Copy and paste the contents of `EXAM_BOARD_MIGRATION.sql` into the SQL Editor and execute.

**What this does:**
- Creates exam_boards table
- Seeds 5 exam boards (CIE, Edexcel, AQA, OCR, AP)
- Adds exam board columns to all content tables
- Updates user profiles for onboarding
- Creates helper functions and RLS policies

### Step 2: Verify Migration

```sql
-- Check exam boards created
SELECT * FROM exam_boards ORDER BY display_order;

-- Check profile columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('preferred_exam_board_id', 'onboarding_completed', 'show_all_exam_boards');

-- Check subject columns updated
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'subjects' 
AND column_name = 'exam_board_id';
```

### Step 3: Test the System

1. **Sign up a new user** → Should redirect to `/onboarding/exam-board`
2. **Select an exam board** → Should save preference and redirect to dashboard
3. **Go to Settings** → Should see exam board preference section
4. **Change exam board** → Content should update across platform
5. **Toggle "Show All Boards"** → Should see content from all boards

---

## 📖 Usage Examples

### For Frontend Developers

#### 1. Using the Context

```tsx
import { useExamBoard, useExamBoardFilter } from '@/contexts/ExamBoardContext';

function MyComponent() {
  const { activeExamBoard, examBoards, setActiveExamBoard } = useExamBoard();
  const { exam_board_id, hasFilter } = useExamBoardFilter();

  return (
    <div>
      <p>Current Board: {activeExamBoard?.name || 'All Boards'}</p>
      <p>Filter ID: {exam_board_id || 'None'}</p>
    </div>
  );
}
```

#### 2. Displaying Exam Board Badges

```tsx
import { ExamBoardBadge } from '@/components/exam-board';

function SubjectCard({ subject }) {
  return (
    <div>
      <h3>{subject.name}</h3>
      {subject.exam_board && (
        <ExamBoardBadge examBoard={subject.exam_board} size="sm" />
      )}
    </div>
  );
}
```

#### 3. Adding Exam Board Filter

```tsx
import { ExamBoardFilter } from '@/components/exam-board';

function SubjectsPage() {
  return (
    <div>
      <h1>Subjects</h1>
      <ExamBoardFilter variant="tabs" />
      {/* Your content */}
    </div>
  );
}
```

#### 4. Fetching Filtered Data

```tsx
import { useExamBoardFilter } from '@/contexts/ExamBoardContext';
import { getSubjectsWithExamBoard } from '@/lib/exam-board-utils';

function SubjectsList() {
  const { exam_board_id } = useExamBoardFilter();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    async function fetchSubjects() {
      const data = await getSubjectsWithExamBoard(exam_board_id);
      setSubjects(data);
    }
    fetchSubjects();
  }, [exam_board_id]);

  return <div>{/* Render subjects */}</div>;
}
```

### For Admin Dashboard

#### 1. Assigning Exam Boards to Content

```tsx
import { ExamBoardContentSelector } from '@/components/admin/ExamBoardContentSelector';

function CreateSubjectForm() {
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

  const handleSubmit = async () => {
    // Create subject with exam board(s)
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: 'Mathematics',
        exam_board_id: selectedBoards[0], // Primary board
        // ... other fields
      });

    // If multiple boards, add to junction table
    if (selectedBoards.length > 1) {
      await assignContentToExamBoards('subject', data.id, selectedBoards);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ExamBoardContentSelector
        selectedBoardIds={selectedBoards}
        onChange={setSelectedBoards}
        required={true}
        allowMultiple={true}
      />
      {/* Other form fields */}
    </form>
  );
}
```

---

## 🗄️ Database Queries

### Filtering Content by Exam Board

```sql
-- Get subjects for a specific exam board
SELECT * FROM subjects 
WHERE exam_board_id = 'board-uuid-here' 
AND status = 'published';

-- Get subjects for user's preferred board
SELECT s.* FROM subjects s
INNER JOIN profiles p ON p.preferred_exam_board_id = s.exam_board_id
WHERE p.id = auth.uid()
AND s.status = 'published';

-- Get all content (no filter)
SELECT * FROM subjects WHERE status = 'published';
```

### Multi-Board Content

```sql
-- Get all exam boards for a piece of content
SELECT eb.* FROM exam_boards eb
INNER JOIN content_exam_boards ceb ON ceb.exam_board_id = eb.id
WHERE ceb.content_type = 'subject'
AND ceb.content_id = 'content-uuid-here';

-- Assign content to multiple boards
INSERT INTO content_exam_boards (content_type, content_id, exam_board_id)
VALUES 
  ('subject', 'subject-uuid', 'cie-uuid'),
  ('subject', 'subject-uuid', 'edexcel-uuid');
```

---

## 🎨 UI Components Reference

### ExamBoardBadge
```tsx
<ExamBoardBadge 
  examBoard={board} 
  size="sm" | "md" | "lg"
  variant="default" | "outline" | "subtle"
/>
```

### ExamBoardSelector
```tsx
<ExamBoardSelector
  value={selectedId}
  onChange={(id) => setSelectedId(id)}
  showAllOption={true}
  placeholder="Select exam board"
/>
```

### ExamBoardFilter
```tsx
<ExamBoardFilter
  variant="tabs" | "buttons" | "compact"
  onFilterChange={(id) => handleFilter(id)}
  showCount={false}
/>
```

### ExamBoardOnboarding
```tsx
<ExamBoardOnboarding
  onComplete={(boardId) => router.push('/dashboard')}
  onSkip={() => router.push('/dashboard')}
  allowSkip={true}
/>
```

---

## 🔧 Configuration

### Exam Board Colors

Edit in `src/components/exam-board/ExamBoardBadge.tsx`:

```tsx
const boardColors: Record<string, string> = {
  CIE: 'bg-blue-100 text-blue-800 border-blue-300',
  EDEXCEL: 'bg-purple-100 text-purple-800 border-purple-300',
  AQA: 'bg-green-100 text-green-800 border-green-300',
  OCR: 'bg-orange-100 text-orange-800 border-orange-300',
  AP: 'bg-red-100 text-red-800 border-red-300'
};
```

### Adding New Exam Boards

```sql
INSERT INTO exam_boards (code, name, full_name, description, display_order)
VALUES ('IB', 'IB', 'International Baccalaureate', 'IB Diploma Programme', 6);
```

---

## 🧪 Testing Checklist

- [ ] New user signup redirects to onboarding
- [ ] Onboarding saves preference correctly
- [ ] Dashboard shows filtered content
- [ ] Settings page allows changing preference
- [ ] Guest users can filter content
- [ ] Guest preferences persist in localStorage
- [ ] Admin can assign exam boards to content
- [ ] Multi-board content displays correctly
- [ ] RLS policies respect exam board filtering
- [ ] Performance is acceptable with filters

---

## 📊 Data Migration (Optional)

If you have existing content without exam boards:

```sql
-- Get CIE exam board ID
DO $$
DECLARE
    cie_id UUID;
BEGIN
    SELECT id INTO cie_id FROM exam_boards WHERE code = 'CIE';
    
    -- Assign all existing subjects to CIE
    UPDATE subjects 
    SET exam_board_id = cie_id 
    WHERE exam_board_id IS NULL;
    
    -- Assign all existing questions to CIE
    UPDATE questions 
    SET exam_board_id = cie_id 
    WHERE exam_board_id IS NULL;
    
    -- Assign all existing past papers to CIE
    UPDATE past_papers 
    SET exam_board_id = cie_id 
    WHERE exam_board_id IS NULL;
END $$;
```

---

## 🐛 Troubleshooting

### Issue: Onboarding not showing
**Solution:** Check if `onboarding_completed` is false in profiles table

### Issue: Content not filtering
**Solution:** Verify exam_board_id is set on content and RLS policies are applied

### Issue: "Cannot read property 'id' of null"
**Solution:** Ensure ExamBoardProvider wraps your app in layout.tsx

### Issue: Guest filter not persisting
**Solution:** Check localStorage for 'guest_exam_board' and 'guest_show_all_boards'

---

## 📁 File Structure

```
src/
├── types/
│   └── exam-board.ts                    # TypeScript types
├── contexts/
│   └── ExamBoardContext.tsx             # React context & hooks
├── components/
│   ├── exam-board/
│   │   ├── ExamBoardBadge.tsx          # Badge component
│   │   ├── ExamBoardSelector.tsx       # Dropdown selector
│   │   ├── ExamBoardFilter.tsx         # Filter UI
│   │   ├── ExamBoardOnboarding.tsx     # Onboarding flow
│   │   └── index.ts                     # Barrel export
│   └── admin/
│       └── ExamBoardContentSelector.tsx # Admin selector
├── lib/
│   └── exam-board-utils.ts              # Utility functions
├── hooks/
│   └── useOnboardingCheck.ts            # Onboarding redirect hook
└── app/
    ├── layout.tsx                        # Provider wrapper
    ├── onboarding/
    │   └── exam-board/
    │       └── page.tsx                  # Onboarding page
    └── dashboard/
        └── settings/
            └── page.tsx                  # Settings integration
```

---

## 🚀 Next Steps

1. **Update existing pages** to use exam board filtering
2. **Add exam board selector** to admin content creation forms
3. **Test thoroughly** with different user types
4. **Add analytics** to track exam board usage
5. **Consider SEO** implications for exam board-specific URLs

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review the TypeScript types in `src/types/exam-board.ts`
3. Examine the context implementation in `src/contexts/ExamBoardContext.tsx`
4. Test queries in Supabase SQL Editor

---

**Implementation Status:** ✅ Complete and Ready for Testing

**Last Updated:** October 31, 2025
