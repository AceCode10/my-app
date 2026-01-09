/**
 * PDF Question Extractor
 * 
 * This module provides utilities for extracting questions from PDF files.
 * It supports both topical questions and past paper questions.
 * 
 * For automated extraction, you can use:
 * 1. Local Python script with pdf-parse library
 * 2. AI-powered extraction using OpenAI/Claude API
 * 3. Manual JSON import
 */

export interface ExtractedQuestion {
  question_number: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer' | 'structured' | 'essay' | 'true_false' | 'numeric';
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  correct_answer?: string;
  mark_scheme?: string;
  examiner_tips?: string;
  options?: MCQOption[];
  part_label?: string;
  section_name?: string;
  image_url?: string;
  topic_tags?: string[];
}

export interface MCQOption {
  label: string;
  text: string;
  is_correct: boolean;
}

export interface PDFImportConfig {
  subject_id: string;
  topic_id?: string;  // For topical questions
  paper_id?: string;  // For paper questions
  exam_board_id: string;
  level?: string;
  source_file_name: string;
  import_type: 'topical' | 'paper';
}

export interface ImportResult {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors: string[];
  questions: ExtractedQuestion[];
}

/**
 * Parse structured JSON from various formats
 * Supports common question formats from different sources
 */
export function parseQuestionJSON(jsonString: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  
  try {
    const data = JSON.parse(jsonString);
    const items = Array.isArray(data) ? data : data.questions || [data];
    
    for (const item of items) {
      const question = normalizeQuestion(item);
      if (question) {
        questions.push(question);
      }
    }
  } catch (error) {
    console.error('Error parsing question JSON:', error);
    throw new Error('Invalid JSON format');
  }
  
  return questions;
}

/**
 * Normalize question from various formats to standard format
 */
function normalizeQuestion(item: any): ExtractedQuestion | null {
  if (!item) return null;
  
  // Extract question text from various field names
  const questionText = 
    item.question_text ||
    item.question ||
    item.stem_md ||
    item.stem_markdown ||
    item.text ||
    item.prompt ||
    item.content;
  
  if (!questionText) return null;
  
  // Determine question type
  let questionType: ExtractedQuestion['question_type'] = 'short_answer';
  const typeField = (item.question_type || item.type || '').toLowerCase();
  
  if (typeField.includes('mcq') || typeField.includes('multiple') || item.options) {
    questionType = 'mcq';
  } else if (typeField.includes('essay') || typeField.includes('extended')) {
    questionType = 'essay';
  } else if (typeField.includes('struct')) {
    questionType = 'structured';
  } else if (typeField.includes('true') || typeField.includes('tf')) {
    questionType = 'true_false';
  } else if (typeField.includes('numeric') || typeField.includes('calculation')) {
    questionType = 'numeric';
  }
  
  // Extract answer from various field names
  const answer = 
    item.correct_answer ||
    item.answer ||
    item.model_answer ||
    item.solution;
  
  // Process MCQ options
  let options: MCQOption[] | undefined;
  if (item.options && Array.isArray(item.options)) {
    options = item.options.map((opt: any, idx: number) => {
      if (typeof opt === 'string') {
        return {
          label: String.fromCharCode(65 + idx),
          text: opt,
          is_correct: answer === String.fromCharCode(65 + idx)
        };
      }
      return {
        label: opt.label || String.fromCharCode(65 + idx),
        text: opt.text || opt.content || String(opt),
        is_correct: opt.is_correct || opt.correct || answer === opt.label
      };
    });
  }
  
  return {
    question_number: String(item.question_number || item.number || item.q_num || ''),
    question_text: questionText,
    question_type: questionType,
    marks: parseInt(item.marks || item.mark || item.points || '1') || 1,
    difficulty: normalizeDifficulty(item.difficulty || item.level),
    correct_answer: typeof answer === 'object' ? JSON.stringify(answer) : String(answer || ''),
    mark_scheme: item.mark_scheme || item.marking_scheme || item.markscheme || '',
    examiner_tips: item.examiner_tips || item.examiner_comment || item.tips || '',
    options,
    part_label: item.part_label || item.part || '',
    section_name: item.section_name || item.section || '',
    topic_tags: item.topic_tags || item.tags || item.topics || []
  };
}

function normalizeDifficulty(value: any): 'easy' | 'medium' | 'hard' | undefined {
  if (!value) return undefined;
  const v = String(value).toLowerCase();
  if (v.includes('easy') || v === '1') return 'easy';
  if (v.includes('hard') || v.includes('difficult') || v === '3') return 'hard';
  return 'medium';
}

/**
 * Format questions for bulk import to Supabase
 */
export function formatForTopicalImport(
  questions: ExtractedQuestion[],
  config: PDFImportConfig
): Record<string, any>[] {
  return questions.map((q, index) => ({
    topic_id: config.topic_id,
    subject_id: config.subject_id,
    exam_board_id: config.exam_board_id,
    level: config.level,
    stem_md: q.question_text,
    question_type: q.question_type === 'mcq' ? 'mcq' : q.question_type,
    difficulty: q.difficulty || 'medium',
    marks: q.marks,
    correct_answer: JSON.stringify(q.correct_answer || ''),
    options: q.options || null,
    explanation: q.mark_scheme || null,
    examiner_comment: q.examiner_tips || 'N/A',
    question_number: q.question_number || String(index + 1),
    visibility: 'published',
    source_file: config.source_file_name
  }));
}

