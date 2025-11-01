// ============================================
// ASSESSMENT SYSTEM - TYPESCRIPT TYPES
// Complete type definitions for assessments
// ============================================

import { ExamBoard } from './exam-board';

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type AssessmentTypeCode = 
  | 'full_paper' 
  | 'topical' 
  | 'quiz' 
  | 'flashcard' 
  | 'custom_test';

export type QuestionType = 
  | 'mcq' 
  | 'short_answer' 
  | 'essay' 
  | 'calculation' 
  | 'true_false' 
  | 'fill_in_blank';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'abandoned';

export type ShowResultsOption = 'immediately' | 'after_deadline' | 'manual';

export type ConfidenceLevel = 'dont_know' | 'need_practice' | 'got_it' | 'mastered';

export type ExamSeries = 'May/June' | 'Oct/Nov' | 'Feb/March';

// ============================================
// CORE TYPES
// ============================================

export interface AssessmentType {
  id: string;
  code: AssessmentTypeCode;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  subject_id: string;
  topic_id: string | null;
  exam_board_id: string | null;
  
  // Question content
  stem_markdown: string;
  question_type: QuestionType;
  difficulty: Difficulty | null;
  marks: number;
  estimated_time_minutes: number | null;
  
  // Answers and explanations
  correct_answer: string | null;
  explanation: string | null;
  mark_scheme: string | null;
  examiner_comments: string | null;
  
  // Metadata
  keywords: string[] | null;
  image_url: string | null;
  status: string;
  
  // Relations (populated)
  choices?: QuestionChoice[];
  subject?: any;
  topic?: any;
  exam_board?: ExamBoard;
  
  created_at: string;
  updated_at: string;
}

export interface QuestionChoice {
  id: string;
  question_id: string;
  choice_text: string;
  is_correct: boolean;
  choice_order: number;
  explanation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  assessment_type_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  
  // Relationships
  subject_id: string | null;
  exam_board_id: string | null;
  topic_id: string | null;
  
  // Configuration
  duration_minutes: number | null;
  total_marks: number | null;
  passing_marks: number | null;
  
  // Past paper specific
  exam_year: number | null;
  exam_series: ExamSeries | null;
  paper_variant: string | null;
  paper_file_url: string | null;
  mark_scheme_url: string | null;
  examiner_report_url: string | null;
  
  // Custom test specific
  created_by: string | null;
  is_template: boolean;
  randomize_questions: boolean;
  randomize_answers: boolean;
  calculator_allowed: boolean;
  max_attempts: number;
  show_results: ShowResultsOption;
  
  // Status
  is_published: boolean;
  published_at: string | null;
  archived_at: string | null;
  
  // Relations (populated)
  assessment_type?: AssessmentType;
  subject?: any;
  exam_board?: ExamBoard;
  topic?: any;
  questions?: AssessmentQuestion[];
  creator?: any;
  
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_id: string;
  
  // Organization
  question_order: number;
  section_name: string | null;
  section_instructions: string | null;
  
  // Custom overrides
  custom_question_text: string | null;
  custom_marks: number | null;
  custom_mark_scheme: string | null;
  
  // Relations (populated)
  question?: Question;
  
  created_at: string;
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  user_id: string;
  
  // Timing
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  
  // Scoring
  score: number | null;
  percentage: number | null;
  max_score: number | null;
  
  // Status
  status: AttemptStatus;
  attempt_number: number;
  
  // Metadata
  ip_address: string | null;
  user_agent: string | null;
  
  // Relations (populated)
  assessment?: Assessment;
  user?: any;
  answers?: AssessmentAnswer[];
  
  created_at: string;
  updated_at: string;
}

