/**
 * Grading Service
 * Comprehensive auto-grading and manual grading support
 */

import { createClient } from '@/lib/supabase/client';
import type { Question, GradingResult } from '@/types/assessment';

export interface GradingDetails {
  question_id: string;
  is_correct: boolean | null;
  marks_awarded: number;
  max_marks: number;
  auto_graded: boolean;
  needs_manual_grading: boolean;
  confidence: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
}

export interface AttemptGradingResult {
  attempt_id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  auto_graded_count: number;
  needs_manual_grading_count: number;
  grading_details: GradingDetails[];
  status: 'fully_graded' | 'partially_graded' | 'needs_manual_grading';
}

export class GradingService {
  private supabase = createClient();

  /**
   * Auto-grade an entire test attempt
   */
  async gradeTestAttempt(attemptId: string): Promise<AttemptGradingResult | null> {
    try {
      // Fetch the attempt with answers
      const { data: attempt, error: attemptError } = await this.supabase
        .from('test_attempts')
        .select('*, assignment:assignments(*)')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        console.error('Error fetching attempt:', attemptError);
        return null;
      }

      // Get test questions
      const testId = attempt.test_id || attempt.assignment?.test_id;
      if (!testId) {
        console.error('No test_id found for attempt');
        return null;
      }

      // Fetch questions for this test
      const { data: testQuestions, error: questionsError } = await this.supabase
        .from('test_questions')
        .select(`
          *,
          question:questions(
            *,
            choices:question_choices(*)
          )
        `)
        .eq('test_id', testId)
        .order('question_order');

      if (questionsError || !testQuestions) {
        console.error('Error fetching test questions:', questionsError);
        return null;
      }

      const answers = attempt.answers || {};
      const gradingDetails: GradingDetails[] = [];
      let totalScore = 0;
      let maxScore = 0;
      let autoGradedCount = 0;
      let needsManualCount = 0;

      // Grade each question
      for (const tq of testQuestions) {
        const question = tq.question;
        if (!question) continue;

        const marks = tq.custom_marks || question.marks || 1;
        maxScore += marks;

        const answer = answers[question.id];
        const result = this.autoGradeQuestion(question, answer);

        const detail: GradingDetails = {
          question_id: question.id,
          is_correct: result.is_correct,
          marks_awarded: result.marks_awarded ?? 0,
          max_marks: marks,
          auto_graded: result.auto_graded,
          needs_manual_grading: result.needs_manual_grading,
          confidence: result.confidence,
          graded_at: new Date().toISOString()
        };

        if (result.auto_graded) {
          autoGradedCount++;
          totalScore += result.marks_awarded ?? 0;
        } else if (result.needs_manual_grading) {
          needsManualCount++;
        }

        gradingDetails.push(detail);
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const status = needsManualCount === 0 
        ? 'fully_graded' 
        : autoGradedCount > 0 
          ? 'partially_graded' 
          : 'needs_manual_grading';

      // Update the attempt with grading results
      const updateData: any = {
        grading_details: gradingDetails,
        auto_graded: autoGradedCount > 0,
        requires_manual_grading: needsManualCount > 0,
        updated_at: new Date().toISOString()
      };

      // Only update score if fully auto-graded
      if (status === 'fully_graded') {
        updateData.total_score = totalScore;
        updateData.max_score = maxScore;
        updateData.percentage = percentage;
        updateData.status = 'graded';
      } else {
        updateData.status = 'grading';
      }

      await this.supabase
        .from('test_attempts')
        .update(updateData)
        .eq('id', attemptId);

      return {
        attempt_id: attemptId,
        total_score: totalScore,
        max_score: maxScore,
        percentage,
        auto_graded_count: autoGradedCount,
        needs_manual_grading_count: needsManualCount,
        grading_details: gradingDetails,
        status
      };
    } catch (error) {
      console.error('Error grading test attempt:', error);
      return null;
    }
  }