/**
 * Format questions for paper questions import
 */
export function formatForPaperImport(
  questions: ExtractedQuestion[],
  config: PDFImportConfig
): Record<string, any>[] {
  return questions.map((q, index) => ({
    paper_id: config.paper_id,
    question_number: parseInt(q.question_number) || index + 1,
    section_name: q.section_name || null,
    part_label: q.part_label || null,
    question_text: q.question_text,
    question_type: q.question_type,
    marks: q.marks,
    correct_answer: q.correct_answer || null,
    mark_scheme: q.mark_scheme || null,
    examiner_tips: q.examiner_tips || null,
    options: q.options ? JSON.stringify(q.options) : null,
    difficulty: q.difficulty || 'medium'
  }));
}

/**
 * Validate extracted questions before import
 */
export function validateQuestions(questions: ExtractedQuestion[]): {
  valid: ExtractedQuestion[];
  invalid: { question: ExtractedQuestion; error: string }[];
} {
  const valid: ExtractedQuestion[] = [];
  const invalid: { question: ExtractedQuestion; error: string }[] = [];
  
  for (const q of questions) {
    const errors: string[] = [];
    
    if (!q.question_text || q.question_text.trim().length < 10) {
      errors.push('Question text is too short or missing');
    }
    
    if (q.marks < 1 || q.marks > 50) {
      errors.push('Marks must be between 1 and 50');
    }
    
    if (q.question_type === 'mcq' && (!q.options || q.options.length < 2)) {
      errors.push('MCQ questions must have at least 2 options');
    }
    
    if (errors.length > 0) {
      invalid.push({ question: q, error: errors.join('; ') });
    } else {
      valid.push(q);
    }
  }
  
  return { valid, invalid };
}

/**
 * Sample JSON template for question import
 */
export const QUESTION_IMPORT_TEMPLATE = `[
  {
    "question_number": "1",
    "question_text": "What is the chemical formula for water?",
    "question_type": "short_answer",
    "marks": 2,
    "difficulty": "easy",
    "correct_answer": "H2O",
    "mark_scheme": "Award 1 mark for correct formula. Accept H₂O.",
    "examiner_tips": "Students often confuse with hydrogen peroxide (H2O2)."
  },
  {
    "question_number": "2",
    "question_text": "Which of the following is a noble gas?",
    "question_type": "mcq",
    "marks": 1,
    "difficulty": "medium",
    "options": [
      { "label": "A", "text": "Oxygen", "is_correct": false },
      { "label": "B", "text": "Argon", "is_correct": true },
      { "label": "C", "text": "Nitrogen", "is_correct": false },
      { "label": "D", "text": "Carbon", "is_correct": false }
    ],
    "correct_answer": "B",
    "mark_scheme": "B - Argon is a noble gas (Group 18)."
  },
  {
    "question_number": "3a",
    "question_text": "Describe the process of photosynthesis.",
    "question_type": "structured",
    "marks": 4,
    "difficulty": "medium",
    "section_name": "Section B",
    "part_label": "a",
    "correct_answer": "Photosynthesis is the process by which plants convert light energy, carbon dioxide, and water into glucose and oxygen.",
    "mark_scheme": "1 mark: Light energy mentioned\\n1 mark: CO2 and H2O as inputs\\n1 mark: Glucose as product\\n1 mark: Oxygen as product"
  }
]`;

/**
 * Parse text extracted from PDF into questions
 * This is a heuristic-based parser for common exam paper formats
 */
export function parseExamPaperText(text: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  
  // Common patterns for question detection
  const questionPattern = /(?:^|\n)\s*(\d+)\s*[.)]\s*([^\n]+(?:\n(?!\s*\d+\s*[.)]).*)*)/g;
  const marksPattern = /\[(\d+)\s*(?:marks?|pts?|points?)?\]/i;
  const mcqOptionPattern = /^([A-D])\s*[.)]\s*(.+)$/gm;
  
  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    const questionNumber = match[1];
    let questionText = match[2].trim();
    
    // Extract marks if present
    const marksMatch = questionText.match(marksPattern);
    const marks = marksMatch ? parseInt(marksMatch[1]) : 1;
    if (marksMatch) {
      questionText = questionText.replace(marksPattern, '').trim();
    }
    
    // Check for MCQ options
    const options: MCQOption[] = [];
    let optionMatch;
    const textWithoutOptions = questionText.replace(mcqOptionPattern, (full, label, text) => {
      options.push({ label, text: text.trim(), is_correct: false });
      return '';
    });
    
    const questionType = options.length >= 2 ? 'mcq' : 'short_answer';
    
    questions.push({
      question_number: questionNumber,
      question_text: options.length >= 2 ? textWithoutOptions.trim() : questionText,
      question_type: questionType,
      marks,
      options: options.length >= 2 ? options : undefined
    });
  }
  
  return questions;
}
