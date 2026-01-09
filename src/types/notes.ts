// Notes System Types

export interface Note {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  content_md: string;
  rendered_html?: string | null;
  subject_id?: string | null;
  topic_id?: string | null;
  exam_board_id?: string | null;
  author_id?: string | null;
  visibility: 'draft' | 'public' | 'registered' | 'premium';
  tags?: string[];
  is_downloadable: boolean;
  view_count: number;
  version: number;
  display_order: number;
  estimated_read_time: number;
  has_latex: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  // Joined data
  subject?: {
    id: string;
    name: string;
    slug: string;
  };
  topic?: {
    id: string;
    name: string;
    slug: string;
  };
  exam_board?: {
    id: string;
    name: string;
    code: string;
  };
  sections?: NoteSection[];
  sections_count?: number;
}

export interface NoteSection {
  id: string;
  note_id: string;
  parent_section_id?: string | null;
  title: string;
  slug: string;
  content_md: string;
  rendered_html?: string | null;
  display_order: number;
  has_latex: boolean;
  estimated_read_time: number;
  created_at: string;
  updated_at: string;
  // Nested sections
  children?: NoteSection[];
  // Progress info (when joined)
  is_completed?: boolean;
}

export interface NoteProgress {
  id: string;
  user_id: string;
  note_id: string;
  section_id?: string | null;
  completed: boolean;
  completed_at?: string | null;
  time_spent_seconds: number;
  last_accessed_at: string;
  created_at: string;
}

export interface NoteBookmark {
  id: string;
  user_id: string;
  note_id: string;
  section_id?: string | null;
  created_at: string;
  // Joined data
  note?: Note;
  section?: NoteSection;
}

export interface NoteWithProgress extends Note {
  progress_percentage: number;
  is_bookmarked: boolean;
  last_accessed_at?: string | null;
  current_section_id?: string | null;
}

export interface TopicNotesProgress {
  total_notes: number;
  completed_notes: number;
  in_progress_notes: number;
  total_time_spent: number;
}

// Form types for admin
export interface NoteFormData {
  title: string;
  subtitle: string;
  slug: string;
  content_md: string;
  subject_id: string;
  topic_id: string;
  exam_board_id: string;
  visibility: 'draft' | 'public' | 'registered' | 'premium';
  tags: string[];
  is_downloadable: boolean;
  estimated_read_time: number;
  has_latex: boolean;
}

export interface NoteSectionFormData {
  title: string;
  slug: string;
  content_md: string;
  parent_section_id: string | null;
  display_order: number;
  has_latex: boolean;
  estimated_read_time: number;
}

// Search types
export interface NoteSearchResult {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  subject_name?: string;
  topic_name?: string;
  visibility: string;
  rank: number;
  headline?: string; // Highlighted search result
}

export interface NoteSearchParams {
  query: string;
  subject_id?: string;
  topic_id?: string;
  exam_board_id?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}

// PDF Export types
export interface NotePDFOptions {
  include_sections: boolean;
  include_toc: boolean;
  paper_size: 'a4' | 'letter';
  font_size: 'small' | 'medium' | 'large';
  include_header: boolean;
  include_footer: boolean;
}

// Analytics types
export interface NoteAnalytics {
  note_id: string;
  total_views: number;
  unique_viewers: number;
  avg_time_spent: number;
  completion_rate: number;
  bookmark_count: number;
  views_by_date: { date: string; views: number }[];
}
