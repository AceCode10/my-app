# Notes Feature - Quick Start Guide

## 🚀 Getting Started

### Step 1: Apply Database Migration

Run one of these commands in your terminal:

```bash
# Option 1: Direct SQL execution in Supabase Dashboard
# Copy contents of: supabase/migrations/20241221_notes_sections_system.sql
# Paste into SQL Editor and execute

# Option 2: Using Supabase CLI (if configured)
cd my-app
npx supabase db push

# Option 3: Using the migration script
npm run apply-notes-migration
```

### Step 2: Verify Installation

Check your Supabase dashboard for these tables:
- ✅ `notes` (with new columns)
- ✅ `note_sections`
- ✅ `note_progress`
- ✅ `note_bookmarks`

### Step 3: Create Your First Note

1. Login as admin
2. Go to `/admin/notes`
3. Click "Create Note"
4. Fill in the form:
   ```
   Title: Introduction to Algebra
   Subtitle: Basic concepts and operations
   Subject: Mathematics
   Topic: Algebra Basics
   Content: Write your Markdown content here...
   ```
5. Click "Save Draft" or "Publish"

### Step 4: Add Sections (Optional)

1. After creating a note, click "Manage Sections"
2. Add sections for better organization:
   ```
   Section 1: Variables and Constants
   Section 2: Basic Operations
   Section 3: Solving Equations
   ```
3. Add content to each section
4. Reorder as needed

## 📝 Writing Content

### Markdown Basics

```markdown
# Main Heading
## Sub Heading
### Section Heading

**Bold text**
*Italic text*
`Code inline`

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

[Link text](https://example.com)
![Image alt](image-url.jpg)
```

### LaTeX Math

```markdown
Inline math: $E = mc^2$

Block math:
$$
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Aligned equations:
$$
\begin{align}
x + y &= 5 \\
2x - y &= 1
\end{align}
$$
```

### Code Blocks

````markdown
```python
def hello_world():
    print("Hello, World!")
```

```javascript
const greeting = "Hello, World!";
console.log(greeting);
```
````

### Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

## 👨‍🎓 Student Usage

### Finding Notes

1. **From Dashboard**: Click "Revision Notes" in sidebar
2. **From Subject**: Navigate to subject → topic → "View Notes"
3. **From Quiz**: Click "View Revision Notes" when you get a question wrong
4. **Search**: Press `Ctrl+K` (Windows) or `Cmd+K` (Mac) for global search

### Reading Notes

- **Navigate sections**: Use sidebar on desktop, dropdown on mobile
- **Track progress**: Progress saves automatically as you read
- **Bookmark**: Click star icon to save for later
- **Export PDF**: Click "Download PDF" button
- **Share**: Click "Share" to copy link

### Managing Your Notes

**Filter by:**
- All Notes
- In Progress
- Completed
- Bookmarked

**Sort by:**
- Recently Updated
- Most Viewed
- Alphabetical

## 👨‍💼 Admin Usage

### Managing Notes

**List View** (`/admin/notes`)
- Search by title/subtitle
- Filter by subject, visibility, exam board
- Sort by various criteria
- Bulk actions available

**Actions:**
- ✏️ Edit - Modify note content
- 📋 Duplicate - Create a copy
- 🌐 Publish/Unpublish - Toggle visibility
- 🗑️ Delete - Remove note (with confirmation)
- 📊 Sections - Manage note sections

### Best Practices

1. **Use Clear Titles**: Make them descriptive and searchable
2. **Add Subtitles**: Provide context about the content
3. **Organize with Sections**: Break long content into digestible chunks
4. **Set Correct Visibility**: Draft → Review → Publish
5. **Tag Appropriately**: Use relevant tags for better discovery
6. **Enable Downloads**: Allow PDF export for offline study
7. **Estimate Read Time**: Helps students plan their study sessions

### Content Guidelines

**Do:**
- ✅ Use clear, simple language
- ✅ Include examples and diagrams
- ✅ Break complex topics into sections
- ✅ Add practice questions at the end
- ✅ Link to related quizzes
- ✅ Use consistent formatting

**Don't:**
- ❌ Copy content without permission
- ❌ Use overly technical jargon
- ❌ Create walls of text
- ❌ Forget to proofread
- ❌ Ignore accessibility

## 🔧 Common Tasks

### Update Note Content

```typescript
// In admin note editor
1. Navigate to /admin/notes/[id]
2. Edit the Markdown content
3. Preview changes
4. Click "Save Changes"
```

### Reorder Sections

```typescript
// In sections manager
1. Go to /admin/notes/[id]/sections
2. Drag sections using the handle icon
3. Changes save automatically
```

