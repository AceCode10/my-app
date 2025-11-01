# Subjects & Topics Implementation Plan

## 🎯 **Objective**
Implement fully functional subjects and topics system that works across the entire app for all users (guests, students, admins).

## 📋 **Current Status**

### **What Exists:**
- ✅ Admin subjects page (`/admin/subjects`)
- ✅ Public subjects page (`/subjects`)
- ✅ Student subjects page (`/student/subjects`)
- ✅ Database tables: `subjects`, `topics`
- ✅ SubjectsGrid component
- ✅ SubjectCard component

### **What's Broken:**
- ❌ "Create Subject" button doesn't open dialog (debugging added)
- ❌ SubjectsGrid loads from local JSON instead of Supabase
- ❌ No connection between admin-created subjects and public view

## 🔧 **Implementation Steps**

### **Step 1: Fix Admin "Create Subject" Dialog** ✅ (Debugging Added)
- Added console.log to track button clicks
- Added logging to SubjectDialog component
- User should check browser console to see what's happening

### **Step 2: Update SubjectsGrid to Load from Supabase**
- Modify `src/components/subjects-grid.tsx`
- Replace local JSON loading with Supabase query
- Add proper loading and error states
- Filter by status (only show 'published' subjects to public)

### **Step 3: Create Subject Detail Pages**
- Public: `/subjects/[slug]/page.tsx`
- Student: `/student/subjects/[slug]/page.tsx`
- Show topics under each subject
- Link to content (notes, questions, papers)

### **Step 4: Create Topic Detail Pages**
- Public: `/subjects/[slug]/[topicSlug]/page.tsx`
- Student: `/student/subjects/[slug]/[topicSlug]/page.tsx`
- Show content for each topic

### **Step 5: Add RLS Policies**
- Public can view published subjects/topics
- Students can view published + registered subjects/topics
- Admins can view/edit all

### **Step 6: Test Complete Flow**
- Admin creates subject
- Admin creates topics under subject
- Admin publishes subject
- Public/students can view subject
- Public/students can navigate to topics

## 📝 **Detailed Implementation**

### **Fix 1: SubjectsGrid Component**

**File:** `src/components/subjects-grid.tsx`

**Changes:**
```typescript
// Remove Firebase imports
// Remove local subjects import
// Add Supabase client
// Fetch subjects from database
// Filter by status based on user role
```

**New Logic:**
- Fetch from `subjects` table
- Order by `display_order`
- Filter by `status = 'published'` for public
- Show all for admins
- Handle loading and error states

### **Fix 2: Subject Detail Page**

**File:** `src/app/(public)/subjects/[slug]/page.tsx`

**Features:**
- Fetch subject by slug
- Show subject description
- List all topics under subject
- Link to topic pages
- Show stats (number of notes, questions, papers)

### **Fix 3: Topic Detail Page**

**File:** `src/app/(public)/subjects/[slug]/[topicSlug]/page.tsx`

**Features:**
- Fetch topic by slug
- Show topic description
- List content (notes, questions, papers)
- Filter by visibility (public/registered/premium)

## 🗄️ **Database Schema**

### **Subjects Table:**
```sql
subjects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    exam_board TEXT NOT NULL,
    icon_url TEXT,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

### **Topics Table:**
```sql
topics (
    id UUID PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(subject_id, slug)
)
```

## 🔐 **RLS Policies Needed**

### **Subjects:**
```sql
-- Public can view published subjects
CREATE POLICY "Public can view published subjects"
    ON subjects FOR SELECT
    USING (status = 'published');

-- Admins can manage all subjects
CREATE POLICY "Admins can manage subjects"
    ON subjects FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.is_admin = true OR users.role IN ('super_admin', 'content_moderator'))
        )
    );
```

### **Topics:**
```sql
-- Public can view published topics of published subjects
CREATE POLICY "Public can view published topics"
    ON topics FOR SELECT
    USING (
        status = 'published' 
        AND EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = topics.subject_id 
            AND subjects.status = 'published'
        )
    );

-- Admins can manage all topics
CREATE POLICY "Admins can manage topics"
    ON topics FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.is_admin = true OR users.role IN ('super_admin', 'content_moderator'))
        )
    );
```

## ✅ **Testing Checklist**

### **Admin Tests:**
- [ ] Click "Add Subject" button - dialog opens
- [ ] Fill in subject details
- [ ] Save subject - appears in list
- [ ] Edit subject
- [ ] Add topic to subject
- [ ] Edit topic
- [ ] Delete topic
- [ ] Delete subject
- [ ] Publish subject
- [ ] All actions logged in audit logs

### **Public Tests:**
- [ ] Visit `/subjects` - see published subjects
- [ ] Click subject - see subject detail page
- [ ] See topics under subject
- [ ] Click topic - see topic detail page
- [ ] Cannot see draft subjects
- [ ] Cannot see draft topics

### **Student Tests:**
- [ ] Same as public tests
- [ ] Can access registered content
- [ ] Premium users can access premium content

## 🚀 **Execution Order**

1. **First:** Fix SubjectsGrid to load from Supabase
2. **Second:** Add RLS policies
3. **Third:** Test admin create subject flow
4. **Fourth:** Create subject detail pages
5. **Fifth:** Create topic detail pages
6. **Sixth:** End-to-end testing

## 📊 **Success Criteria**

✅ Admin can create subjects and topics
✅ Admin can publish subjects
✅ Public can view published subjects
✅ Public can navigate subject → topics → content
✅ All actions are audited
✅ RLS policies enforce proper access
✅ No errors in console
✅ Smooth user experience

## 🎯 **Next Steps**

1. Check browser console for "Create Subject" button logs
2. Implement SubjectsGrid Supabase integration
3. Add RLS policies
4. Test complete flow
5. Create subject/topic detail pages

---

**Current Focus:** Debugging "Create Subject" button and updating SubjectsGrid to use Supabase.