  /**
   * Auto-grade a single question
   */
  autoGradeQuestion(question: Question, answer: any): GradingResult {
    if (!answer) {
      return {
        is_correct: false,
        marks_awarded: 0,
        auto_graded: true,
        needs_manual_grading: false,
        needs_review: false,
        confidence: 1.0
      };
    }

    const selectedChoiceId = answer.selected_choice_id;
    const textAnswer = answer.answer_text || answer.text || (typeof answer === 'string' ? answer : null);

    // MCQ - exact match
    if (question.question_type === 'mcq' && selectedChoiceId) {
      const correctChoice = question.choices?.find(c => c.is_correct);
      const isCorrect = selectedChoiceId === correctChoice?.id;
      
      return {
        is_correct: isCorrect,
        marks_awarded: isCorrect ? question.marks : 0,
        auto_graded: true,
        needs_manual_grading: false,
        needs_review: false,
        confidence: 1.0
      };
    }

    // True/False - exact match
    if (question.question_type === 'true_false' && textAnswer) {
      const normalizedAnswer = textAnswer.toLowerCase().trim();
      const normalizedCorrect = question.correct_answer?.toLowerCase().trim();
      const isCorrect = normalizedAnswer === normalizedCorrect ||
        (normalizedCorrect === 'true' && ['true', 'yes', 't', 'y', '1'].includes(normalizedAnswer)) ||
        (normalizedCorrect === 'false' && ['false', 'no', 'f', 'n', '0'].includes(normalizedAnswer));
      
      return {
        is_correct: isCorrect,
        marks_awarded: isCorrect ? question.marks : 0,
        auto_graded: true,
        needs_manual_grading: false,
        needs_review: false,
        confidence: 1.0
      };
    }

    // Short answer - fuzzy matching
    if (question.question_type === 'short_answer' && textAnswer && question.correct_answer) {
      const similarity = this.calculateStringSimilarity(
        textAnswer.toLowerCase().trim(),
        question.correct_answer.toLowerCase().trim()
      );

      // Check for alternative answers if available
      let bestSimilarity = similarity;
      if (question.alternative_answers) {
        for (const alt of question.alternative_answers) {
          const altSimilarity = this.calculateStringSimilarity(
            textAnswer.toLowerCase().trim(),
            alt.toLowerCase().trim()
          );
          bestSimilarity = Math.max(bestSimilarity, altSimilarity);
        }
      }

      // High confidence match
      if (bestSimilarity > 0.9) {
        return {
          is_correct: true,
          marks_awarded: question.marks,
          auto_graded: true,
          needs_manual_grading: false,
          needs_review: false,
          confidence: bestSimilarity
        };
      }

      // Medium confidence - needs review
      if (bestSimilarity > 0.7) {
        return {
          is_correct: null,
          marks_awarded: null,
          auto_graded: false,
          needs_manual_grading: true,
          needs_review: true,
          confidence: bestSimilarity
        };
      }

      // Low confidence - likely wrong but may need review
      return {
        is_correct: false,
        marks_awarded: 0,
        auto_graded: true,
        needs_manual_grading: false,
        needs_review: true,
        confidence: bestSimilarity
      };
    }

    // Calculation - numeric comparison
    if (question.question_type === 'calculation' && textAnswer && question.correct_answer) {
      const studentNum = this.parseNumber(textAnswer);
      const correctNum = this.parseNumber(question.correct_answer);

      if (!isNaN(studentNum) && !isNaN(correctNum)) {
        // Allow configurable tolerance
        const tolerance = question.tolerance || 0.01;
        const percentageDiff = Math.abs((studentNum - correctNum) / correctNum);
        const isCorrect = percentageDiff <= tolerance;

        return {
          is_correct: isCorrect,
          marks_awarded: isCorrect ? question.marks : 0,
          auto_graded: true,
          needs_manual_grading: false,
          needs_review: !isCorrect,
          confidence: isCorrect ? 1.0 : 0.0
        };
      }
    }

    // Fill in blank - exact match with alternatives
    if (question.question_type === 'fill_in_blank' && textAnswer) {
      const normalizedAnswer = textAnswer.toLowerCase().trim();
      const correctAnswers = [
        question.correct_answer?.toLowerCase().trim(),
        ...(question.alternative_answers || []).map(a => a.toLowerCase().trim())
      ].filter(Boolean);

      const isCorrect = correctAnswers.includes(normalizedAnswer);
      
      if (isCorrect) {
        return {
          is_correct: true,
          marks_awarded: question.marks,
          auto_graded: true,
          needs_manual_grading: false,
          needs_review: false,
          confidence: 1.0
        };
      }

      // Check fuzzy match
      let bestSimilarity = 0;
      for (const correct of correctAnswers) {
        if (correct) {
          bestSimilarity = Math.max(bestSimilarity, this.calculateStringSimilarity(normalizedAnswer, correct));
        }
      }

      if (bestSimilarity > 0.85) {
        return {
          is_correct: null,
          marks_awarded: null,
          auto_graded: false,
          needs_manual_grading: true,
          needs_review: true,
          confidence: bestSimilarity
        };
      }

      return {
        is_correct: false,
        marks_awarded: 0,
        auto_graded: true,
        needs_manual_grading: false,
        needs_review: false,
        confidence: 1 - bestSimilarity
      };
    }

    // Essay, long answer - needs manual grading
    return {
      is_correct: null,
      marks_awarded: null,
      auto_graded: false,
      needs_manual_grading: true,
      needs_review: false,
      confidence: 0.0
    };
  }