export interface AssessmentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  
  // Answer data
  answer_text: string | null;
  selected_choice_id: string | null;
  answer_file_url: string | null;
  
  // Scoring
  is_correct: boolean | null;
  marks_awarded: number | null;
  max_marks: number | null;
  
  // Teacher feedback
  teacher_feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  
  // Metadata
  flagged_for_review: boolean;
  time_spent_seconds: number | null;
  
  // Relations (populated)
  question?: Question;
  selected_choice?: QuestionChoice;
  grader?: any;
  
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  question_id: string;
  
  confidence_level: ConfidenceLevel;
  review_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  
  // Relations (populated)
  question?: Question;
  
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  subject_id: string | null;
  exam_board_id: string | null;
  teacher_id: string;
  class_code: string;
  academic_year: string | null;
  is_active: boolean;
  
  // Relations (populated)
  subject?: any;
  exam_board?: ExamBoard;
  teacher?: any;
  students?: ClassStudent[];
  
  created_at: string;
  updated_at: string;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  
  // Relations (populated)
  class?: Class;
  student?: any;
}

export interface AssessmentAssignment {
  id: string;
  assessment_id: string;
  class_id: string | null;
  student_id: string | null;
  
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  available_from: string;
  
  // Display settings
  show_results: ShowResultsOption;
  results_released_at: string | null;
  
  // Notifications
  notify_students: boolean;
  notification_sent_at: string | null;
  
  // Relations (populated)
  assessment?: Assessment;
  class?: Class;
  student?: any;
  assigner?: any;
  
  created_at: string;
}

export interface TopicMastery {
  id: string;
  user_id: string;
  topic_id: string;
  
  questions_attempted: number;
  questions_correct: number;
  mastery_percentage: number;
  weak_areas: any | null;
  
  last_practiced_at: string | null;
  updated_at: string;
  
