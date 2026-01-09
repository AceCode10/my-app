// ============================================
// FULL PAPER PRACTICE - TYPESCRIPT TYPES
// Types for full paper practice sessions
// ============================================

import { ExamBoard } from './exam-board';

// ============================================
// CORE TYPES
// ============================================

export interface PastPaper {
  id: string;
  title: string;
  subject_id: string | null;
  exam_board_id: string | null;
  exam_board?: string; // Legacy field
  year: number;
  session: string | null; // May/June, Oct/Nov, Feb/March
  paper_number: string | null;
  variant: string | null;
  level: string | null;
  duration_minutes: number | null;
  total_marks: number | null;
  
  // File URLs
  paper_url: string;
  question_paper_url: string | null;
  mark_scheme_url: string | null;
  examiner_report_url: string | null;
  insert_url: string | null;
  grade_thresholds_url: string | null;
  
  // Status
  status: 'draft' | 'pending' | 'published' | 'archived';
  is_specimen: boolean;
  
  // Relations
  subject?: { id: string; name: string; slug: string };
  exam_board_rel?: ExamBoard;
  questions?: PaperQuestion[];
  question_count?: number;
  
  created_at: string;
  updated_at: string;
}

export interface PaperQuestion {
  id: string;
  paper_id: string;
  question_id: string | null; // Reference to questions table (optional)
  
  // Question ordering
  question_number: number;
  section_name: string | null; // e.g., "Section A", "Section B"
  part_label: string | null; // e.g., "a", "b", "c"
  display_order: number | null; // Numeric ordering for consistent sorting
  parent_question_id: string | null; // Reference to parent question for multi-part questions
  needs_answer: boolean; // Whether this part requires a student answer (has answer lines in paper)
  
  // Question content
  question_text: string | null;
  question_type: PaperQuestionType;
  marks: number;
  
  // Answer/marking
  correct_answer: string | null;
  mark_scheme: string | null;
  examiner_tips: string | null;
  
  // MCQ options
  options: MCQOption[] | null;
  
  // Multiple sub-inputs for questions with multiple answer fields
  sub_inputs: string[] | null; // e.g., ["Way 1", "Way 2", "Way 3", "Way 4"]
  
  // Media
  image_url: string | null;
  diagram_url: string | null;
  image_position?: 'before_text' | 'after_text' | 'inline' | null;
  
  // Full question image mode (like SaveMyExams)
  use_image_question?: boolean;
  question_image_url?: string | null;
  
  // Vision extraction fields (for questions with diagrams/images)
  has_image?: boolean;
  question_image_data?: string | null; // Base64 image data for DIAGRAM only (not whole question)
  image_metadata?: {
    page_number?: number;
    width?: number;
    height?: number;
    format?: string;
    extraction_method?: 'gpt4-vision' | 'manual';
  } | null;
  
  // Structured table data for clean HTML rendering
  table_data?: {
    headers: string[];
    rows: string[][];
  } | null;
  
  // Metadata
  difficulty: 'easy' | 'medium' | 'hard' | null;
  topic_tags: string[] | null;
  
  created_at: string;
  updated_at: string;
}

export type PaperQuestionType = 
  | 'mcq' 
  | 'short_answer' 
  | 'essay' 
  | 'calculation' 
  | 'true_false' 
  | 'structured';

export interface MCQOption {
  label: string; // A, B, C, D
  text: string;
  is_correct: boolean;
}

// ============================================
// PAPER ATTEMPT TYPES
// ============================================

export interface PaperAttempt {
  id: string;
  user_id: string;
  paper_id: string;
  assessment_id: string | null;
  
  // Timing
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  
  // Mode
  practice_mode: 'timed' | 'untimed' | 'assigned';
  
  // Scoring
  score: number | null;
  self_score: number | null;
  percentage: number | null;
  max_score: number | null;
  
  // Status
  status: 'in_progress' | 'submitted' | 'graded' | 'abandoned';
  
  // Notes
  notes: string | null;
  
  // Relations
  paper?: PastPaper;
  answers?: PaperAttemptAnswer[];
  
  created_at: string;
  updated_at: string;
}

export interface PaperAttemptAnswer {
  id: string;
  attempt_id: string;
  paper_question_id: string;
  
  // User's answer
  answer_text: string | null;
  selected_option: string | null; // For MCQ
  
  // Scoring
  marks_awarded: number | null;
  is_correct: boolean | null;
  
  // Metadata
  time_spent_seconds: number | null;
  flagged_for_review: boolean;
  