  /**
   * Manual grade a specific question in an attempt
   */
  async manualGradeQuestion(
    attemptId: string,
    questionId: string,
    marksAwarded: number,
    feedback?: string,
    gradedBy?: string
  ): Promise<boolean> {
    try {
      // Fetch current grading details
      const { data: attempt, error } = await this.supabase
        .from('test_attempts')
        .select('grading_details, max_score')
        .eq('id', attemptId)
        .single();

      if (error || !attempt) {
        console.error('Error fetching attempt:', error);
        return false;
      }

      const gradingDetails: GradingDetails[] = attempt.grading_details || [];
      const detailIndex = gradingDetails.findIndex(d => d.question_id === questionId);

      if (detailIndex >= 0) {
        gradingDetails[detailIndex] = {
          ...gradingDetails[detailIndex],
          marks_awarded: marksAwarded,
          is_correct: marksAwarded > 0,
          auto_graded: false,
          needs_manual_grading: false,
          feedback,
          graded_at: new Date().toISOString(),
          graded_by: gradedBy
        };
      } else {
        gradingDetails.push({
          question_id: questionId,
          marks_awarded: marksAwarded,
          max_marks: marksAwarded,
          is_correct: marksAwarded > 0,
          auto_graded: false,
          needs_manual_grading: false,
          confidence: 1.0,
          feedback,
          graded_at: new Date().toISOString(),
          graded_by: gradedBy
        });
      }

      // Calculate new totals
      const totalScore = gradingDetails.reduce((sum, d) => sum + (d.marks_awarded || 0), 0);
      const maxScore = gradingDetails.reduce((sum, d) => sum + d.max_marks, 0);
      const needsManualCount = gradingDetails.filter(d => d.needs_manual_grading).length;
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      // Update attempt
      const updateData: any = {
        grading_details: gradingDetails,
        total_score: totalScore,
        max_score: maxScore,
        percentage,
        teacher_graded: true,
        updated_at: new Date().toISOString()
      };

      if (needsManualCount === 0) {
        updateData.status = 'graded';
        updateData.requires_manual_grading = false;
      }

      await this.supabase
        .from('test_attempts')
        .update(updateData)
        .eq('id', attemptId);

      return true;
    } catch (error) {
      console.error('Error manual grading question:', error);
      return false;
    }
  }

