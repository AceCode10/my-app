/**
 * Bulk Operations Service
 * Admin tools for bulk import/export and content moderation
 */

import { createClient } from '@/lib/supabase/client';

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeRelations?: boolean;
  filters?: Record<string, any>;
}

export interface ContentModerationItem {
  id: string;
  type: 'question' | 'note' | 'flashcard';
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export class BulkOperationsService {
  private supabase = createClient();

  // ============================================
  // BULK IMPORT
  // ============================================

  /**
   * Import questions from JSON/CSV
   */
  async importQuestions(data: any[], subjectId: string, topicId: string): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        // Validate required fields
        if (!row.stem_markdown && !row.question_text) {
          result.errors.push({ row: i + 1, error: 'Missing question text' });
          result.failed++;
          continue;
        }

        const questionData = {
          subject_id: subjectId,
          topic_id: topicId,
          stem_markdown: row.stem_markdown || row.question_text,
          question_type: row.question_type || 'mcq',
          difficulty: row.difficulty || 'medium',
          marks: row.marks || 1,
          correct_answer: row.correct_answer,
          explanation: row.explanation,
          status: 'pending'
        };

        const { data: question, error } = await this.supabase
          .from('questions')
          .insert(questionData)
          .select()
          .single();

        if (error) {
          result.errors.push({ row: i + 1, error: error.message });
          result.failed++;
          continue;
        }

        // Import choices if MCQ
        if (row.choices && Array.isArray(row.choices) && question) {
          for (const choice of row.choices) {
            await this.supabase
              .from('question_choices')
              .insert({
                question_id: question.id,
                choice_text: choice.text,
                is_correct: choice.is_correct || false,
                choice_order: choice.order || 0
              });
          }
        }

        result.success++;
      } catch (error: any) {
        result.errors.push({ row: i + 1, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Import users from CSV
   */
  async importUsers(data: any[], defaultRole = 'student'): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        if (!row.email) {
          result.errors.push({ row: i + 1, error: 'Missing email' });
          result.failed++;
          continue;
        }

        // Check if user exists
        const { data: existingUser } = await this.supabase
          .from('users')
          .select('id')
          .eq('email', row.email)
          .single();

        if (existingUser) {
          result.errors.push({ row: i + 1, error: 'User already exists' });
          result.failed++;
          continue;
        }

        // Note: User creation should be done through auth
        // This is for updating user profiles
        result.errors.push({ row: i + 1, error: 'User creation requires auth signup' });
        result.failed++;
      } catch (error: any) {
        result.errors.push({ row: i + 1, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Import flashcards
   */
  async importFlashcards(data: any[], deckId: string): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        if (!row.front_content || !row.back_content) {
          result.errors.push({ row: i + 1, error: 'Missing front or back content' });
          result.failed++;
          continue;
        }

        const { error } = await this.supabase
          .from('flashcards')
          .insert({
            deck_id: deckId,
            front_content: row.front_content,
            back_content: row.back_content,
            hints: row.hints || [],
            difficulty: row.difficulty || 'medium',
            position: i
          });

        if (error) {
          result.errors.push({ row: i + 1, error: error.message });
          result.failed++;
        } else {
          result.success++;
        }
      } catch (error: any) {
        result.errors.push({ row: i + 1, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  // ============================================
  // BULK EXPORT
  // ============================================

  /**
   * Export questions
   */
  async exportQuestions(options: ExportOptions & { subjectId?: string; topicId?: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('questions')
        .select(`
          *,
          choices:question_choices(*)
          ${options.includeRelations ? ', subject:subjects(*), topic:topics(*)' : ''}
        `);

      if (options.subjectId) {
        query = query.eq('subject_id', options.subjectId);
      }

      if (options.topicId) {
        query = query.eq('topic_id', options.topicId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error exporting questions:', error);
      return [];
    }
  }

  /**
   * Export users (admin only)
   */
  async exportUsers(options: ExportOptions & { role?: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('users')
        .select('id, email, display_name, role, created_at');

      if (options.role) {
        query = query.eq('role', options.role);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error exporting users:', error);
      return [];
    }
  }

  /**
   * Export class data with enrollments
   */
  async exportClassData(classId: string): Promise<any> {
    try {
      const { data: classData } = await this.supabase
        .from('classes')
        .select(`
          *,
          teacher:users!classes_teacher_id_fkey(display_name, email),
          enrollments(
            student:users(id, display_name, email)
          )
        `)
        .eq('id', classId)
        .single();

      return classData;
    } catch (error) {
      console.error('Error exporting class data:', error);
      return null;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      });
      csvRows.push(values.map(v => `"${v}"`).join(','));
    }

    return csvRows.join('\n');
  }

  // ============================================
  // CONTENT MODERATION
  // ============================================

  /**
   * Get pending content for moderation
   */
  async getPendingContent(type?: 'question' | 'note' | 'flashcard'): Promise<ContentModerationItem[]> {
    try {
      const items: ContentModerationItem[] = [];

      // Get pending questions
      if (!type || type === 'question') {
        const { data: questions } = await this.supabase
          .from('questions')
          .select('id, stem_markdown, status, created_by, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        questions?.forEach(q => {
          items.push({
            id: q.id,
            type: 'question',
            content: q.stem_markdown,
            status: 'pending',
            submitted_by: q.created_by,
            submitted_at: q.created_at
          });
        });
      }

      return items;
    } catch (error) {
      console.error('Error getting pending content:', error);
      return [];
    }
  }

  /**
   * Approve content
   */
  async approveContent(id: string, type: 'question' | 'note' | 'flashcard', reviewerId: string): Promise<boolean> {
    try {
      const table = type === 'question' ? 'questions' : type === 'note' ? 'notes' : 'flashcards';
      
      const { error } = await this.supabase
        .from(table)
        .update({
          status: 'published',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error approving content:', error);
      return false;
    }
  }

  /**
   * Reject content
   */
  async rejectContent(
    id: string,
    type: 'question' | 'note' | 'flashcard',
    reviewerId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const table = type === 'question' ? 'questions' : type === 'note' ? 'notes' : 'flashcards';
      
      const { error } = await this.supabase
        .from(table)
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error rejecting content:', error);
      return false;
    }
  }

  /**
   * Bulk approve content
   */
  async bulkApprove(ids: string[], type: 'question' | 'note' | 'flashcard', reviewerId: string): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const success = await this.approveContent(id, type, reviewerId);
      if (success) count++;
    }
    return count;
  }

  /**
   * Get moderation stats
   */
  async getModerationStats(): Promise<{
    pending: number;
    approved_today: number;
    rejected_today: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { count: pending } = await this.supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approved } = await this.supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('reviewed_at', today);

      const { count: rejected } = await this.supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('reviewed_at', today);

      return {
        pending: pending || 0,
        approved_today: approved || 0,
        rejected_today: rejected || 0
      };
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      return { pending: 0, approved_today: 0, rejected_today: 0 };
    }
  }
}

export const bulkOperationsService = new BulkOperationsService();