### Change Visibility

```typescript
// Quick toggle from list
1. In /admin/notes
2. Click three dots menu
3. Select "Publish" or "Unpublish"
```

### Duplicate Note

```typescript
// Create a copy
1. In /admin/notes
2. Click three dots menu
3. Select "Duplicate"
4. Edit the duplicated note
```

## 🎨 Customization

### Styling Notes

Use custom CSS classes in Markdown:

```markdown
<div class="worked-example">

### Example 1
Solve for x: 2x + 5 = 15

**Solution:**
2x = 10
x = 5

</div>

<div class="exam-tip">

### Exam Tip
Always show your working!

</div>
```

### Adding Images

```markdown
![Diagram description](https://your-cdn.com/image.png)

<!-- Or use Supabase Storage -->
![Diagram](https://your-project.supabase.co/storage/v1/object/public/notes/diagram.png)
```

## 📊 Analytics

### Track Performance

**Admin Dashboard** (`/admin/analytics`)
- Most viewed notes
- Completion rates
- Average time spent
- Popular topics
- Search trends

**Student Dashboard** (`/student/notes`)
- Personal progress
- Time spent reading
- Completion percentage
- Bookmarked notes

## 🐛 Troubleshooting

### LaTeX Not Rendering
**Problem**: Math equations show as plain text
**Solution**: 
1. Check KaTeX CSS is imported in `globals.css`
2. Verify LaTeX syntax is correct
3. Set `has_latex` flag to true

### Search Not Working
**Problem**: No results when searching
**Solution**:
1. Verify `search_vector` column exists
2. Check RLS policies allow search
3. Try simpler search terms
4. Check database logs

### Progress Not Saving
**Problem**: Reading progress doesn't persist
**Solution**:
1. Ensure user is logged in
2. Check browser console for errors
3. Verify `note_progress` table permissions
4. Clear browser cache and retry

### PDF Export Fails
**Problem**: PDF download doesn't work
**Solution**:
1. Check browser compatibility (use modern browser)
2. Verify jsPDF and html2canvas are installed
3. Try with simpler content first
4. Check browser console for errors

## 🔐 Access Control

### Visibility Levels

| Level | Who Can Access | Use Case |
|-------|---------------|----------|
| **Draft** | Admins only | Work in progress |
| **Public** | Everyone | Free content |
| **Registered** | Logged-in users | Basic members |
| **Premium** | Paid subscribers | Premium content |

### Setting Visibility

```typescript
// In note editor
1. Select visibility level from dropdown
2. Draft = Not visible to students
3. Public = Visible to all
4. Registered = Login required
5. Premium = Subscription required
```

## 📱 Mobile Experience

### Optimized Features

- ✅ Responsive layouts
- ✅ Touch-friendly navigation
- ✅ Collapsible sidebars
- ✅ Mobile section selector
- ✅ Swipe gestures (coming soon)
- ✅ Offline reading (coming soon)

### Mobile Tips

1. Use section dropdown for easy navigation
2. Bookmark notes for quick access
3. Export PDFs for offline reading
4. Use search for quick discovery

## 🎯 Tips for Success

### For Students
1. **Set Goals**: Aim to complete 2-3 notes per week
2. **Take Breaks**: Use sections to pace your reading
3. **Review Regularly**: Revisit completed notes
4. **Use Bookmarks**: Save important notes
5. **Link to Practice**: Do quizzes after reading

### For Teachers
1. **Plan Content**: Map notes to curriculum
2. **Update Regularly**: Keep content current
3. **Monitor Engagement**: Check analytics
4. **Respond to Feedback**: Improve based on usage
5. **Create Series**: Link related notes

### For Admins
1. **Maintain Quality**: Review before publishing
2. **Organize Well**: Use consistent structure
3. **Enable Features**: Allow downloads, bookmarks
4. **Track Metrics**: Monitor performance
5. **Iterate**: Continuously improve

## 📞 Support

Need help?
1. Check the full documentation: `docs/NOTES_IMPLEMENTATION_GUIDE.md`
2. Review optimization checklist: `docs/NOTES_OPTIMIZATION_CHECKLIST.md`
3. Check code comments in implementation files
4. Review Supabase logs for errors
5. Test in development before production

---

**Quick Links:**
- Admin Notes: `/admin/notes`
- Student Notes: `/student/notes`
- Create Note: `/admin/notes/new`
- Documentation: `/docs/NOTES_IMPLEMENTATION_GUIDE.md`

**Version:** 1.0.0
**Last Updated:** December 21, 2024
