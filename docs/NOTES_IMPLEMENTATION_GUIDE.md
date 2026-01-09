# Notes Feature Implementation Guide

## Overview
This guide covers the complete implementation of the revision notes feature for IGCSE Simplified, including database setup, features, and usage instructions.

## Features Implemented

### 1. **Hierarchical Notes with Sections**
- Notes can be organized into sections and sub-sections
- Supports unlimited nesting levels
- Each section has its own content, estimated read time, and LaTeX detection
- Sections can be reordered, duplicated, and managed independently

### 2. **Markdown + LaTeX Rendering**
- Full Markdown support with GitHub Flavored Markdown (GFM)
- Mathematical equations using KaTeX
- Syntax highlighting for code blocks
- Custom components for tables, images, and blockquotes
- Automatic anchor links for headings

### 3. **Progress Tracking**
- Tracks reading progress per note and per section
- Calculates completion percentage
- Records time spent on each note/section
- Displays visual progress indicators
- "Continue Reading" feature for students

### 4. **Search Functionality**
- Full-text search with weighted vectors (title, subtitle, content)
- Global search accessible via keyboard shortcut (⌘K / Ctrl+K)
- Inline search components
- Search results with highlighting and metadata

### 5. **PDF Export**
- Client-side PDF generation using jsPDF and html2canvas
- Customizable options:
  - Paper size (A4, Letter, Legal)
  - Font size
  - Include/exclude table of contents
  - Headers and footers
  - Section selection
- Preserves formatting and styling

### 6. **Access Control**
- Visibility levels: Draft, Public, Registered, Premium
- RLS policies for secure data access
- Subscription-based access restrictions
- Author-based permissions

### 7. **Bookmarking**
- Students can bookmark notes for quick access
- Bookmark management in student dashboard
- Visual indicators for bookmarked notes

### 8. **Mobile Responsive**
- Adaptive layouts for all screen sizes
- Mobile-optimized section navigation
- Touch-friendly interactions
- Collapsible sidebars

## Database Schema

### Tables Created

#### `notes` (Enhanced)
```sql
- exam_board_id: UUID (references exam_boards)
- display_order: INTEGER
- estimated_read_time: INTEGER (minutes)
- has_latex: BOOLEAN
- search_vector: TSVECTOR (for full-text search)
```

#### `note_sections`
```sql
- id: UUID (primary key)
- note_id: UUID (references notes)
- parent_section_id: UUID (self-reference for hierarchy)
- title: TEXT
- slug: TEXT
- content_md: TEXT
- display_order: INTEGER
- estimated_read_time: INTEGER
- has_latex: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `note_progress`
```sql
- id: UUID (primary key)
- user_id: UUID (references users)
- note_id: UUID (references notes)
- section_id: UUID (references note_sections, nullable)
- completed: BOOLEAN
- progress_percentage: INTEGER
- time_spent_seconds: INTEGER
- last_accessed_at: TIMESTAMPTZ
```

#### `note_bookmarks`
```sql
- id: UUID (primary key)
- user_id: UUID (references users)
- note_id: UUID (references notes)
- created_at: TIMESTAMPTZ
```

## Installation Steps

### 1. Apply Database Migration

**Option A: Using Supabase CLI (Recommended)**
```bash
cd my-app
npx supabase db push
```

**Option B: Manual Application**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20241221_notes_sections_system.sql`
4. Execute the SQL in the editor

**Option C: Using the Script**
```bash
npm run apply-notes-migration
```

### 2. Verify Installation

Check that the following tables exist in your Supabase database:
- `notes` (with new columns)
- `note_sections`
- `note_progress`
- `note_bookmarks`

### 3. Test RLS Policies

Ensure the following policies are active:
- `notes_select_policy`
- `notes_insert_policy`
- `notes_update_policy`
- `note_sections_select_policy`
- `note_progress_select_policy`
- `note_bookmarks_select_policy`

## Usage Guide

### Admin Interface

#### Creating a Note
1. Navigate to `/admin/notes`
2. Click "Create Note"
3. Fill in the details:
   - Title and subtitle
   - Subject and topic
   - Exam board
   - Markdown content
   - Visibility level
   - Tags
   - Download permissions
4. Click "Save" or "Publish"

#### Managing Sections
1. Go to `/admin/notes/[id]/sections`
2. Add sections with the "Add Section" button
3. Nest sections by adding child sections
4. Reorder using drag handles
5. Edit content inline with Markdown preview
6. Duplicate or delete sections as needed

#### Bulk Actions
- Filter notes by subject, visibility, exam board
- Search across all notes
- Sort by title, date, or view count
- Duplicate notes
- Toggle visibility (publish/unpublish)
- Delete notes (with confirmation)