  // Relations (populated)
  topic?: any;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateAssessmentRequest {
  assessment_type_code: AssessmentTypeCode;
  title: string;
  description?: string;
  instructions?: string;
  subject_id?: string;
  exam_board_id?: string;
  topic_id?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_marks?: number;
  calculator_allowed?: boolean;
  max_attempts?: number;
  show_results?: ShowResultsOption;
  randomize_questions?: boolean;
  randomize_answers?: boolean;
  is_template?: boolean;
}

export interface AddQuestionToAssessmentRequest {
  assessment_id: string;
  question_id: string;
  question_order: number;
  section_name?: string;
  section_instructions?: string;
  custom_question_text?: string;
  custom_marks?: number;
}

export interface StartAssessmentRequest {
  assessment_id: string;
}

export interface StartAssessmentResponse {
  attempt_id: string;
  started_at: string;
  duration_minutes: number | null;
  questions: Question[];
}

export interface SubmitAnswerRequest {
  attempt_id: string;
  question_id: string;
  answer_text?: string;
  selected_choice_id?: string;
  answer_file_url?: string;
  time_spent_seconds?: number;
  flagged_for_review?: boolean;
}

export interface SubmitAssessmentRequest {
  attempt_id: string;
}

export interface SubmitAssessmentResponse {
  attempt_id: string;
  score: number | null;
  percentage: number | null;
  max_score: number;
  status: AttemptStatus;
  answers: AssessmentAnswer[];
}

export interface UpdateFlashcardProgressRequest {
  question_id: string;
  confidence_level: ConfidenceLevel;
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  subject_id?: string;
  exam_board_id?: string;
  academic_year?: string;
}

export interface AssignAssessmentRequest {
  assessment_id: string;
  class_id?: string;
  student_id?: string;
  due_date?: string;
  available_from?: string;
  show_results?: ShowResultsOption;
  notify_students?: boolean;
}

export interface GradeAnswerRequest {
  answer_id: string;
  marks_awarded: number;
  teacher_feedback?: string;
  is_correct?: boolean;
}

// ============================================
// FILTER & QUERY TYPES
// ============================================

export interface AssessmentFilters {
  assessment_type?: AssessmentTypeCode;
  subject_id?: string;
  exam_board_id?: string;
  topic_id?: string;
  exam_year?: number;
  exam_series?: ExamSeries;
  is_published?: boolean;
  created_by?: string;
}

export interface QuestionFilters {
  subject_id?: string;
  topic_id?: string;
  exam_board_id?: string;
  difficulty?: Difficulty;
  question_type?: QuestionType;
  keywords?: string[];
  search?: string;
}

export interface AttemptFilters {
  user_id?: string;
  assessment_id?: string;
  status?: AttemptStatus;
  from_date?: string;
  to_date?: string;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface AssessmentCardProps {
  assessment: Assessment;
  onStart?: () => void;
  showDetails?: boolean;
  className?: string;
}

export interface TestInterfaceProps {
  attempt: AssessmentAttempt;
  questions: Question[];
  onSubmitAnswer: (answer: SubmitAnswerRequest) => Promise<void>;
  onSubmitAssessment: () => Promise<void>;
  onAutoSave: () => void;
}

export interface TimerProps {
  durationMinutes: number;
  startedAt: string;
  onExpire: () => void;
  onWarning?: (minutesRemaining: number) => void;
}

export interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Map<string, AssessmentAnswer>;
  onNavigate: (index: number) => void;
}

export interface AnswerInputProps {
  question: Question;
  value: string | null;
  selectedChoiceId: string | null;
  onChange: (value: string | null, choiceId?: string | null) => void;
  disabled?: boolean;
}

export interface ResultsViewProps {
  attempt: AssessmentAttempt;
  assessment: Assessment;
  answers: AssessmentAnswer[];
  showSolutions?: boolean;
}

export interface FlashcardViewerProps {
  questions: Question[];
  progress: Map<string, FlashcardProgress>;
  onUpdateProgress: (questionId: string, confidence: ConfidenceLevel) => Promise<void>;
  mode?: 'study' | 'random' | 'test';
}

export interface TestBuilderProps {
  onSave: (assessment: Assessment) => Promise<void>;
  initialAssessment?: Assessment;
}

export interface QuestionBankBrowserProps {
  filters: QuestionFilters;
  onSelectQuestion: (question: Question) => void;
  selectedQuestions: string[];
}

export interface GradingInterfaceProps {
  attempt: AssessmentAttempt;
  answers: AssessmentAnswer[];
  onGrade: (answerId: string, grade: GradeAnswerRequest) => Promise<void>;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface AssessmentStats {
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  average_percentage: number;
  pass_rate: number;
}

export interface TopicStats {
  topic_id: string;
  topic_name: string;
  questions_attempted: number;
  questions_correct: number;
  mastery_percentage: number;
  last_practiced: string | null;
}

export interface QuestionStats {
  question_id: string;
  times_attempted: number;
  times_correct: number;
  success_rate: number;
  average_time_seconds: number;
}

export interface ClassPerformance {
  class_id: string;
  class_name: string;
  total_students: number;
  completed_students: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
}

// ============================================
// TIMER HOOK TYPES
// ============================================

export interface UseAssessmentTimerOptions {
  durationMinutes: number;
  startedAt: string;
  onExpire: () => void;
  onWarning?: (minutesRemaining: number) => void;
  warningThresholds?: number[]; // e.g., [10, 5, 1]
}

export interface UseAssessmentTimerReturn {
  timeRemaining: number; // seconds
  isExpired: boolean;
  formattedTime: string; // "HH:MM:SS"
  percentageRemaining: number;
}

// ============================================
// AUTO-GRADING TYPES
// ============================================

export interface GradingResult {
  is_correct: boolean | null;
  marks_awarded: number | null;
  auto_graded: boolean;
  needs_manual_grading: boolean;
  needs_review: boolean;
  confidence: number; // 0-1 for fuzzy matching
}

export interface AutoGradeOptions {
  question: Question;
  answer: string | null;
  selected_choice_id: string | null;
}

// ============================================
// SPACED REPETITION TYPES
// ============================================

export interface SpacedRepetitionConfig {
  intervals: Record<ConfidenceLevel, number>; // days
  multiplier: number;
  maxInterval: number; // max days
}

export interface NextReviewCalculation {
  next_review_at: string;
  days_until_review: number;
}
