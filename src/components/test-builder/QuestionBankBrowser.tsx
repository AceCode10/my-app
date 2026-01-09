'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Filter, ChevronRight } from 'lucide-react';
import { testBuilderService } from '@/lib/test-builder/test-builder-service';
import type { Question } from '@/types/assessment';
import { cn } from '@/lib/utils';

interface QuestionBankBrowserProps {
  onAddQuestion: (question: Question) => void;
  selectedQuestionIds?: Set<string>;
  subjectId?: string;
  examBoardId?: string;
}

export function QuestionBankBrowser({
  onAddQuestion,
  selectedQuestionIds = new Set(),
  subjectId,
  examBoardId
}: QuestionBankBrowserProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    subjectId: subjectId || '',
    topicId: '',
    questionType: '',
    difficulty: ''
  });

  const pageSize = 20;

  // Initialize subject filter when subjectId prop changes
  useEffect(() => {
    if (subjectId && !filters.subjectId) {
      setFilters(prev => ({ ...prev, subjectId }));
    }
  }, [subjectId]);

  useEffect(() => {
    loadQuestions();
  }, [page, search, filters, examBoardId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const { questions: data, total: count } = await testBuilderService.browseQuestionBank({
        subjectId: filters.subjectId || undefined,
        examBoardId,
        topicId: filters.topicId || undefined,
        questionType: filters.questionType || undefined,
        difficulty: filters.difficulty || undefined,
        search: search || undefined,
        limit: pageSize,
        offset: page * pageSize
      });

      setQuestions(data);
      setTotal(count);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question Bank</span>
          <Badge variant="secondary">{total} questions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          {/* Subject filter - show if one is set */}
          {filters.subjectId && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Filtered by test subject</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterChange('subjectId', '')}
                className="h-6 px-2 text-xs"
              >
                Show All Subjects
              </Button>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            <Select value={filters.questionType || "all"} onValueChange={(v) => handleFilterChange('questionType', v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="calculation">Calculation</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="fill_in_blank">Fill in Blank</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.difficulty || "all"} onValueChange={(v) => handleFilterChange('difficulty', v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={loadQuestions}>
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No questions found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isSelected={selectedQuestionIds.has(question.id)}
                  onAdd={() => onAddQuestion(question)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionCard({
  question,
  isSelected,
  onAdd
}: {
  question: Question;
  isSelected: boolean;
  onAdd: () => void;
}) {
  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: 'MCQ',
      short_answer: 'Short Answer',
      essay: 'Essay',
      calculation: 'Calculation',
      true_false: 'T/F',
      fill_in_blank: 'Fill Blank'
    };
    return labels[type] || type;
  };

  const getDifficultyColor = (difficulty: string | null) => {
    if (!difficulty) return 'secondary';
    const colors: Record<string, string> = {
      easy: 'bg-green-500',
      medium: 'bg-yellow-500',
      hard: 'bg-red-500'
    };
    return colors[difficulty] || 'secondary';
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isSelected && "border-primary bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Question Text */}
            <p className="text-sm font-medium line-clamp-2 mb-2">
              {question.stem_markdown}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">
                {getQuestionTypeLabel(question.question_type)}
              </Badge>
              {question.difficulty && (
                <Badge variant="secondary" className={cn("text-white", getDifficultyColor(question.difficulty))}>
                  {question.difficulty}
                </Badge>
              )}
              <Badge variant="secondary">
                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
              </Badge>
              {question.topic && (
                <span className="text-muted-foreground">
                  {question.topic.name}
                </span>
              )}
            </div>
          </div>

          {/* Add Button */}
          <Button
            size="sm"
            variant={isSelected ? "secondary" : "default"}
            onClick={onAdd}
            disabled={isSelected}
          >
            {isSelected ? (
              <>Added</>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
