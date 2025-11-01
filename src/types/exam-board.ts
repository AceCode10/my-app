// ============================================
// EXAM BOARD TYPES
// TypeScript definitions for exam board system
// ============================================

export interface ExamBoard {
  id: string;
  code: 'CIE' | 'EDEXCEL' | 'AQA' | 'OCR' | 'AP';
  name: string;
  full_name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserExamBoardPreference {
  preferred_exam_board_id: string | null;
  onboarding_completed: boolean;
  show_all_exam_boards: boolean;
}

export interface ContentExamBoard {
  id: string;
  content_type: 'subject' | 'topic' | 'question' | 'paper';
  content_id: string;
  exam_board_id: string;
  created_at: string;
}

export interface ExamBoardFilter {
  exam_board_id: string | null; // null means "all boards"
  exam_board?: ExamBoard | null;
}

export interface ExamBoardContextValue {
  // Current filter state
  activeExamBoard: ExamBoard | null;
  showAllBoards: boolean;
  
  // All available exam boards
  examBoards: ExamBoard[];
  isLoading: boolean;
  
  // Actions
  setActiveExamBoard: (board: ExamBoard | null) => void;
  setShowAllBoards: (showAll: boolean) => void;
  
  // User preference (for logged-in users)
  userPreference: UserExamBoardPreference | null;
  updateUserPreference: (boardId: string | null) => Promise<void>;
}

// Props for components
export interface ExamBoardBadgeProps {
  examBoard: ExamBoard;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'subtle';
}

export interface ExamBoardSelectorProps {
  value: string | null;
  onChange: (boardId: string | null) => void;
  showAllOption?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface ExamBoardFilterProps {
  onFilterChange?: (boardId: string | null) => void;
  currentFilter?: string | null;
  variant?: 'dropdown' | 'tabs' | 'buttons';
  showCount?: boolean;
}

export interface ExamBoardOnboardingProps {
  onComplete: (boardId: string | null) => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

// Utility types
export type ExamBoardCode = ExamBoard['code'];

export interface ContentWithExamBoard {
  exam_board_id: string | null;
  exam_board?: ExamBoard | null;
  // For multi-board content
  exam_boards?: ExamBoard[];
}

// Database query filters
export interface ExamBoardQueryFilter {
  exam_board_id?: string | null;
  include_multi_board?: boolean;
}
