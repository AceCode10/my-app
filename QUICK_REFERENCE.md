# 🚀 Quick Reference Guide - IGCSE Simplified Admin

## 📍 Quick Navigation

### Admin URLs
```
Main Dashboard:        /admin
Subjects:             /admin/subjects
Questions:            /admin/questions
  - Create:           /admin/questions/new
  - Edit:             /admin/questions/[id]
Past Papers:          /admin/papers
  - Upload:           /admin/papers/new
  - Edit:             /admin/papers/[id]
Bulk Import:          /admin/import
Approvals:            /admin/approvals
User Management:      /admin/dashboard/users
Analytics:            /admin/analytics
Audit Logs:           /admin/audit-logs
```

## 🔑 First Time Setup

### 1. Create Super Admin
```sql
-- In Supabase SQL Editor
UPDATE users 
SET role = 'super_admin'
WHERE email = 'your@email.com';
```

### 2. Login
Navigate to `/login` and use your credentials

### 3. Access Admin Panel
You'll be redirected to `/admin` automatically

## 👥 User Roles

| Role | Access Level |
|------|-------------|
| **Super Admin** | Full access to everything |
| **Content Moderator** | Subjects, Questions, Papers, Import, Approvals |
| **Teacher** | (Future: Test Builder, Classes) |
| **Student** | (Future: Learning content) |

## 📝 Common Tasks

### Create a Subject
1. Go to `/admin/subjects`
2. Click "Add Subject"
3. Fill: Name, Exam Board, Description, Status
4. Click "Create Subject"

### Create a Topic
1. Go to `/admin/subjects`
2. Find subject, click "Add Topic"
3. Fill: Name, Description, Status, Display Order
4. Click "Create Topic"

### Create a Question
1. Go to `/admin/questions`
2. Click "Add Question"
3. Fill question text (Markdown supported)
4. Select question type
5. Configure answer based on type
6. Set difficulty, marks, examiner comment
7. Assign to subject/topic
8. Click "Create Question"

### Upload Past Paper
1. Go to `/admin/papers`
2. Click "Upload Paper"
3. Fill metadata (title, board, year, etc.)
4. Upload PDF files
5. Click "Create Past Paper"

### Bulk Import
1. Go to `/admin/import`
2. Select import type
3. Download template
4. Fill with your data
5. Upload file
6. Review preview
7. Click "Start Import"

### Review Approval
1. Go to `/admin/approvals`
2. Filter by "Pending"
3. Click on item to review
4. Add notes (optional)
5. Click "Approve" or "Reject"

### Manage User Role
1. Go to `/admin/dashboard/users`
2. Find user
3. Click "..." menu → "Edit Role"
4. Select new role
5. Click "Save Changes"

## 🎨 Question Types

### 1. Multiple Choice
- Add/remove options dynamically
- Check correct answer
- Minimum 2 options

### 2. True/False
- Select correct answer from dropdown

### 3. Short Answer
- Enter expected answer text

### 4. Numeric
- Enter numeric answer
- Optional tolerance (e.g., 0.1)

### 5. Essay
- Requires manual grading
- Add marking guidance in examiner comment

### 6. Fill in the Blank
- Enter expected answer

## 📊 Status Workflow

```
Draft → Pending → Published
                ↓
            Archived
```

- **Draft:** Work in progress
- **Pending:** Awaiting approval
- **Published:** Live and visible
- **Archived:** Hidden but not deleted

## 🔍 Filters & Search

### Subjects Page
- Search by name or exam board
- Filter by status

### Questions Page
- Search by question text
- Filter by type, difficulty, status

### Papers Page
- Search by title or board
- Filter by board, year, status

### Approvals Page
- Filter by status (pending/approved/rejected)
- Filter by content type

### Audit Logs Page
- Search by actor, action, or table
- Filter by action type
- Filter by table name

## 📥 Bulk Import Templates

### Subjects Template
```csv
name,description,exam_board,status,display_order
Mathematics,IGCSE Mathematics,IGCSE,draft,0
Physics,IGCSE Physics,IGCSE,draft,1
```

### Topics Template
```csv
subject_name,name,description,status,display_order
Mathematics,Algebra,Basic algebra concepts,draft,0
Mathematics,Geometry,Geometric principles,draft,1
```

### Questions Template
```csv
question_text,question_type,difficulty,marks,correct_answer,examiner_comment,subject_name,topic_name,exam_board,status
What is 2+2?,short_answer,easy,1,4,Basic arithmetic,Mathematics,Algebra,IGCSE,draft
```

## 🎯 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | `/` (in search fields) |
| Close Dialog | `Esc` |
| Submit Form | `Ctrl/Cmd + Enter` |

## 🔒 Security Best Practices

1. **Never share admin credentials**
2. **Use strong passwords**
3. **Review audit logs regularly**
4. **Assign minimum required roles**
5. **Review approvals promptly**
6. **Export audit logs monthly**

## 🐛 Troubleshooting

### Can't Access Admin Panel
- Check your role: `SELECT role FROM users WHERE email = 'your@email.com'`
- Should be `super_admin` or `content_moderator`

### Dashboard Shows Zero Stats
- Normal for fresh installation
- Stats update as you add content

### Upload Fails
- Check file size (max 50MB)
- Check file type (PDF only for papers)
- Check internet connection

### Import Errors
- Download template and follow format exactly
- Check for dependencies (subjects before topics)
- Review error log for specific issues

## 📱 Mobile Access

All admin pages are mobile-responsive:
- Sidebar becomes hamburger menu
- Tables scroll horizontally
- Forms stack vertically
- Touch-friendly buttons

## 🎨 Status Colors

| Status | Color |
|--------|-------|
| Published | Green |
| Pending | Yellow |
| Draft | Gray |
| Archived | Red |

## 📊 Analytics Metrics

### User Stats
- Total users
- New this month
- Active this week
- By role breakdown

### Content Stats
- Subjects, Topics, Questions, Papers counts

### Engagement
- Total views
- Completion rate
- Growth rate

## 🔔 Notifications

Toast notifications appear for:
- ✅ Success actions
- ❌ Error messages
- ℹ️ Info messages
- ⚠️ Warning messages

## 📤 Export Options

### Audit Logs
- Click "Export Logs" button
- Downloads CSV file
- Includes last 1000 logs
- Filename: `audit-logs-YYYY-MM-DD.csv`

## 🎯 Quick Tips

1. **Use search** - Faster than scrolling
2. **Use filters** - Narrow down results
3. **Use templates** - For bulk import
4. **Add descriptions** - Help future you
5. **Set display order** - Control sequence
6. **Use draft status** - For work in progress
7. **Add examiner comments** - Required for questions
8. **Review regularly** - Check approvals queue
9. **Monitor analytics** - Track platform health
10. **Check audit logs** - Security monitoring

## 🆘 Need Help?

1. Check `ADMIN_QUICK_START.md`
2. Review `FULL_SYSTEM_COMPLETE.md`
3. Inspect `ADMIN_SCHEMA.sql`
4. Read code comments

## 📞 Support Contacts

- Technical Issues: Check documentation
- Content Questions: Review guides
- Security Concerns: Check audit logs

---

**Quick Reference v1.0** - Last Updated: 2025
