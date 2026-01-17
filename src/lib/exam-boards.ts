// Centralized exam board and qualification level configuration
// Used across the app for consistency

export interface ExamBoard {
  id: string;
  name: string;
  shortName: string;
  color: string;
  description: string;
}

export interface QualificationLevel {
  id: string;
  name: string;
  description: string;
  boards: string[]; // Which exam boards offer this level
}

// Exam boards supported by IGA Prep
export const EXAM_BOARDS: ExamBoard[] = [
  { 
    id: 'cambridge', 
    name: 'Cambridge (CIE)', 
    shortName: 'CIE',
    color: 'bg-red-500',
    description: 'Cambridge Assessment International Education'
  },
  { 
    id: 'ib', 
    name: 'IB', 
    shortName: 'IB',
    color: 'bg-blue-600',
    description: 'International Baccalaureate'
  },
  { 
    id: 'edexcel', 
    name: 'Edexcel', 
    shortName: 'Edexcel',
    color: 'bg-purple-500',
    description: 'Pearson Edexcel'
  },
  { 
    id: 'ocr', 
    name: 'OCR', 
    shortName: 'OCR',
    color: 'bg-green-500',
    description: 'Oxford Cambridge and RSA'
  },
  { 
    id: 'aqa', 
    name: 'AQA', 
    shortName: 'AQA',
    color: 'bg-orange-500',
    description: 'Assessment and Qualifications Alliance'
  },
  { 
    id: 'ap', 
    name: 'AP', 
    shortName: 'AP',
    color: 'bg-indigo-500',
    description: 'Advanced Placement (College Board)'
  },
];

// Qualification levels with their associated exam boards
export const QUALIFICATION_LEVELS: QualificationLevel[] = [
  { 
    id: 'gcse', 
    name: 'GCSE', 
    description: 'UK National Curriculum',
    boards: ['edexcel', 'ocr', 'aqa']
  },
  { 
    id: 'igcse', 
    name: 'IGCSE', 
    description: 'International GCSE',
    boards: ['cambridge', 'edexcel']
  },
  { 
    id: 'as', 
    name: 'AS Level', 
    description: 'Advanced Subsidiary',
    boards: ['cambridge', 'edexcel', 'ocr', 'aqa']
  },
  { 
    id: 'a2', 
    name: 'A Level', 
    description: 'Advanced Level',
    boards: ['cambridge', 'edexcel', 'ocr', 'aqa']
  },
  { 
    id: 'ib-myp', 
    name: 'IB MYP', 
    description: 'Middle Years Programme',
    boards: ['ib']
  },
  { 
    id: 'ib-dp', 
    name: 'IB DP', 
    description: 'Diploma Programme',
    boards: ['ib']
  },
  { 
    id: 'ap', 
    name: 'AP', 
    description: 'Advanced Placement',
    boards: ['ap']
  },
];

// Helper functions
export function getExamBoardById(id: string): ExamBoard | undefined {
  return EXAM_BOARDS.find(board => board.id === id);
}

export function getLevelById(id: string): QualificationLevel | undefined {
  return QUALIFICATION_LEVELS.find(level => level.id === id);
}

export function getLevelsForBoard(boardId: string): QualificationLevel[] {
  return QUALIFICATION_LEVELS.filter(level => level.boards.includes(boardId));
}

export function getBoardsForLevel(levelId: string): ExamBoard[] {
  const level = getLevelById(levelId);
  if (!level) return [];
  return EXAM_BOARDS.filter(board => level.boards.includes(board.id));
}

// For dropdown/select options
export function getExamBoardOptions() {
  return EXAM_BOARDS.map(board => ({
    value: board.id,
    label: board.name,
    shortLabel: board.shortName,
  }));
}

export function getLevelOptions(boardId?: string) {
  const levels = boardId ? getLevelsForBoard(boardId) : QUALIFICATION_LEVELS;
  return levels.map(level => ({
    value: level.id,
    label: level.name,
    description: level.description,
  }));
}