  /**
   * Release results for an assignment
   */
  async releaseResults(assignmentId: string, releasedBy: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('assignments')
        .update({
          results_released: true,
          results_released_at: new Date().toISOString(),
          results_released_by: releasedBy,
          show_results: 'immediately'
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error releasing results:', error);
        return false;
      }

      // Notify students (would integrate with notification service)
      await this.notifyStudentsOfResults(assignmentId);

      return true;
    } catch (error) {
      console.error('Error releasing results:', error);
      return false;
    }
  }

  /**
   * Hide results for an assignment (un-release)
   */
  async hideResults(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('assignments')
        .update({
          results_released: false,
          results_released_at: null,
          show_results: 'manual'
        })
        .eq('id', assignmentId);

      return !error;
    } catch (error) {
      console.error('Error hiding results:', error);
      return false;
    }
  }

  /**
   * Check if student can view results
   */
  async canStudentViewResults(attemptId: string, studentId: string): Promise<boolean> {
    try {
      const { data: attempt, error } = await this.supabase
        .from('test_attempts')
        .select(`
          *,
          assignment:assignments(
            show_results,
            results_released,
            due_at
          )
        `)
        .eq('id', attemptId)
        .eq('user_id', studentId)
        .single();

      if (error || !attempt) return false;

      const assignment = attempt.assignment;
      if (!assignment) return true; // Self-practice, always show

      const showResults = assignment.show_results;
      
      switch (showResults) {
        case 'immediately':
          return true;
        case 'after_submit':
          return attempt.status === 'submitted' || attempt.status === 'graded';
        case 'after_due':
          return assignment.due_at ? new Date() > new Date(assignment.due_at) : true;
        case 'manual':
          return assignment.results_released === true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking results access:', error);
      return false;
    }
  }

  /**
   * Get grading summary for a class/assignment
   */
  async getGradingSummary(assignmentId: string): Promise<any> {
    try {
      const { data: attempts, error } = await this.supabase
        .from('test_attempts')
        .select('*')
        .eq('assignment_id', assignmentId);

      if (error || !attempts) return null;

      const submitted = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
      const graded = attempts.filter(a => a.status === 'graded');
      const needsGrading = attempts.filter(a => a.requires_manual_grading);

      const scores = graded.map(a => a.percentage || 0);
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;
      const highScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowScore = scores.length > 0 ? Math.min(...scores) : 0;

      return {
        total_attempts: attempts.length,
        submitted_count: submitted.length,
        graded_count: graded.length,
        needs_grading_count: needsGrading.length,
        average_score: avgScore,
        high_score: highScore,
        low_score: lowScore,
        pass_rate: graded.length > 0 
          ? Math.round((graded.filter(a => (a.percentage || 0) >= 50).length / graded.length) * 100)
          : 0
      };
    } catch (error) {
      console.error('Error getting grading summary:', error);
      return null;
    }
  }

  // Helper: Calculate string similarity using Levenshtein distance
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Helper: Parse number from string
  private parseNumber(value: string): number {
    return parseFloat(value.replace(/[^\d.-]/g, ''));
  }

  // Helper: Notify students of released results
  private async notifyStudentsOfResults(assignmentId: string): Promise<void> {
    try {
      const { data: attempts } = await this.supabase
        .from('test_attempts')
        .select('user_id')
        .eq('assignment_id', assignmentId);

      if (!attempts) return;

      const userIds = [...new Set(attempts.map(a => a.user_id))];

      // Create notifications
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'grade_released',
        title: 'Results Released',
        message: 'Your test results are now available.',
        action_url: `/student/assessments`,
        priority: 'normal'
      }));

      if (notifications.length > 0) {
        await this.supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error notifying students:', error);
    }
  }
}

export const gradingService = new GradingService();
