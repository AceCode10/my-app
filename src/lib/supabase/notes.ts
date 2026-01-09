// Notes Service Functions
import { createClient } from './client';
import type { 
  Note, 
  NoteSection, 
  NoteProgress, 
  NoteBookmark,
  NoteWithProgress,
  NoteSearchParams,
  NoteSearchResult,
  TopicNotesProgress
} from '@/types/notes';

const supabase = createClient();

// ============ Notes CRUD ============

export async function getNotes(params?: {
  subject_id?: string;
  topic_id?: string;
  exam_board_id?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('notes')
    .select(`
      *,
      subject:subjects(id, name, slug),
      topic:topics(id, name, slug),
      exam_board:exam_boards(id, name, code),
      sections:note_sections(count)
    `)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (params?.subject_id) {
    query = query.eq('subject_id', params.subject_id);
  }
  if (params?.topic_id) {
    query = query.eq('topic_id', params.topic_id);
  }
  if (params?.exam_board_id) {
    query = query.eq('exam_board_id', params.exam_board_id);
  }
  if (params?.visibility) {
    query = query.eq('visibility', params.visibility);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data as Note[];
}

export async function getNoteById(id: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      subject:subjects(id, name, slug),
      topic:topics(id, name, slug),
      exam_board:exam_boards(id, name, code)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Note;
}

export async function getNoteBySlug(slug: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      subject:subjects(id, name, slug),
      topic:topics(id, name, slug),
      exam_board:exam_boards(id, name, code)
    `)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Note;
}

export async function getNoteByTopicId(topicId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      subject:subjects(id, name, slug),
      topic:topics(id, name, slug),
      exam_board:exam_boards(id, name, code)
    `)
    .eq('topic_id', topicId)
    .eq('visibility', 'public')
    .not('published_at', 'is', null)
    .order('display_order', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Note | null;
}

export async function createNote(note: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, updates: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function publishNote(id: string) {
  return updateNote(id, {
    visibility: 'public',
    published_at: new Date().toISOString()
  } as Partial<Note>);
}

export async function unpublishNote(id: string) {
  return updateNote(id, {
    visibility: 'draft',
    published_at: null
  } as Partial<Note>);
}

// ============ Note Sections CRUD ============

export async function getNoteSections(noteId: string) {
  const { data, error } = await supabase
    .from('note_sections')
    .select('*')
    .eq('note_id', noteId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  
  // Build hierarchy
  const sections = data as NoteSection[];
  return buildSectionHierarchy(sections);
}

export async function getNoteSectionsFlat(noteId: string) {
  const { data, error } = await supabase
    .from('note_sections')
    .select('*')
    .eq('note_id', noteId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data as NoteSection[];
}

function buildSectionHierarchy(sections: NoteSection[]): NoteSection[] {
  const sectionMap = new Map<string, NoteSection>();
  const rootSections: NoteSection[] = [];

  // First pass: create map
  sections.forEach(section => {
    sectionMap.set(section.id, { ...section, children: [] });
  });

  // Second pass: build hierarchy
  sections.forEach(section => {
    const current = sectionMap.get(section.id)!;
    if (section.parent_section_id) {
      const parent = sectionMap.get(section.parent_section_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(current);
      } else {
        rootSections.push(current);
      }
    } else {
      rootSections.push(current);
    }
  });

  return rootSections;
}

export async function getSectionById(id: string) {
  const { data, error } = await supabase
    .from('note_sections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as NoteSection;
}

export async function createSection(section: Partial<NoteSection>) {
  const { data, error } = await supabase
    .from('note_sections')
    .insert(section)
    .select()
    .single();

  if (error) throw error;
  return data as NoteSection;
}

export async function updateSection(id: string, updates: Partial<NoteSection>) {
  const { data, error } = await supabase
    .from('note_sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NoteSection;
}

export async function deleteSection(id: string) {
  const { error } = await supabase
    .from('note_sections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderSections(noteId: string, sectionOrders: { id: string; display_order: number }[]) {
  const updates = sectionOrders.map(({ id, display_order }) =>
    supabase
      .from('note_sections')
      .update({ display_order })
      .eq('id', id)
      .eq('note_id', noteId)
  );

  await Promise.all(updates);
}

// ============ Progress Tracking ============

export async function getNoteProgress(userId: string, noteId: string) {
  const { data, error } = await supabase
    .from('note_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('note_id', noteId);

  if (error) throw error;
  return data as NoteProgress[];
}

export async function updateNoteProgress(
  userId: string,
  noteId: string,
  sectionId: string | null,
  updates: { completed?: boolean; time_spent_seconds?: number }
) {
  const { data: existing } = await supabase
    .from('note_progress')
    .select('id, time_spent_seconds')
    .eq('user_id', userId)
    .eq('note_id', noteId)
    .eq('section_id', sectionId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('note_progress')
      .update({
        ...updates,
        time_spent_seconds: updates.time_spent_seconds 
          ? existing.time_spent_seconds + updates.time_spent_seconds 
          : existing.time_spent_seconds,
        completed_at: updates.completed ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as NoteProgress;
  } else {
    const { data, error } = await supabase
      .from('note_progress')
      .insert({
        user_id: userId,
        note_id: noteId,
        section_id: sectionId,
        ...updates,
        completed_at: updates.completed ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as NoteProgress;
  }
}

export async function markSectionComplete(userId: string, noteId: string, sectionId: string) {
  return updateNoteProgress(userId, noteId, sectionId, { completed: true });
}

export async function getTopicNotesProgress(userId: string, topicId: string): Promise<TopicNotesProgress> {
  const { data, error } = await supabase
    .rpc('get_topic_notes_progress', { p_user_id: userId, p_topic_id: topicId });

  if (error) throw error;
  return data?.[0] || { total_notes: 0, completed_notes: 0, in_progress_notes: 0, total_time_spent: 0 };
}

// ============ Bookmarks ============

export async function getBookmarks(userId: string) {
  const { data, error } = await supabase
    .from('note_bookmarks')
    .select(`
      *,
      note:notes(id, title, slug, subject_id, topic_id),
      section:note_sections(id, title, slug)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NoteBookmark[];
}

export async function addBookmark(userId: string, noteId: string, sectionId?: string) {
  const { data, error } = await supabase
    .from('note_bookmarks')
    .insert({
      user_id: userId,
      note_id: noteId,
      section_id: sectionId || null
    })
    .select()
    .single();

  if (error) throw error;
  return data as NoteBookmark;
}

export async function removeBookmark(userId: string, noteId: string, sectionId?: string) {
  let query = supabase
    .from('note_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('note_id', noteId);

  if (sectionId) {
    query = query.eq('section_id', sectionId);
  } else {
    query = query.is('section_id', null);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function isNoteBookmarked(userId: string, noteId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('note_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('note_id', noteId)
    .limit(1);

  if (error) throw error;
  return (data?.length || 0) > 0;
}

// ============ Search ============

export async function searchNotes(params: NoteSearchParams): Promise<NoteSearchResult[]> {
  const { query, subject_id, topic_id, exam_board_id, visibility, limit = 20, offset = 0 } = params;

  // Use full-text search
  let dbQuery = supabase
    .from('notes')
    .select(`
      id,
      title,
      subtitle,
      slug,
      visibility,
      subject:subjects(name),
      topic:topics(name)
    `)
    .textSearch('search_vector', query, { type: 'websearch' })
    .not('published_at', 'is', null)
    .range(offset, offset + limit - 1);

  if (subject_id) {
    dbQuery = dbQuery.eq('subject_id', subject_id);
  }
  if (topic_id) {
    dbQuery = dbQuery.eq('topic_id', topic_id);
  }
  if (exam_board_id) {
    dbQuery = dbQuery.eq('exam_board_id', exam_board_id);
  }
  if (visibility) {
    dbQuery = dbQuery.eq('visibility', visibility);
  }

  const { data, error } = await dbQuery;

  if (error) throw error;

  return (data || []).map((note: any, index: number) => ({
    id: note.id,
    title: note.title,
    subtitle: note.subtitle,
    slug: note.slug,
    subject_name: note.subject?.name,
    topic_name: note.topic?.name,
    visibility: note.visibility,
    rank: index + 1
  }));
}

// ============ View Count ============

export async function incrementViewCount(noteId: string) {
  const { error } = await supabase.rpc('increment_note_view_count', { note_id: noteId });
  if (error) {
    // Fallback if RPC doesn't exist
    const { data: note } = await supabase
      .from('notes')
      .select('view_count')
      .eq('id', noteId)
      .single();
    
    if (note) {
      await supabase
        .from('notes')
        .update({ view_count: (note.view_count || 0) + 1 })
        .eq('id', noteId);
    }
  }
}

// ============ Notes with Progress (for students) ============

export async function getNotesWithProgress(
  userId: string,
  params?: { topic_id?: string; subject_id?: string }
): Promise<NoteWithProgress[]> {
  let query = supabase
    .from('notes')
    .select(`
      *,
      subject:subjects(id, name, slug),
      topic:topics(id, name, slug)
    `)
    .not('published_at', 'is', null)
    .neq('visibility', 'draft')
    .order('display_order', { ascending: true });

  if (params?.topic_id) {
    query = query.eq('topic_id', params.topic_id);
  }
  if (params?.subject_id) {
    query = query.eq('subject_id', params.subject_id);
  }

  const { data: notes, error } = await query;
  if (error) throw error;

  // Get progress and bookmarks for these notes
  const noteIds = (notes || []).map(n => n.id);
  
  const [progressResult, bookmarksResult] = await Promise.all([
    supabase
      .from('note_progress')
      .select('*')
      .eq('user_id', userId)
      .in('note_id', noteIds),
    supabase
      .from('note_bookmarks')
      .select('note_id')
      .eq('user_id', userId)
      .in('note_id', noteIds)
  ]);

  const progressMap = new Map<string, NoteProgress[]>();
  (progressResult.data || []).forEach(p => {
    const existing = progressMap.get(p.note_id) || [];
    existing.push(p);
    progressMap.set(p.note_id, existing);
  });

  const bookmarkedNoteIds = new Set((bookmarksResult.data || []).map(b => b.note_id));

  return (notes || []).map(note => {
    const progress = progressMap.get(note.id) || [];
    const mainProgress = progress.find(p => !p.section_id);
    const sectionProgress = progress.filter(p => p.section_id);
    
    // Calculate progress percentage
    let progressPercentage = 0;
    if (note.sections_count && note.sections_count > 0) {
      const completedSections = sectionProgress.filter(p => p.completed).length;
      progressPercentage = Math.round((completedSections / note.sections_count) * 100);
    } else if (mainProgress?.completed) {
      progressPercentage = 100;
    }

    return {
      ...note,
      progress_percentage: progressPercentage,
      is_bookmarked: bookmarkedNoteIds.has(note.id),
      last_accessed_at: mainProgress?.last_accessed_at || null,
      current_section_id: sectionProgress.find(p => !p.completed)?.section_id || null
    } as NoteWithProgress;
  });
}

// ============ Admin Functions ============

export async function getAllNotesAdmin(params?: {
  subject_id?: string;
  topic_id?: string;
  visibility?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('notes')
    .select(`
      *,
      subject:subjects(id, name, slug),
      topic:topics(id, name, slug),
      exam_board:exam_boards(id, name, code),
      author:users(id, display_name, email)
    `, { count: 'exact' })
    .order('updated_at', { ascending: false });

  if (params?.subject_id) {
    query = query.eq('subject_id', params.subject_id);
  }
  if (params?.topic_id) {
    query = query.eq('topic_id', params.topic_id);
  }
  if (params?.visibility) {
    query = query.eq('visibility', params.visibility);
  }
  if (params?.search) {
    query = query.or(`title.ilike.%${params.search}%,subtitle.ilike.%${params.search}%`);
  }
  if (params?.limit) {
    const offset = params.offset || 0;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, error, count } = await query;
  
  if (error) throw error;
  return { notes: data as Note[], total: count || 0 };
}

export async function duplicateNote(noteId: string, newTitle: string): Promise<Note> {
  // Get original note
  const original = await getNoteById(noteId);
  
  // Get sections
  const sections = await getNoteSectionsFlat(noteId);
  
  // Create new note
  const newNote = await createNote({
    title: newTitle,
    subtitle: original.subtitle,
    slug: `${original.slug}-copy-${Date.now()}`,
    content_md: original.content_md,
    rendered_html: original.rendered_html,
    subject_id: original.subject_id,
    topic_id: original.topic_id,
    exam_board_id: original.exam_board_id,
    visibility: 'draft',
    tags: original.tags,
    is_downloadable: original.is_downloadable,
    estimated_read_time: original.estimated_read_time,
    has_latex: original.has_latex
  });

  // Duplicate sections
  const sectionIdMap = new Map<string, string>();
  
  // First pass: create sections without parent references
  for (const section of sections.filter(s => !s.parent_section_id)) {
    const newSection = await createSection({
      note_id: newNote.id,
      title: section.title,
      slug: section.slug,
      content_md: section.content_md,
      rendered_html: section.rendered_html,
      display_order: section.display_order,
      has_latex: section.has_latex,
      estimated_read_time: section.estimated_read_time
    });
    sectionIdMap.set(section.id, newSection.id);
  }

  // Second pass: create child sections
  for (const section of sections.filter(s => s.parent_section_id)) {
    const newParentId = sectionIdMap.get(section.parent_section_id!);
    const newSection = await createSection({
      note_id: newNote.id,
      parent_section_id: newParentId,
      title: section.title,
      slug: section.slug,
      content_md: section.content_md,
      rendered_html: section.rendered_html,
      display_order: section.display_order,
      has_latex: section.has_latex,
      estimated_read_time: section.estimated_read_time
    });
    sectionIdMap.set(section.id, newSection.id);
  }

  return newNote;
}
