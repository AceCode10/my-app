'use client';

import { useState } from 'react';
import { Assessment, QuestionFilters } from '@/types/assessment';
import { AssessmentCard } from './AssessmentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssessmentListProps {
  assessments: Assessment[];
  userAttempts?: Map<string, number>;
  onStartAssessment: (assessmentId: string) => void;
  showFilters?: boolean;
  className?: string;
}

export function AssessmentList({
  assessments,
  userAttempts = new Map(),
  onStartAssessment,
  showFilters = true,
  className
}: AssessmentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'difficulty'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Extract unique values for filters
  const assessmentTypes = Array.from(new Set(assessments.map(a => a.assessment_type?.code).filter(Boolean)));
  const subjects = Array.from(new Set(assessments.map(a => a.subject?.name).filter(Boolean)));
  const examBoards = Array.from(new Set(assessments.map(a => a.exam_board?.code).filter(Boolean)));

  // Filter assessments
  const filteredAssessments = assessments.filter(assessment => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = assessment.title.toLowerCase().includes(query);
      const matchesDescription = assessment.description?.toLowerCase().includes(query);
      const matchesSubject = assessment.subject?.name.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription && !matchesSubject) return false;
    }

    // Type filter
    if (selectedType !== 'all' && assessment.assessment_type?.code !== selectedType) {
      return false;
    }

    // Subject filter
    if (selectedSubject !== 'all' && assessment.subject?.name !== selectedSubject) {
      return false;
    }

    // Exam board filter
    if (selectedExamBoard !== 'all' && assessment.exam_board?.code !== selectedExamBoard) {
      return false;
    }

    return true;
  });

  // Sort assessments
  const sortedAssessments = [...filteredAssessments].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'difficulty':
        // This would need a difficulty field on assessments
        comparison = 0;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Group by type
  const groupedAssessments = sortedAssessments.reduce((acc, assessment) => {
    const type = assessment.assessment_type?.code || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(assessment);
    return acc;
  }, {} as Record<string, Assessment[]>);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assessmentTypes.map(type => (
                  <SelectItem key={type} value={type!}>
                    {type?.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject Filter */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject!}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Exam Board Filter */}
            <Select value={selectedExamBoard} onValueChange={setSelectedExamBoard}>
              <SelectTrigger>
                <SelectValue placeholder="All Exam Boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exam Boards</SelectItem>
                {examBoards.map(board => (
                  <SelectItem key={board} value={board!}>
                    {board}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="difficulty">Difficulty</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortOrder}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchQuery || selectedType !== 'all' || selectedSubject !== 'all' || selectedExamBoard !== 'all') && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>
                Showing {sortedAssessments.length} of {assessments.length} assessments
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedSubject('all');
                  setSelectedExamBoard('all');
                }}
                className="text-blue-600"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {sortedAssessments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500 mb-4">No assessments found</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedSubject('all');
              setSelectedExamBoard('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">
              All ({sortedAssessments.length})
            </TabsTrigger>
            <TabsTrigger value="full_paper">
              Past Papers ({groupedAssessments.full_paper?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="topical">
              Topical ({groupedAssessments.topical?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="quiz">
              Quizzes ({groupedAssessments.quiz?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="flashcard">
              Flashcards ({groupedAssessments.flashcard?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="custom_test">
              Custom ({groupedAssessments.custom_test?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedAssessments.map(assessment => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onStart={() => onStartAssessment(assessment.id)}
                  userAttempts={userAttempts.get(assessment.id) || 0}
                />
              ))}
            </div>
          </TabsContent>

          {Object.entries(groupedAssessments).map(([type, items]) => (
            <TabsContent key={type} value={type} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(assessment => (
                  <AssessmentCard
                    key={assessment.id}
                    assessment={assessment}
                    onStart={() => onStartAssessment(assessment.id)}
                    userAttempts={userAttempts.get(assessment.id) || 0}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
