// ============================================
// ASSESSMENT UTILITY FUNCTIONS
// Helper functions for assessment operations
// ============================================

import { createClient } from '@/lib/supabase/client';
import {
  Question,
  QuestionFilters,
  GradingResult,
  AutoGradeOptions,
  ConfidenceLevel,
  NextReviewCalculation,
  SpacedRepetitionConfig
} from '@/types/assessment';

// ============================================
// QUESTION SELECTION & FILTERING
// ============================================

/**
 * Get questions with filters
 */
export async function getQuestions(filters: QuestionFilters) {
  const supabase = createClient();
  
  let query = supabase
    .from('questions')
    .select(`
      *,
      subject:subjects(*),
      topic:topics(*),
      exam_board:exam_boards(*),
      choices:question_choices(*)
    `)
    .eq('status', 'published');

  if (filters.subject_id) {
    query = query.eq('subject_id', filters.subject_id);
  }

  if (filters.topic_id) {
    query = query.eq('topic_id', filters.topic_id);
  }

  if (filters.exam_board_id) {
    query = query.eq('exam_board_id', filters.exam_board_id);
  }

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.question_type) {
    query = query.eq('question_type', filters.question_type);
  }

  if (filters.keywords && filters.keywords.length > 0) {
    query = query.overlaps('keywords', filters.keywords);
  }

  if (filters.search) {
    query = query.or(`stem_markdown.ilike.%${filters.search}%,keywords.cs.{${filters.search}}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data as Question[];
}

/**
 * Select random questions for quiz/topical practice
 */
export async function selectRandomQuestions(params: {
  topicId?: string;
  subjectId?: string;
  examBoardId?: string;
  difficulty?: string;
  count: number;
  excludeAttempted?: boolean;
  userId?: string;
}): Promise<Question[]> {
  const supabase = createClient();

  let query = supabase
    .from('questions')
    .select(`
      *,
      choices:question_choices(*)
    `)
    .eq('status', 'published');

  if (params.topicId) {
    query = query.eq('topic_id', params.topicId);
  }

  if (params.subjectId) {
    query = query.eq('subject_id', params.subjectId);
  }

  if (params.examBoardId) {
    query = query.eq('exam_board_id', params.examBoardId);
  }

  if (params.difficulty) {
    query = query.eq('difficulty', params.difficulty);
  }

  // Get more than needed, then shuffle and slice
  const { data, error } = await query.limit(params.count * 3);

  if (error || !data) {
    console.error('Error selecting questions:', error);
    return [];
  }

  // Shuffle and return requested count
  const shuffled = shuffleArray(data);
  return shuffled.slice(0, params.count);
}

/**
 * Select adaptive questions based on user's weak areas
 */
export async function selectAdaptiveQuestions(params: {
  userId: string;
  topicId: string;
  count: number;
}): Promise<Question[]> {
  const supabase = createClient();

  // Get user's topic mastery to identify weak areas
  const { data: mastery } = await supabase
    .from('topic_mastery')
    .select('weak_areas')
    .eq('user_id', params.userId)
    .eq('topic_id', params.topicId)
    .single();

  // Get questions, prioritizing weak areas
  let query = supabase
    .from('questions')
    .select(`
      *,
      choices:question_choices(*)
    `)
    .eq('topic_id', params.topicId)
    .eq('status', 'published');

  // If we have weak areas, prioritize those
  if (mastery?.weak_areas) {
    // Implementation depends on how weak_areas is structured
    // For now, just get random questions
  }

  const { data, error } = await query.limit(params.count * 2);

  if (error || !data) {
    return [];
  }

  return shuffleArray(data).slice(0, params.count);
}

// ============================================
// AUTO-GRADING SYSTEM
// ============================================

/**
 * Auto-grade a student's answer
 */
export function autoGradeAnswer({
  question,
  answer,
  selected_choice_id
}: AutoGradeOptions): GradingResult {
  // MCQ - exact match
  if (question.question_type === 'mcq' && selected_choice_id) {
    const correctChoice = question.choices?.find(c => c.is_correct);
    const isCorrect = selected_choice_id === correctChoice?.id;
    
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
  if (question.question_type === 'true_false' && answer) {
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedCorrect = question.correct_answer?.toLowerCase().trim();
    const isCorrect = normalizedAnswer === normalizedCorrect;
    
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
  if (question.question_type === 'short_answer' && answer && question.correct_answer) {
    const similarity = calculateStringSimilarity(
      answer.toLowerCase().trim(),
      question.correct_answer.toLowerCase().trim()
    );

    // High confidence match
    if (similarity > 0.9) {
      return {
        is_correct: true,
        marks_awarded: question.marks,
        auto_graded: true,
        needs_manual_grading: false,
        needs_review: false,
        confidence: similarity
      };
    }

    // Medium confidence - needs review
    if (similarity > 0.7) {
      return {
        is_correct: null,
        marks_awarded: null,
        auto_graded: false,
        needs_manual_grading: true,
        needs_review: true,
        confidence: similarity
      };
    }

    // Low confidence - likely wrong
    return {
      is_correct: false,
      marks_awarded: 0,
      auto_graded: true,
      needs_manual_grading: false,
      needs_review: true,
      confidence: similarity
    };
  }

  // Calculation - try numeric comparison
  if (question.question_type === 'calculation' && answer && question.correct_answer) {
    const studentNum = parseFloat(answer.replace(/[^\d.-]/g, ''));
    const correctNum = parseFloat(question.correct_answer.replace(/[^\d.-]/g, ''));

    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      // Allow small tolerance for rounding
      const tolerance = 0.01;
      const isCorrect = Math.abs(studentNum - correctNum) <= tolerance;

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

  // Essay, fill-in-blank, or anything else - needs manual grading
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
 * Calculate string similarity (Levenshtein distance)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
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

// ============================================
// SPACED REPETITION (Flashcards)
// ============================================

const DEFAULT_SR_CONFIG: SpacedRepetitionConfig = {
  intervals: {
    dont_know: 1,
    need_practice: 3,
    got_it: 7,
    mastered: 30
  },
  multiplier: 1.5,
  maxInterval: 365 // 1 year max
};

/**
 * Calculate next review date for flashcard
 */
export function calculateNextReview(
  confidence: ConfidenceLevel,
  reviewCount: number,
  config: SpacedRepetitionConfig = DEFAULT_SR_CONFIG
): NextReviewCalculation {
  const baseInterval = config.intervals[confidence];
  const adjustedInterval = Math.min(
    baseInterval * Math.pow(config.multiplier, reviewCount),
    config.maxInterval
  );

  const daysUntilReview = Math.ceil(adjustedInterval);
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

  return {
    next_review_at: nextReviewDate.toISOString(),
    days_until_review: daysUntilReview
  };
}

/**
 * Get flashcards due for review
 */
export async function getFlashcardsDueForReview(userId: string, topicId?: string) {
  const supabase = createClient();

  let query = supabase
    .from('flashcard_progress')
    .select(`
      *,
      question:questions(
        *,
        choices:question_choices(*)
      )
    `)
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true });

  if (topicId) {
    query = query.eq('question.topic_id', topicId);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    console.error('Error fetching flashcards:', error);
    return [];
  }

  return data;
}

// ============================================
// ASSESSMENT STATISTICS
// ============================================

/**
 * Calculate assessment statistics
 */
export async function getAssessmentStats(assessmentId: string) {
  const supabase = createClient();

  const { data: attempts, error } = await supabase
    .from('assessment_attempts')
    .select('score, percentage, status, max_score')
    .eq('assessment_id', assessmentId)
    .in('status', ['submitted', 'graded']);

  if (error || !attempts) {
    return null;
  }

  const completed = attempts.filter(a => a.status === 'graded' || a.status === 'submitted');
  const passed = completed.filter(a => a.percentage && a.percentage >= 50);

  return {
    total_attempts: attempts.length,
    completed_attempts: completed.length,
    average_score: completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length || 0,
    average_percentage: completed.reduce((sum, a) => sum + (a.percentage || 0), 0) / completed.length || 0,
    pass_rate: completed.length > 0 ? (passed.length / completed.length) * 100 : 0
  };
}

/**
 * Get user's topic mastery
 */
export async function getUserTopicMastery(userId: string, subjectId?: string) {
  const supabase = createClient();

  let query = supabase
    .from('topic_mastery')
    .select(`
      *,
      topic:topics(
        *,
        subject:subjects(*)
      )
    `)
    .eq('user_id', userId)
    .order('mastery_percentage', { ascending: false });

  if (subjectId) {
    query = query.eq('topic.subject_id', subjectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching topic mastery:', error);
    return [];
  }

  return data;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Calculate estimated time for questions
 */
export function calculateEstimatedTime(questions: Question[]): number {
  return questions.reduce((total, q) => {
    return total + (q.estimated_time_minutes || q.marks * 1.5);
  }, 0);
}

/**
 * Validate assessment attempt is still valid
 */
export function isAttemptValid(startedAt: string, durationMinutes: number): boolean {
  const startTime = new Date(startedAt).getTime();
  const endTime = startTime + (durationMinutes * 60 * 1000);
  const now = Date.now();
  return now < endTime;
}

/**
 * Generate unique class code
 */
export function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Parse exam series from string
 */
export function parseExamSeries(series: string): string {
  const normalized = series.toLowerCase().trim();
  if (normalized.includes('may') || normalized.includes('june')) {
    return 'May/June';
  }
  if (normalized.includes('oct') || normalized.includes('nov')) {
    return 'Oct/Nov';
  }
  if (normalized.includes('feb') || normalized.includes('march')) {
    return 'Feb/March';
  }
  return series;
}

/**
 * Get question type display name
 */
export function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mcq: 'Multiple Choice',
    short_answer: 'Short Answer',
    essay: 'Essay',
    calculation: 'Calculation',
    true_false: 'True/False',
    fill_in_blank: 'Fill in the Blank'
  };
  return labels[type] || type;
}

/**
 * Get difficulty color
 */
export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    easy: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    hard: 'text-red-600 bg-red-50 border-red-200'
  };
  return colors[difficulty] || 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Calculate grade letter from percentage
 */
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A*';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'U';
}