  // Relations
  question?: PaperQuestion;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// PRACTICE SESSION STATE
// ============================================

export interface PaperPracticeState {
  paper: PastPaper;
  questions: PaperQuestion[];
  attempt: PaperAttempt | null;
  answers: Map<string, PaperAttemptAnswer>;
  currentQuestionIndex: number;
  flaggedQuestions: Set<string>;
  
  // Timer state
  timeRemaining: number | null; // seconds
  isTimerRunning: boolean;
  
  // UI state
  showMarkScheme: boolean;
  isSubmitting: boolean;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface StartPaperPracticeRequest {
  paper_id: string;
  practice_mode: 'timed' | 'untimed';
}

export interface StartPaperPracticeResponse {
  attempt_id: string;
  paper: PastPaper;
  questions: PaperQuestion[];
  duration_minutes: number | null;
  started_at: string;
}

export interface SavePaperAnswerRequest {
  attempt_id: string;
  paper_question_id: string;
  answer_text?: string;
  selected_option?: string;
  time_spent_seconds?: number;
  flagged_for_review?: boolean;
}

export interface SubmitPaperAttemptRequest {
  attempt_id: string;
  self_score?: number;
  notes?: string;
}

export interface SubmitPaperAttemptResponse {
  attempt_id: string;
  score: number | null;
  percentage: number | null;
  max_score: number;
  status: string;
  answers: PaperAttemptAnswer[];
}

// ============================================
// ADMIN TYPES
// ============================================

export interface CreatePaperQuestionRequest {
  paper_id: string;
  question_number: number;
  section_name?: string;
  part_label?: string;
  question_text: string;
  question_type: PaperQuestionType;
  marks: number;
  correct_answer?: string;
  mark_scheme?: string;
  examiner_tips?: string;
  options?: MCQOption[];
  image_url?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic_tags?: string[];
}

export interface UpdatePaperQuestionRequest extends Partial<CreatePaperQuestionRequest> {
  id: string;
}

export interface BulkImportQuestionsRequest {
  paper_id: string;
  questions: Omit<CreatePaperQuestionRequest, 'paper_id'>[];
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface PaperPracticeInterfaceProps {
  paper: PastPaper;
  questions: PaperQuestion[];
  attempt: PaperAttempt;
  onSaveAnswer: (answer: SavePaperAnswerRequest) => Promise<void>;
  onSubmit: (request: SubmitPaperAttemptRequest) => Promise<void>;
  onAbandon: () => void;
}

export interface PaperQuestionDisplayProps {
  question: PaperQuestion;
  questionIndex: number;
  totalQuestions: number;
  answer: PaperAttemptAnswer | null;
  onAnswerChange: (answer: string | null, selectedOption?: string | null) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  showMarkScheme: boolean;
  disabled?: boolean;
}

export interface PaperTimerProps {
  durationMinutes: number;
  startedAt: string;
  onExpire: () => void;
  onWarning?: (minutesRemaining: number) => void;
  isPaused?: boolean;
}

export interface PaperQuestionNavigatorProps {
  questions: PaperQuestion[];
  currentIndex: number;
  answers: Map<string, PaperAttemptAnswer>;
  flaggedQuestions: Set<string>;
  onNavigate: (index: number) => void;
}

export interface PaperResultsProps {
  paper: PastPaper;
  attempt: PaperAttempt;
  questions: PaperQuestion[];
  answers: PaperAttemptAnswer[];
  showSolutions: boolean;
}

export interface PaperQuestionEditorProps {
  paper: PastPaper;
  question?: PaperQuestion;
  onSave: (question: CreatePaperQuestionRequest | UpdatePaperQuestionRequest) => Promise<void>;
  onCancel: () => void;
}

// ============================================
// FILTER TYPES
// ============================================

export interface PaperFilters {
  subject_id?: string;
  exam_board_id?: string;
  year?: number;
  session?: string;
  paper_number?: string;
  level?: string;
  status?: string;
  search?: string;
}

export interface PaperAttemptFilters {
  user_id?: string;
  paper_id?: string;
  status?: string;
  practice_mode?: string;
  from_date?: string;
  to_date?: string;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface PaperAttemptStats {
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  average_percentage: number;
  average_time_minutes: number;
  best_score: number;
  best_percentage: number;
}

export interface UserPaperProgress {
  papers_attempted: number;
  papers_completed: number;
  total_time_spent_minutes: number;
  average_percentage: number;
  by_subject: {
    subject_id: string;
    subject_name: string;
    attempts: number;
    average_percentage: number;
  }[];
}
