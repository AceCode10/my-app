'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PaperQuestion } from '@/types/paper-practice';
import { ZoomIn } from 'lucide-react';

interface CleanQuestionRendererProps {
  question: PaperQuestion;
  questionNumber?: number;
  showMarks?: boolean;
  className?: string;
}

/**
 * Clean question renderer - displays questions with native HTML/CSS
 * Similar to SaveMyExams style for better readability
 */
export function CleanQuestionRenderer({
  question,
  questionNumber,
  showMarks = true,
  className
}: CleanQuestionRendererProps) {
  const [imageExpanded, setImageExpanded] = useState(false);
  
  const qNum = questionNumber ?? question.question_number;
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Question Header */}
      <div className="flex items-center gap-3">
        <Badge 
          variant="default" 
          className="bg-primary text-primary-foreground px-3 py-1.5 text-base font-bold rounded-md"
        >
          Q{qNum}
        </Badge>
        {showMarks && question.marks > 0 && (
          <Badge variant="outline" className="text-sm font-medium">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </Badge>
        )}
      </div>

      {/* Question Content */}
      <div className="space-y-4">
        {/* Question Text */}
        {question.question_text && (
          <p className="text-base leading-relaxed text-foreground">
            {formatQuestionText(question.question_text)}
          </p>
        )}

        {/* Diagram/Image - Only the diagram, not whole question */}
        {question.question_image_data && (
          <DiagramDisplay 
            imageData={question.question_image_data}
            expanded={imageExpanded}
            onToggle={() => setImageExpanded(!imageExpanded)}
          />
        )}

        {/* Legacy image_url support */}
        {question.image_url && !question.question_image_data && (
          <div className="flex justify-center my-4">
            <img 
              src={question.image_url} 
              alt="Question diagram"
              className="max-w-full h-auto max-h-64 rounded-lg border"
            />
          </div>
        )}

        {/* Table Data */}
        {question.table_data && (
          <QuestionTable tableData={question.table_data} />
        )}

        {/* MCQ Options */}
        {question.options && question.options.length > 0 && (
          <MCQOptionsDisplay options={question.options} />
        )}
      </div>
    </div>
  );
}

/**
 * Format question text - handle bold, italic, scientific notation
 */
function formatQuestionText(text: string): React.ReactNode {
  if (!text) return null;
  
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Display diagram/image with zoom capability
 */
interface DiagramDisplayProps {
  imageData: string;
  expanded: boolean;
  onToggle: () => void;
}

function DiagramDisplay({ imageData, expanded, onToggle }: DiagramDisplayProps) {
  const imageSrc = imageData.startsWith('http') 
    ? imageData 
    : `data:image/png;base64,${imageData}`;

  const openFullImage = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html>
          <head>
            <title>Diagram</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
              img { max-width: 95%; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
            </style>
          </head>
          <body>
            <img src="${imageSrc}" alt="Diagram" />
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="flex justify-center my-4">
      <div className="relative group inline-block">
        <img 
          src={imageSrc}
          alt="Question diagram"
          className={cn(
            "rounded-lg border bg-white shadow-sm transition-all cursor-pointer",
            expanded ? "max-w-full" : "max-w-md max-h-64 object-contain"
          )}
          onClick={onToggle}
        />
        <button
          onClick={(e) => { e.stopPropagation(); openFullImage(); }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open full size"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Render a table from structured data
 */
interface QuestionTableProps {
  tableData: {
    headers: string[];
    rows: string[][];
  };
}

function QuestionTable({ tableData }: QuestionTableProps) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        {tableData.headers && tableData.headers.length > 0 && (
          <thead>
            <tr className="bg-gray-100">
              {tableData.headers.map((header, i) => (
                <th 
                  key={i} 
                  className="border border-gray-300 px-3 py-2 text-left font-semibold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {tableData.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, cellIdx) => (
                <td 
                  key={cellIdx} 
                  className={cn(
                    "border border-gray-300 px-3 py-2",
                    cellIdx === 0 && "font-medium" // First column often contains labels
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Display MCQ options in a clean format
 */
interface MCQOptionsDisplayProps {
  options: Array<{ label: string; text: string; is_correct?: boolean }>;
}

function MCQOptionsDisplay({ options }: MCQOptionsDisplayProps) {
  return (
    <div className="space-y-2 mt-4">
      {options.map((option, idx) => (
        <div 
          key={idx}
          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
        >
          <span className="font-bold text-primary min-w-[24px]">
            {option.label || String.fromCharCode(65 + idx)}.
          </span>
          <span className="text-foreground">{option.text}</span>
        </div>
      ))}
    </div>
  );
}

export default CleanQuestionRenderer;
