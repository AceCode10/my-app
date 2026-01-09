'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp,
  Plus
} from 'lucide-react';
import type { Question, AssessmentQuestion } from '@/types/assessment';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TestComposerProps {
  questions: (AssessmentQuestion & { question: Question })[];
  onReorder: (questions: (AssessmentQuestion & { question: Question })[]) => void;
  onRemove: (questionId: string) => void;
  onEditMarks: (questionId: string, marks: number) => void;
  onAddSection: () => void;
}

export function TestComposer({
  questions,
  onReorder,
  onRemove,
  onEditMarks,
  onAddSection
}: TestComposerProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
        ...q,
        question_order: idx + 1
      }));

      onReorder(reordered);
    }
  };

  const toggleExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const totalMarks = questions.reduce((sum, q) => {
    return sum + (q.custom_marks || q.question?.marks || 0);
  }, 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Test Questions</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{questions.length} questions</Badge>
            <Badge variant="secondary">{totalMarks} marks</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {questions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <p className="text-muted-foreground mb-4">No questions added yet</p>
              <p className="text-sm text-muted-foreground">
                Browse the question bank and add questions to your test
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map(q => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {questions.map((aq, index) => (
                    <SortableQuestionItem
                      key={aq.id}
                      assessmentQuestion={aq}
                      index={index}
                      isExpanded={expandedQuestions.has(aq.id)}
                      onToggleExpand={() => toggleExpanded(aq.id)}
                      onRemove={() => onRemove(aq.id)}
                      onEditMarks={(marks) => onEditMarks(aq.id, marks)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        )}

        {/* Add Section Button */}
        <div className="pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={onAddSection} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableQuestionItem({
  assessmentQuestion,
  index,
  isExpanded,
  onToggleExpand,
  onRemove,
  onEditMarks
}: {
  assessmentQuestion: AssessmentQuestion & { question: Question };
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onEditMarks: (marks: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assessmentQuestion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editingMarks, setEditingMarks] = useState(false);
  const [marksValue, setMarksValue] = useState(
    assessmentQuestion.custom_marks || assessmentQuestion.question?.marks || 0
  );

  const handleSaveMarks = () => {
    onEditMarks(marksValue);
    setEditingMarks(false);
  };

  const question = assessmentQuestion.question;
  const marks = assessmentQuestion.custom_marks || question?.marks || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg",
        isDragging && "opacity-50"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Question Number */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>

          {/* Question Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">
              {question?.stem_markdown}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <Badge variant="outline">
                {question?.question_type}
              </Badge>
              {question?.difficulty && (
                <Badge variant="secondary">
                  {question.difficulty}
                </Badge>
              )}
              {editingMarks ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={marksValue}
                    onChange={(e) => setMarksValue(parseInt(e.target.value) || 0)}
                    className="h-6 w-16 text-xs"
                    min={0}
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveMarks}>
                    Save
                  </Button>
                </div>
              ) : (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setEditingMarks(true)}
                >
                  {marks} {marks === 1 ? 'mark' : 'marks'}
                  <Edit className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {question?.topic && (
                <span className="text-muted-foreground">
                  {question.topic.name}
                </span>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t space-y-2">
                {question?.choices && question.choices.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Choices:</p>
                    <ul className="text-xs space-y-1">
                      {question.choices.map((choice, idx) => (
                        <li key={idx} className={cn(
                          "pl-2",
                          choice.is_correct && "text-green-600 font-medium"
                        )}>
                          {choice.choice_text}
                          {choice.is_correct && " ✓"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {question?.explanation && (
                  <div>
                    <p className="text-xs font-medium mb-1">Explanation:</p>
                    <p className="text-xs text-muted-foreground">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
