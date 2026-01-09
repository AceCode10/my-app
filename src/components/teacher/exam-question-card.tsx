'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Question {
  id: string;
  stem_md: string;
  stem_markdown?: string;
  question_type: string;
  marks: number;
  difficulty: string;
  topic_id: string;
  subject_id: string;
  options?: { label: string; text: string }[] | Record<string, string>;
  correct_answer?: any;
  examiner_comment?: string;
  topic?: { name: string } | { name: string }[] | null;
  subject?: { name: string } | { name: string }[] | null;
  // Image support for image-heavy subjects
  image_url?: string | null;
  // Full question image mode
  question_image_url?: string | null;
  use_image_question?: boolean;
}

interface ExamQuestionCardProps {
  question: Question;
  questionNumber: number;
  sectionLetter?: string;
  marks: number;
  onMarksChange: (marks: number) => void;
  onRemove: () => void;
  showAnswerKey?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
}

export function ExamQuestionCard({
  question,
  questionNumber,
  sectionLetter,
  marks,
  onMarksChange,
  onRemove,
  showAnswerKey = false,
  isDragging = false,
  dragHandleProps,
}: ExamQuestionCardProps) {
  const [expanded, setExpanded] = useState(true);
  
  const questionText = question.stem_markdown || question.stem_md || '';
  
  // Parse options for MCQ
  const options = parseOptions(question.options);
  
  // Format question number with section letter
  const formattedNumber = sectionLetter 
    ? `${sectionLetter}${questionNumber}` 
    : `${questionNumber}`;

  return (
    <div 
      className={`border rounded-lg bg-white transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : 'shadow-sm'
      }`}
    >
      {/* Question Header - Exam Style */}
      <div className="flex items-start gap-3 p-4 border-b bg-slate-50/50">
        <div 
          className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground transition-colors"
          {...dragHandleProps}
        >
          <GripVertical className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg">{formattedNumber}.</span>
              <Badge variant="outline" className="text-xs">
                {formatQuestionType(question.question_type)}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${getDifficultyColor(question.difficulty)}`}
              >
                {question.difficulty}
              </Badge>
            </div>
            
            {/* Marks - Right aligned like real exams */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Marks:</span>
              <Input
                type="number"
                value={marks}
                onChange={(e) => onMarksChange(parseInt(e.target.value) || 1)}
                className="w-16 h-8 text-center font-semibold"
                min={1}
                max={20}
              />
              <div className="w-8 h-8 border-2 border-slate-300 rounded flex items-center justify-center font-bold text-slate-400">
                [{marks}]
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Question Content - Exam Document Style */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Question Stem */}
          {questionText && (
            <div className="exam-question-content prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {questionText}
              </ReactMarkdown>
            </div>
          )}
          
          {/* Question Image for image-heavy subjects */}
          {(question.image_url || question.question_image_url) && (
            <div className="my-3">
              <img 
                src={(question.question_image_url || question.image_url)!} 
                alt="Question" 
                className="max-w-full max-h-64 rounded border object-contain"
                onError={(e) => {
                  console.error('Failed to load image:', question.question_image_url || question.image_url);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Placeholder if no text and no image */}
          {!questionText && !question.image_url && !question.question_image_url && (
            <p className="text-muted-foreground italic">[Question content not available]</p>
          )}

          {/* MCQ Options - Exam Style */}
          {(question.question_type === 'mcq' || question.question_type === 'multiple_choice' || question.question_type === 'Multiple Choice') && options.length > 0 && (
            <div className="ml-4 space-y-2">
              {options.map((option, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="font-semibold text-slate-600 min-w-[24px]">
                    {option.label || String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="flex-1">{option.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* True/False Options */}
          {question.question_type === 'tf' && (
            <div className="ml-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-600">A.</span>
                <span>True</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-600">B.</span>
                <span>False</span>
              </div>
            </div>
          )}

          {/* Answer Lines for Short/Long Answer */}
          {(question.question_type === 'short_answer' || question.question_type === 'long_answer') && (
            <div className="ml-4 mt-4 space-y-3">
              {Array.from({ length: question.question_type === 'long_answer' ? 6 : 2 }).map((_, i) => (
                <div key={i} className="border-b border-dotted border-slate-300 h-6" />
              ))}
            </div>
          )}

          {/* Numeric Answer Box */}
          {question.question_type === 'numeric' && (
            <div className="ml-4 mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Answer:</span>
              <div className="w-32 h-10 border-2 border-slate-300 rounded" />
            </div>
          )}

          {/* Answer Key (Teacher View) */}
          {showAnswerKey && question.correct_answer && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-1">Answer Key:</p>
              <p className="text-sm text-green-700">
                {formatAnswer(question.correct_answer, question.question_type)}
              </p>
              {question.examiner_comment && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-800">Examiner Notes:</p>
                  <p className="text-xs text-green-700">{question.examiner_comment}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function parseOptions(options: any): { label: string; text: string }[] {
  if (!options) return [];
  
  // Handle empty object
  if (typeof options === 'object' && Object.keys(options).length === 0) {
    return [];
  }
  
  if (Array.isArray(options)) {
    return options
      .filter(opt => opt !== null && opt !== undefined)
      .map((opt, idx) => {
        // Handle string options
        if (typeof opt === 'string') {
          return {
            label: String.fromCharCode(65 + idx),
            text: opt,
          };
        }
        // Handle object options
        return {
          label: opt.label || String.fromCharCode(65 + idx),
          text: opt.text || opt.value || (typeof opt === 'object' ? '' : String(opt)),
        };
      })
      .filter(opt => opt.text && opt.text !== '[object Object]');
  }
  
  if (typeof options === 'object') {
    return Object.entries(options)
      .filter(([_, value]) => value !== null && value !== undefined && String(value) !== '[object Object]')
      .map(([key, value]) => ({
        label: key.toUpperCase(),
        text: typeof value === 'string' ? value : (typeof value === 'object' ? '' : String(value)),
      }))
      .filter(opt => opt.text);
  }
  
  return [];
}

function formatQuestionType(type: string): string {
  const types: Record<string, string> = {
    mcq: 'Multiple Choice',
    multiple_choice: 'Multiple Choice',
    'Multiple Choice': 'Multiple Choice',
    short_answer: 'Short Answer',
    long_answer: 'Extended Response',
    numeric: 'Numerical',
    tf: 'True/False',
    fill_blank: 'Fill in the Blank',
  };
  return types[type] || type;
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'text-green-600 bg-green-50 border-green-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'hard': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

function formatAnswer(answer: any, type: string): string {
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'number') return String(answer);
  if (typeof answer === 'boolean') return answer ? 'True' : 'False';
  
  if (type === 'mcq' && answer) {
    return `Option ${answer}`;
  }
  
  if (typeof answer === 'object') {
    if (answer.value !== undefined) return String(answer.value);
    return JSON.stringify(answer);
  }
  
  return String(answer);
}
