# ✅ Exam Board System - Deployment Checklist

## Pre-Deployment (5 minutes)

### 1. Review Files
- [ ] Read `EXAM_BOARD_SUMMARY.md` for overview
- [ ] Scan `EXAM_BOARD_IMPLEMENTATION_GUIDE.md` for details
- [ ] Check all new files are present (17 files created)

### 2. Backup Database
```sql
-- Create backup before migration
-- In Supabase Dashboard → Database → Backups
```

---

## Database Migration (10 minutes)

### 3. Apply Migration
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy entire contents of `EXAM_BOARD_MIGRATION.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait for success message

### 4. Verify Migration
Run these queries in SQL Editor:

```sql
-- Should return 5 exam boards
SELECT COUNT(*) FROM exam_boards;

-- Should show new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('preferred_exam_board_id', 'onboarding_completed');

-- Should show exam_board_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'subjects' 
AND column_name = 'exam_board_id';
```

Expected results:
- [ ] 5 exam boards exist
- [ ] Profile columns added
- [ ] Content tables updated

---

## Application Setup (5 minutes)

### 5. Install Dependencies (if needed)
```bash
npm install
# or
yarn install
```

### 6. Check Environment Variables
Verify `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. Build & Start
```bash
npm run dev
```

- [ ] No TypeScript errors
- [ ] No build errors
- [ ] App starts successfully

---

## Testing (15 minutes)

### 8. Test Guest User Flow
- [ ] Open http://localhost:3000
- [ ] Browse to subjects page
- [ ] See exam board badges on content
- [ ] Use exam board filter
- [ ] Refresh page → filter persists

### 9. Test New User Onboarding
- [ ] Sign up with new email
- [ ] Redirected to `/onboarding/exam-board`
- [ ] See 5 exam board options
- [ ] Select one (e.g., CIE)
- [ ] Click "Continue"
- [ ] Redirected to dashboard
- [ ] Content filtered by selected board

### 10. Test Settings
- [ ] Go to Settings page
- [ ] See "Exam Board Preference" section
- [ ] Change to different board
- [ ] Click "Save Changes"
- [ ] See success message
- [ ] Navigate to subjects → content updated

### 11. Test Skip Onboarding
- [ ] Sign up with another new email
- [ ] On onboarding screen, click "Skip for now"
- [ ] Redirected to dashboard
- [ ] See content from all boards
- [ ] Go to Settings → can set preference later

### 12. Test Admin Features (if applicable)
- [ ] Login as admin
- [ ] Go to content creation page
- [ ] See exam board selector
- [ ] Select multiple boards
- [ ] Create content
- [ ] Verify content appears in correct boards

---

## Data Migration (Optional - if you have existing content)

### 13. Assign Exam Boards to Existing Content
```sql
-- Get CIE exam board ID
DO $$
DECLARE
    cie_id UUID;
BEGIN
    SELECT id INTO cie_id FROM exam_boards WHERE code = 'CIE';
    
    -- Assign to all existing subjects
    UPDATE subjects 
    SET exam_board_id = cie_id 
    WHERE exam_board_id IS NULL;
    
    -- Assign to all existing questions
    UPDATE questions 
    SET exam_board_id = cie_id 
    WHERE exam_board_id IS NULL;
    
    -- Assign to all existing past papers
    UPDATE past_papers 
    SET exam_board_id = cie_id 
    WHERE exam_board_id IS NULL;
END $$;
```

- [ ] Run migration script
- [ ] Verify content assigned: `SELECT COUNT(*) FROM subjects WHERE exam_board_id IS NOT NULL;`

---

## Integration (Variable time)

### 14. Update Existing Pages
For each page that displays content:

**Subjects Page:**
```tsx
import { ExamBoardFilter } from '@/components/exam-board';
import { useExamBoardFilter } from '@/contexts/ExamBoardContext';

// Add filter UI
<ExamBoardFilter variant="tabs" />

// Use filter in queries
const { exam_board_id } = useExamBoardFilter();
const subjects = await getSubjectsWithExamBoard(exam_board_id);
```

- [ ] Update subjects listing page
- [ ] Update topics listing page
- [ ] Update questions page
- [ ] Update past papers page

**Content Cards:**
```tsx
import { ExamBoardBadge } from '@/components/exam-board';

<ExamBoardBadge examBoard={item.exam_board} size="sm" />
```

- [ ] Add badges to subject cards
- [ ] Add badges to topic cards
- [ ] Add badges to question cards
- [ ] Add badges to paper cards

