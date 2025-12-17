'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, Clock, RotateCcw, Home, AlertCircle, Download, FileText, Play, Flag, BookOpen, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Question {
  id: string;
  stem_markdown: string;
  question_type: string;
  difficulty: string;
  marks: number;
  options?: { id: string; text: string }[];
  correct_answer: any;
  explanation?: string;
  examiner_comment?: string;
  question_number?: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  pdf_url?: string;
  answers_pdf_url?: string;
  estimated_time?: number;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
}

type ViewMode = 'landing' | 'practice';
type SelfAssessment = 'correct' | 'incorrect' | 'flagged' | null;

interface QuestionStatus {
  viewed: boolean;
  assessment: SelfAssessment;
  showAnswer: boolean;
}

export default function TopicPracticePage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>;
}) {
  const { subject: subjectSlug, topic: topicSlug } = use(params);
  const supabase = createClient();
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [subjectSlug, topicSlug]);

  async function fetchData() {
    try {
      setIsLoading(true);

      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .single();

      if (subjectError || !subjectData) {
        throw new Error('Subject not found');
      }
      setSubject(subjectData);

      // Fetch topic
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectData.id)
        .or(`slug.eq.${topicSlug},name.ilike.${topicSlug.replace(/-/g, ' ')}`)
        .single();

      if (topicError || !topicData) {
        throw new Error('Topic not found');
      }
      setTopic(topicData);

      // Fetch questions for this topic
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('topic_id', topicData.id)
        .order('created_at', { ascending: true });

      if (questionsError) {
        throw questionsError;
      }

      setQuestions(questionsData || []);
      
      // Initialize question statuses
      const statuses: Record<string, QuestionStatus> = {};
      (questionsData || []).forEach(q => {
        statuses[q.id] = { viewed: false, assessment: null, showAnswer: false };
      });
      setQuestionStatuses(statuses);
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const estimatedTime = topic?.estimated_time || Math.max(60, questions.length * 4);

  const handleStartPractice = () => {
    setViewMode('practice');
    setCurrentIndex(0);
    // Mark first question as viewed
    if (questions.length > 0) {
      setQuestionStatuses(prev => ({
        ...prev,
        [questions[0].id]: { ...prev[questions[0].id], viewed: true }
      }));
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentIndex(index);
    const q = questions[index];
    if (q) {
      setQuestionStatuses(prev => ({
        ...prev,
        [q.id]: { ...prev[q.id], viewed: true }
      }));
    }
  };

  const handleSelfAssessment = (assessment: SelfAssessment) => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], assessment }
    }));
  };

  const toggleShowAnswer = () => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], showAnswer: !prev[currentQuestion.id]?.showAnswer }
    }));
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      handleQuestionSelect(currentIndex + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentIndex > 0) {
      handleQuestionSelect(currentIndex - 1);
    }
  };

  // Calculate stats
  const correctCount = Object.values(questionStatuses).filter(s => s.assessment === 'correct').length;
  const incorrectCount = Object.values(questionStatuses).filter(s => s.assessment === 'incorrect').length;
  const flaggedCount = Object.values(questionStatuses).filter(s => s.assessment === 'flagged').length;

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8 max-w-4xl mx-auto px-4">
        <Skeleton className="h-6 w-64 mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !topic) {
    return (
      <div className="py-8 max-w-4xl mx-auto px-4">
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" asChild>
              <Link href={`/resources/topical-questions/${subjectSlug}`}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Topics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing view - SaveMyExams style topic overview
  if (viewMode === 'landing') {
    return (
      <div className="py-8 max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-6 flex-wrap gap-1">
          <Link href="/resources/topical-questions" className="hover:text-primary text-primary">
            Exam Questions
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/resources/topical-questions/${subjectSlug}`} className="hover:text-primary text-primary">
            {subject?.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{topic?.name}</span>
        </div>

        {/* Topic Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{topic?.name}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {subject?.code && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Exam code: {subject.code}
              </Badge>
            )}
            <span className="text-muted-foreground">
              {Math.floor(estimatedTime / 60)} {estimatedTime >= 120 ? 'hours' : 'hour'}{estimatedTime % 60 > 0 ? ` ${estimatedTime % 60} mins` : ''} • {questions.length} questions
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {topic?.pdf_url && (
              <Button asChild className="bg-primary hover:bg-primary/90">
                <a href={topic.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
            {topic?.answers_pdf_url && (
              <Button variant="outline" asChild>
                <a href={topic.answers_pdf_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" />
                  All answers
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigator Grid */}
        {questions.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Questions</h2>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      handleQuestionSelect(idx);
                      setViewMode('practice');
                    }}
                    className={cn(
                      "w-10 h-10 rounded-lg border-2 font-medium transition-all hover:scale-105",
                      "flex items-center justify-center text-sm",
                      idx === 0 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-background border-border hover:border-primary hover:text-primary"
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Practice Button */}
            <Button size="lg" onClick={handleStartPractice} className="mt-4">
              <Play className="w-5 h-5 mr-2" />
              Start Practice
            </Button>
          </>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Questions Yet</h2>
              <p className="text-muted-foreground mb-4">
                Questions for this topic are being added. Check back soon!
              </p>
              {topic?.pdf_url && (
                <Button asChild>
                  <a href={topic.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Instead
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Practice view - SaveMyExams style question display
  return (
    <div className="py-6 max-w-4xl mx-auto px-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setViewMode('landing')}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to overview
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-green-600 font-medium">{correctCount} ✓</span>
          <span className="text-red-600 font-medium">{incorrectCount} ✗</span>
          {flaggedCount > 0 && <span className="text-orange-500 font-medium">{flaggedCount} 🚩</span>}
        </div>
      </div>

      {/* Question Navigator */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {questions.map((q, idx) => {
            const status = questionStatuses[q.id];
            return (
              <button
                key={q.id}
                onClick={() => handleQuestionSelect(idx)}
                className={cn(
                  "w-10 h-10 rounded-lg border-2 font-medium transition-all flex-shrink-0",
                  "flex items-center justify-center text-sm",
                  idx === currentIndex && "ring-2 ring-primary ring-offset-2",
                  status?.assessment === 'correct' && "bg-green-500 text-white border-green-500",
                  status?.assessment === 'incorrect' && "bg-red-500 text-white border-red-500",
                  status?.assessment === 'flagged' && "bg-orange-500 text-white border-orange-500",
                  !status?.assessment && status?.viewed && "bg-muted border-muted-foreground/30",
                  !status?.assessment && !status?.viewed && "bg-background border-border"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Display */}
      {currentQuestion && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="text-sm">
                {currentQuestion.question_number || `${currentIndex + 1}`}
              </Badge>
              <Badge variant="secondary">
                {currentQuestion.marks || 1} mark{(currentQuestion.marks || 1) > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Question Text */}
            <div className="prose prose-sm max-w-none dark:prose-invert mb-6">
              <p className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                {currentQuestion.stem_markdown}
              </p>
            </div>

            {/* Self Assessment Section */}
            <div className="border-t pt-4 mt-6">
              <p className="text-sm text-muted-foreground mb-3">How did you do?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSelfAssessment('correct')}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                    questionStatuses[currentQuestion.id]?.assessment === 'correct'
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-green-500 text-green-500 hover:bg-green-500/10"
                  )}
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleSelfAssessment('incorrect')}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                    questionStatuses[currentQuestion.id]?.assessment === 'incorrect'
                      ? "bg-red-500 border-red-500 text-white"
                      : "border-red-500 text-red-500 hover:bg-red-500/10"
                  )}
                >
                  <XCircle className="w-5 h-5" />
                </button>
                <div className="border-l h-6 mx-2" />
                <button
                  onClick={() => handleSelfAssessment('flagged')}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                    questionStatuses[currentQuestion.id]?.assessment === 'flagged'
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  )}
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stuck? and View Answer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Link 
                href={`/resources/revision-notes/${subjectSlug}`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Stuck? <span className="text-primary">View related notes</span>
              </Link>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleShowAnswer}
              >
                {questionStatuses[currentQuestion.id]?.showAnswer ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide answer
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    View answer
                  </>
                )}
              </Button>
            </div>

            {/* Answer Display */}
            {questionStatuses[currentQuestion.id]?.showAnswer && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Answer:</h4>
                <p className="text-foreground">
                  {typeof currentQuestion.correct_answer === 'object' 
                    ? JSON.stringify(currentQuestion.correct_answer) 
                    : String(currentQuestion.correct_answer)}
                </p>
                {currentQuestion.explanation && (
                  <div className="mt-3 pt-3 border-t border-green-500/30">
                    <h5 className="font-medium text-green-700 dark:text-green-400 mb-1">Explanation:</h5>
                    <p className="text-muted-foreground text-sm">{currentQuestion.explanation}</p>
                  </div>
                )}
                {currentQuestion.examiner_comment && (
                  <div className="mt-3 pt-3 border-t border-green-500/30">
                    <h5 className="font-medium text-green-700 dark:text-green-400 mb-1">Examiner's Comment:</h5>
                    <p className="text-muted-foreground text-sm">{currentQuestion.examiner_comment}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevQuestion}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {questions.length}
        </span>
        <Button
          onClick={goToNextQuestion}
          disabled={currentIndex === questions.length - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
