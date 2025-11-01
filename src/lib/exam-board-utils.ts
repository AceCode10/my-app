// ============================================
// EXAM BOARD UTILITY FUNCTIONS
// Helper functions for exam board filtering
// ============================================

import { createClient } from '@/lib/supabase/client';
import type { ExamBoard } from '@/types/exam-board';

/**
 * Fetch all active exam boards
 */
export async function fetchExamBoards(): Promise<ExamBoard[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('exam_boards')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching exam boards:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's exam board preference
 */
export async function getUserExamBoardPreference(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('preferred_exam_board_id, onboarding_completed, show_all_exam_boards')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user preference:', error);
    return null;
  }

  return data;
}

/**
 * Apply exam board filter to a Supabase query
 * Usage: applyExamBoardFilter(query, boardId)
 */
export function applyExamBoardFilter<T>(
  query: any,
  examBoardId: string | null | undefined
) {
  if (!examBoardId) {
    // No filter - return all
    return query;
  }

  // Filter by exam board
  return query.eq('exam_board_id', examBoardId);
}

/**
 * Apply exam board filter with multi-board support
 * Checks both direct assignment and junction table
 */
export function applyMultiBoardFilter<T>(
  query: any,
  examBoardId: string | null | undefined,
  contentType: 'subject' | 'topic' | 'question' | 'paper'
) {
  if (!examBoardId) {
    return query;
  }

  // This would need to be a custom RPC function or complex query
  // For now, just filter by direct assignment
  return query.eq('exam_board_id', examBoardId);
}

/**
 * Get exam board by ID
 */
export async function getExamBoardById(boardId: string): Promise<ExamBoard | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('exam_boards')
    .select('*')
    .eq('id', boardId)
    .single();

  if (error) {
    console.error('Error fetching exam board:', error);
    return null;
  }

  return data;
}

/**
 * Get exam board by code
 */
export async function getExamBoardByCode(code: string): Promise<ExamBoard | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('exam_boards')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) {
    console.error('Error fetching exam board:', error);
    return null;
  }

  return data;
}

/**
 * Check if content belongs to multiple exam boards
 */
export async function getContentExamBoards(
  contentType: 'subject' | 'topic' | 'question' | 'paper',
  contentId: string
): Promise<ExamBoard[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('content_exam_boards')
    .select(`
      exam_board_id,
      exam_boards (*)
    `)
    .eq('content_type', contentType)
    .eq('content_id', contentId);

  if (error) {
    console.error('Error fetching content exam boards:', error);
    return [];
  }

  return data?.map((item: any) => item.exam_boards).filter(Boolean) || [];
}

/**
 * Assign content to multiple exam boards
 */
export async function assignContentToExamBoards(
  contentType: 'subject' | 'topic' | 'question' | 'paper',
  contentId: string,
  examBoardIds: string[]
) {
  const supabase = createClient();
  
  // Remove existing assignments
  await supabase
    .from('content_exam_boards')
    .delete()
    .eq('content_type', contentType)
    .eq('content_id', contentId);

  // Add new assignments
  const assignments = examBoardIds.map(boardId => ({
    content_type: contentType,
    content_id: contentId,
    exam_board_id: boardId
  }));

  const { error } = await supabase
    .from('content_exam_boards')
    .insert(assignments);

  if (error) {
    console.error('Error assigning content to exam boards:', error);
    throw error;
  }
}

/**
 * Get subjects with exam board filter
 */
export async function getSubjectsWithExamBoard(examBoardId?: string | null) {
  const supabase = createClient();
  
  let query = supabase
    .from('subjects')
    .select(`
      *,
      exam_board:exam_boards(*)
    `)
    .eq('status', 'published')
    .order('display_order', { ascending: true });

  if (examBoardId) {
    query = query.eq('exam_board_id', examBoardId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }

  return data || [];
}

/**
 * Get topics with exam board filter
 */
export async function getTopicsWithExamBoard(
  subjectId: string,
  examBoardId?: string | null
) {
  const supabase = createClient();
  
  let query = supabase
    .from('topics')
    .select(`
      *,
      exam_board:exam_boards(*)
    `)
    .eq('subject_id', subjectId)
    .eq('status', 'published')
    .order('display_order', { ascending: true });

  if (examBoardId) {
    query = query.eq('exam_board_id', examBoardId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching topics:', error);
    return [];
  }

  return data || [];
}

/**
 * Get questions with exam board filter
 */
export async function getQuestionsWithExamBoard(
  filters: {
    subjectId?: string;
    topicId?: string;
    examBoardId?: string | null;
    difficulty?: string;
    limit?: number;
  }
) {
  const supabase = createClient();
  
  let query = supabase
    .from('questions')
    .select(`
      *,
      exam_board:exam_boards(*),
      subject:subjects(name),
      topic:topics(name)
    `)
    .eq('status', 'published');

  if (filters.subjectId) {
    query = query.eq('subject_id', filters.subjectId);
  }

  if (filters.topicId) {
    query = query.eq('topic_id', filters.topicId);
  }

  if (filters.examBoardId) {
    query = query.eq('exam_board_id', filters.examBoardId);
  }

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
}