### Student Interface

#### Viewing Notes
1. Navigate to `/student/notes` or access via sidebar
2. View all available notes with progress indicators
3. Filter by subject or search
4. Click a note to read

#### Reading Experience
- Navigate between sections using sidebar
- Track progress automatically
- Bookmark important notes
- Export to PDF
- Share notes with classmates
- Link to related quizzes

#### Progress Tracking
- View completion percentage per note
- See time spent reading
- "Continue Reading" suggestions
- Filter by in-progress or completed notes

### Public Interface

#### Accessing Notes
- Browse notes at `/subjects/[subject]/[topic]/notes`
- View by slug at `/notes/[slug]`
- Access control based on visibility and subscription
- Link from quiz questions when answers are incorrect

## Component Architecture

### Core Components (`src/components/notes/`)

1. **`markdown-renderer.tsx`**
   - Renders Markdown with LaTeX
   - Syntax highlighting
   - Custom components for enhanced display

2. **`section-navigation.tsx`**
   - Hierarchical section list
   - Progress indicators
   - Mobile selector dropdown

3. **`notes-viewer.tsx`**
   - Main viewing component
   - Section navigation integration
   - Progress tracking
   - Bookmarking

4. **`notes-search.tsx`**
   - Global search dialog
   - Inline search bar
   - Debounced queries
   - Result highlighting

5. **`notes-pdf-export.tsx`**
   - PDF generation dialog
   - Customization options
   - Progress indicator

### Service Layer (`src/lib/supabase/notes.ts`)

Functions available:
- `getNoteBySlug(slug)`
- `getNoteById(id)`
- `getNoteSections(noteId)`
- `createNote(data)`
- `updateNote(id, data)`
- `deleteNote(id)`
- `searchNotes(params)`
- `trackNoteProgress(userId, noteId, data)`
- `toggleBookmark(userId, noteId)`
- `getUserBookmarks(userId)`
- `getNotesWithProgress(userId, filters)`

## Performance Optimizations

### Implemented
1. **Debounced Search** - Reduces API calls during typing
2. **Pagination** - Loads 20 notes per page
3. **Lazy Loading** - Sections loaded on demand
4. **Indexed Queries** - Database indexes on frequently queried columns
5. **Memoization** - React hooks for expensive computations
6. **Optimistic Updates** - Immediate UI feedback

### Best Practices
- Use `select` with specific columns to reduce payload
- Implement virtual scrolling for large lists
- Cache frequently accessed notes
- Compress images in Markdown content
- Use CDN for static assets

## Troubleshooting

### Common Issues

**1. Migration Fails**
- Check for existing tables with same names
- Verify Supabase connection
- Ensure you have admin privileges
- Review error logs in Supabase dashboard

**2. LaTeX Not Rendering**
- Verify KaTeX CSS is imported in `globals.css`
- Check for syntax errors in LaTeX code
- Ensure `has_latex` flag is set correctly

**3. Search Not Working**
- Verify `search_vector` column exists
- Check RLS policies allow search
- Ensure trigger function is active
- Test with simple queries first

**4. Progress Not Tracking**
- Verify user is authenticated
- Check `note_progress` table permissions
- Ensure progress tracking function is called
- Review browser console for errors

**5. PDF Export Issues**
- Check browser compatibility (modern browsers only)
- Verify jsPDF and html2canvas are installed
- Test with simpler content first
- Check for console errors

### Debug Mode

Enable debug logging:
```typescript
// In any component
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) console.log('Debug info:', data);
```

## Future Enhancements

### Planned Features
1. **Collaborative Notes** - Allow students to add annotations
2. **Version History** - Track changes to notes over time
3. **AI Summaries** - Generate quick summaries of long notes
4. **Spaced Repetition** - Suggest review times based on forgetting curve
5. **Offline Mode** - Cache notes for offline reading
6. **Audio Narration** - Text-to-speech for accessibility
7. **Interactive Diagrams** - Embed interactive visualizations
8. **Note Templates** - Pre-built templates for common note types

### API Endpoints (Future)
- `GET /api/notes` - List notes with filters
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PATCH /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/:id/analytics` - Get note analytics

## Support

For issues or questions:
1. Check this documentation first
2. Review the code comments in implementation files
3. Check Supabase logs for database errors
4. Test in development environment before production
5. Create detailed bug reports with reproduction steps

## Credits

Built with:
- Next.js 15
- React 19
- TypeScript
- Supabase
- Tailwind CSS
- ShadCN UI
- react-markdown
- KaTeX
- jsPDF
- html2canvas

---

**Last Updated:** December 21, 2024
**Version:** 1.0.0
