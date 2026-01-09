/**
 * Test Builder Service
 * Handles test creation, question management, and test configuration
 */

import { createClient } from '@/lib/supabase/client';
import type { 
  Assessment, 
  Question, 
  AssessmentQuestion,
  CreateAssessmentRequest,
  AddQuestionToAssessmentRequest 
} from '@/types/assessment';

export class TestBuilderService {
  private supabase = createClient();

  /**
   * Create a new test/assessment
   */
  async createTest(data: CreateAssessmentRequest): Promise<{ assessment: Assessment | null; error: Error | null }> {
    try {
      console.log('=== createTest called ===');
      console.log('Input data:', JSON.stringify(data, null, 2));

      // Get assessment type ID
      const { data: assessmentType, error: typeError } = await this.supabase
        .from('assessment_types')
        .select('id')
        .eq('code', data.assessment_type_code)
        .single();

      console.log('Assessment type lookup:', assessmentType, typeError);

      if (!assessmentType) {
        throw new Error(`Invalid assessment type: ${data.assessment_type_code}`);
      }

      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      console.log('Current user:', user?.id);

      const insertData = {
        assessment_type_id: assessmentType.id,
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        subject_id: data.subject_id || null,
        exam_board_id: data.exam_board_id || null,
        topic_id: data.topic_id || null,
        duration_minutes: data.duration_minutes || null,
        total_marks: data.total_marks || 0,
        passing_marks: data.passing_marks || null,
        calculator_allowed: data.calculator_allowed ?? false,
        max_attempts: data.max_attempts ?? 1,
        show_results: data.show_results ?? 'immediately',
        randomize_questions: data.randomize_questions ?? false,
        randomize_answers: data.randomize_answers ?? false,
        is_template: data.is_template ?? false,
        is_published: false,
        created_by: user?.id
      };

      console.log('Insert data:', JSON.stringify(insertData, null, 2));

      const { data: assessment, error } = await this.supabase
        .from('assessments')
        .insert(insertData)
        .select()
        .single();

      console.log('Insert result:', assessment);
      console.log('Insert error:', error);

      if (error) {
        console.error('Supabase insert error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('=== createTest SUCCESS ===');
      return { assessment, error: null };
    } catch (error) {
      console.error('=== createTest FAILED ===');
      console.error('Error creating test:', error);
      return { assessment: null, error: error as Error };
    }
  }

  /**
   * Update test configuration
   */
  async updateTest(assessmentId: string, updates: Partial<Assessment>): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('assessments')
        .update(updates)
        .eq('id', assessmentId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating test:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Add question to test
   */
  async addQuestionToTest(data: AddQuestionToAssessmentRequest): Promise<{ success: boolean; error: Error | null; id?: string }> {
    try {
      console.log('=== addQuestionToTest called ===');
      console.log('Input data:', JSON.stringify(data, null, 2));

      // Validate required fields
      if (!data.assessment_id) {
        throw new Error('assessment_id is required');
      }
      if (!data.question_id) {
        throw new Error('question_id is required');
      }

      const insertData = {
        assessment_id: data.assessment_id,
        question_id: data.question_id,
        question_order: data.question_order || 1,
        section_name: data.section_name || null,
        section_instructions: data.section_instructions || null,
        custom_question_text: data.custom_question_text || null,
        custom_marks: data.custom_marks || null
      };

      console.log('Insert data:', JSON.stringify(insertData, null, 2));

      const { data: result, error } = await this.supabase
        .from('assessment_questions')
        .insert(insertData)
        .select()
        .single();

      console.log('Insert result:', result);
      console.log('Insert error:', error);

      if (error) {
        console.error('Supabase insert error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Update total marks
      await this.recalculateTotalMarks(data.assessment_id);

      console.log('=== addQuestionToTest SUCCESS ===');
      return { success: true, error: null, id: (result as any)?.id };
    } catch (error) {
      console.error('=== addQuestionToTest FAILED ===');
      console.error('Error adding question to test:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error as Error };
    }
  }

  /**
   * Remove question from test
   */
  async removeQuestionFromTest(assessmentQuestionId: string, assessmentId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('assessment_questions')
        .delete()
        .eq('id', assessmentQuestionId);

      if (error) throw error;

      // Recalculate total marks
      await this.recalculateTotalMarks(assessmentId);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error removing question from test:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Reorder questions in test
   */
  async reorderQuestions(assessmentId: string, questionOrders: { id: string; order: number }[]): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Update each question's order
      for (const { id, order } of questionOrders) {
        await this.supabase
          .from('assessment_questions')
          .update({ question_order: order })
          .eq('id', id)
          .eq('assessment_id', assessmentId);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error reordering questions:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get test with questions - ONLY uses assessments table
   */
  async getTestWithQuestions(assessmentId: string): Promise<{ assessment: Assessment | null; questions: (AssessmentQuestion & { question: Question })[]; error: Error | null }> {
    try {
      // Fetch assessment
      const { data: assessment, error: assessmentError } = await this.supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        console.error('Error fetching assessment:', assessmentError);
        throw new Error(`Assessment not found: ${assessmentError.message}`);
      }

      // Fetch questions from assessment_questions table
      const { data: aqData, error: aqError } = await this.supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('question_order', { ascending: true });

      if (aqError) {
        console.error('Error fetching assessment questions:', aqError);
      }

      let questions: any[] = [];

      if (aqData && aqData.length > 0) {
        // Fetch the actual questions
        const questionIds = aqData.map(aq => aq.question_id).filter(Boolean);
        
        if (questionIds.length > 0) {
          const { data: questionsData, error: qError } = await this.supabase
            .from('questions')
            .select('*')
            .in('id', questionIds);

          if (qError) {
            console.error('Error fetching questions:', qError);
          }

          // Map questions to assessment_questions
          questions = aqData.map(aq => ({
            ...aq,
            question: questionsData?.find(q => q.id === aq.question_id) || null
          }));
        }
      }

      return { assessment, questions, error: null };
    } catch (error) {
      console.error('Error fetching test with questions:', error);
      return { assessment: null, questions: [], error: error as Error };
    }
  }

  /**
   * Browse question bank with filters
   */
  async browseQuestionBank(filters: {
    subjectId?: string;
    topicId?: string;
    examBoardId?: string;
    questionType?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ questions: Question[]; total: number; error: Error | null }> {
    try {
      let query = this.supabase
        .from('questions')
        .select('*, choices:question_choices(*), subject:subjects(*), topic:topics(*)', { count: 'exact' })
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

      if (filters.questionType) {
        query = query.eq('question_type', filters.questionType);
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.search) {
        query = query.ilike('stem_markdown', `%${filters.search}%`);
      }

      const { data: questions, error, count } = await query
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { questions: questions || [], total: count || 0, error: null };
    } catch (error) {
      console.error('Error browsing question bank:', error);
      return { questions: [], total: 0, error: error as Error };
    }
  }

  /**
   * Publish test
   */
  async publishTest(assessmentId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('assessments')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error publishing test:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Unpublish test
   */
  async unpublishTest(assessmentId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('assessments')
        .update({
          is_published: false,
          published_at: null
        })
        .eq('id', assessmentId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error unpublishing test:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Duplicate test
   */
  async duplicateTest(assessmentId: string, newTitle: string): Promise<{ assessment: Assessment | null; error: Error | null }> {
    try {
      // Get original test with questions
      const { assessment: original, questions } = await this.getTestWithQuestions(assessmentId);

      if (!original) {
        throw new Error('Test not found');
      }

      // Create new test
      const { assessment: newAssessment, error: createError } = await this.createTest({
        assessment_type_code: 'custom_test',
        title: newTitle,
        description: original.description || undefined,
        instructions: original.instructions || undefined,
        subject_id: original.subject_id || undefined,
        exam_board_id: original.exam_board_id || undefined,
        topic_id: original.topic_id || undefined,
        duration_minutes: original.duration_minutes || undefined,
        passing_marks: original.passing_marks || undefined,
        calculator_allowed: original.calculator_allowed,
        max_attempts: original.max_attempts,
        show_results: original.show_results,
        randomize_questions: original.randomize_questions,
        randomize_answers: original.randomize_answers,
        is_template: original.is_template
      });

      if (createError || !newAssessment) {
        throw createError || new Error('Failed to create duplicate');
      }

      // Copy questions
      for (const aq of questions) {
        await this.addQuestionToTest({
          assessment_id: newAssessment.id,
          question_id: aq.question_id,
          question_order: aq.question_order,
          section_name: aq.section_name || undefined,
          section_instructions: aq.section_instructions || undefined,
          custom_question_text: aq.custom_question_text || undefined,
          custom_marks: aq.custom_marks || undefined
        });
      }

      return { assessment: newAssessment, error: null };
    } catch (error) {
      console.error('Error duplicating test:', error);
      return { assessment: null, error: error as Error };
    }
  }

  /**
   * Delete test
   */
  async deleteTest(assessmentId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Check if test has any attempts
      const { data: attempts } = await this.supabase
        .from('assessment_attempts')
        .select('id')
        .eq('assessment_id', assessmentId)
        .limit(1);

      if (attempts && attempts.length > 0) {
        throw new Error('Cannot delete test with existing attempts. Archive it instead.');
      }

      const { error } = await this.supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting test:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Archive test
   */
  async archiveTest(assessmentId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('assessments')
        .update({
          archived_at: new Date().toISOString(),
          is_published: false
        })
        .eq('id', assessmentId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error archiving test:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Recalculate total marks for a test
   */
  private async recalculateTotalMarks(assessmentId: string): Promise<void> {
    try {
      const { data: questions } = await this.supabase
        .from('assessment_questions')
        .select('custom_marks, question:questions(marks)')
        .eq('assessment_id', assessmentId);

      if (!questions) return;

      const totalMarks = questions.reduce((sum, aq: any) => {
        const marks = aq.custom_marks || aq.question?.marks || 0;
        return sum + marks;
      }, 0);

      await this.supabase
        .from('assessments')
        .update({ total_marks: totalMarks })
        .eq('id', assessmentId);
    } catch (error) {
      console.error('Error recalculating total marks:', error);
    }
  }

  /**
   * Get teacher's tests
   */
  async getTeacherTests(teacherId: string, filters?: {
    isPublished?: boolean;
    isArchived?: boolean;
  }): Promise<{ tests: Assessment[]; error: Error | null }> {
    try {
      let query = this.supabase
        .from('assessments')
        .select(`
          *,
          assessment_type:assessment_types(*),
          subject:subjects(*),
          questions:assessment_questions(count)
        `)
        .eq('created_by', teacherId);

      if (filters?.isPublished !== undefined) {
        query = query.eq('is_published', filters.isPublished);
      }

      if (filters?.isArchived === false) {
        query = query.is('archived_at', null);
      } else if (filters?.isArchived === true) {
        query = query.not('archived_at', 'is', null);
      }

      const { data: tests, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { tests: tests || [], error: null };
    } catch (error) {
      console.error('Error fetching teacher tests:', error);
      return { tests: [], error: error as Error };
    }
  }
}

export const testBuilderService = new TestBuilderService();