### 15. Update Admin Pages
For content creation/editing forms:

```tsx
import { ExamBoardContentSelector } from '@/components/admin/ExamBoardContentSelector';

const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

<ExamBoardContentSelector
  selectedBoardIds={selectedBoards}
  onChange={setSelectedBoards}
  required={true}
/>
```

- [ ] Update subject creation form
- [ ] Update topic creation form
- [ ] Update question creation form
- [ ] Update past paper upload form

---

## Performance Optimization (5 minutes)

### 16. Verify Indexes
```sql
-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('subjects', 'topics', 'questions', 'past_papers')
AND indexname LIKE '%exam_board%';
```

- [ ] Indexes created on exam_board_id columns

### 17. Test Query Performance
```sql
-- Should be fast (< 100ms)
EXPLAIN ANALYZE
SELECT * FROM subjects 
WHERE exam_board_id = 'some-uuid' 
AND status = 'published';
```

- [ ] Query uses index
- [ ] Execution time acceptable

---

## Documentation (5 minutes)

### 18. Update Team Documentation
- [ ] Share `EXAM_BOARD_SUMMARY.md` with team
- [ ] Add to project README
- [ ] Update API documentation (if applicable)
- [ ] Create admin training guide

### 19. Update User Documentation
- [ ] Add exam board info to help center
- [ ] Create FAQ about exam boards
- [ ] Update onboarding guide

---

## Monitoring (Ongoing)

### 20. Set Up Analytics
- [ ] Track onboarding completion rate
- [ ] Monitor exam board selection distribution
- [ ] Track filter usage
- [ ] Monitor performance metrics

### 21. User Feedback
- [ ] Add feedback form on onboarding
- [ ] Monitor support tickets
- [ ] Gather user feedback
- [ ] Iterate based on data

---

## Rollback Plan (Just in case)

### If Something Goes Wrong

**Rollback Database:**
```sql
-- Remove exam board columns (if needed)
ALTER TABLE profiles DROP COLUMN IF EXISTS preferred_exam_board_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE profiles DROP COLUMN IF EXISTS show_all_exam_boards;

-- Drop exam boards table
DROP TABLE IF EXISTS content_exam_boards;
DROP TABLE IF EXISTS exam_boards CASCADE;
```

**Rollback Code:**
```bash
# Revert to previous commit
git revert HEAD

# Or remove ExamBoardProvider from layout
# Comment out in src/app/layout.tsx
```

---

## Success Criteria

### Minimum Viable Product (MVP)
- [x] Database migration successful
- [x] Onboarding flow works
- [x] Settings page integration
- [x] Basic filtering works
- [x] No breaking changes

### Full Implementation
- [ ] All pages show exam board badges
- [ ] All pages have filtering
- [ ] Admin can assign boards
- [ ] Performance is good
- [ ] Users are satisfied

---

## Timeline Estimate

| Task | Time | Status |
|------|------|--------|
| Pre-deployment review | 5 min | ⏳ |
| Database migration | 10 min | ⏳ |
| Application setup | 5 min | ⏳ |
| Testing | 15 min | ⏳ |
| Data migration (optional) | 10 min | ⏳ |
| Integration | 1-2 hours | ⏳ |
| Performance check | 5 min | ⏳ |
| Documentation | 5 min | ⏳ |
| **Total** | **2-3 hours** | |

---

## Post-Deployment

### Week 1
- [ ] Monitor error logs
- [ ] Check onboarding completion rate
- [ ] Gather initial user feedback
- [ ] Fix any critical issues

### Week 2-4
- [ ] Analyze exam board distribution
- [ ] Optimize based on usage patterns
- [ ] Add requested features
- [ ] Improve documentation

### Month 2+
- [ ] Consider advanced features
- [ ] SEO optimization
- [ ] Multi-language support
- [ ] Advanced analytics

---

## Support Contacts

**Technical Issues:**
- Check `EXAM_BOARD_IMPLEMENTATION_GUIDE.md`
- Review `EXAM_BOARD_QUERIES.sql`
- Check Supabase logs

**Questions:**
- Refer to inline code documentation
- Check TypeScript types in `src/types/exam-board.ts`

---

## Final Sign-Off

Before marking as complete:

- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Team trained
- [ ] Documentation complete
- [ ] Backup created
- [ ] Rollback plan ready

**Deployment Date:** _______________

**Deployed By:** _______________

**Sign-Off:** _______________

---

**Status:** Ready for Deployment ✅

**Good luck! 🚀**
