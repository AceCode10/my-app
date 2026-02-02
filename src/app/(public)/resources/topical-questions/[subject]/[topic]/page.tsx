'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, Clock, RotateCcw, Home, AlertCircle, Download, FileText, Play, Flag, BookOpen, Eye, EyeOff, Keyboard, Trophy } from 'lucide-react';
import { getProxiedStorageUrl } from '@/lib/storage-proxy';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useProgress } from '@/hooks/use-progress';
import { SessionSummary } from '@/components/practice/session-summary';
import { Stopwatch } from '@/components/practice/question-timer';

interface Question {
  id: string;
  stem_md?: string;
  stem_markdown?: string;
  question_type: string;
  difficulty: string;
  marks: number;
  options?: { id: string; text: string; label?: string; is_correct?: boolean }[];
  correct_answer: any;
  explanation?: string;
  examiner_comment?: string;
  question_number?: string | number;
  parent_question_id?: string | null;
  part_label?: string | null;
  context_text?: string | null;
  display_order?: number;
  is_context_only?: boolean;
  needs_answer?: boolean;
  image_url?: string | null;
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

type ViewMode = 'landing' | 'practice' | 'summary';
type SelfAssessment = 'correct' | 'incorrect' | 'flagged' | null;

interface QuestionStatus {
  viewed: boolean;
  assessment: SelfAssessment;
  showAnswer: boolean;
}

// A question group contains all parts of a multi-part question
interface QuestionGroup {
  questionNumber: number | string;
  questions: Question[];  // All parts including context
  totalMarks: number;
}

export default function TopicPracticePage({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>;
}) {
  const { subject: subjectSlug, topic: topicSlug } = use(params);
  const searchParams = useSearchParams();
  const examBoard = searchParams.get('board') || '';
  const level = searchParams.get('level') || '';
  const supabase = createClient();
  const { trackProgress } = useProgress();
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  useEffect(() => {
    fetchData();
  }, [subjectSlug, topicSlug, examBoard, level]);

  async function fetchData() {
    try {
      setIsLoading(true);

      // Get exam_board_id from the exam_boards table if examBoard is provided
      let examBoardId: string | null = null;
      if (examBoard) {
        const codeMap: Record<string, string> = {
          'cambridge': 'CIE',
          'ib': 'IB',
          'edexcel': 'EDEX',
          'ocr': 'OCR',
          'aqa': 'AQA',
          'ap': 'AP'
        };
        const dbCode = codeMap[examBoard.toLowerCase()] || examBoard.toUpperCase();
        
        const { data: boardData } = await supabase
          .from('exam_boards')
          .select('id')
          .eq('code', dbCode)
          .single();
        
        if (boardData) {
          examBoardId = boardData.id;
        }
      }

      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .single();

      if (subjectError) {
        console.error('Subject fetch error:', subjectError);
        throw new Error(`Subject not found: ${subjectError.message}`);
      }
      if (!subjectData) {
        throw new Error('Subject not found');
      }
      setSubject(subjectData);

      // Fetch topic by slug (simple and reliable)
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectData.id)
        .eq('slug', topicSlug)
        .single();

      if (topicError) {
        console.error('Topic fetch error:', topicError);
        throw new Error(`Topic not found: ${topicError.message}`);
      }
      
      if (!topicData) {
        throw new Error('Topic not found');
      }
      
      setTopic(topicData);
      const finalTopic = topicData;

      // Fetch questions for this topic - order by display_order for proper hierarchy
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('topic_id', finalTopic.id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (questionsError) {
        console.error('Questions fetch error:', questionsError);
        throw questionsError;
      }

      const allQuestions = (questionsData || []) as Question[];
      
      // Group questions by question_number (like past papers)
      // Each group contains all parts of a multi-part question
      const groupsByNumber = new Map<number | string, Question[]>();
      
      allQuestions.forEach(q => {
        const num = q.question_number || 'unknown';
        if (!groupsByNumber.has(num)) {
          groupsByNumber.set(num, []);
        }
        groupsByNumber.get(num)!.push(q);
      });
      
      // Sort each group by display_order and part_label
      const sortedGroups: QuestionGroup[] = [];
      groupsByNumber.forEach((questions, questionNumber) => {
        // Sort: context/parent first (no part_label), then by part_label
        const sorted = [...questions].sort((a, b) => {
          // First by display_order
          const orderA = a.display_order ?? 9999;
          const orderB = b.display_order ?? 9999;
          if (orderA !== orderB) return orderA - orderB;
          
          // Then by part_label (empty first)
          const labelA = a.part_label || '';
          const labelB = b.part_label || '';
          if (!labelA && labelB) return -1;
          if (labelA && !labelB) return 1;
          return labelA.localeCompare(labelB);
        });
        
        // Calculate total marks (only from answerable parts)
        const totalMarks = sorted.reduce((sum, q) => {
          if (q.is_context_only || q.needs_answer === false || q.marks === 0) return sum;
          return sum + (q.marks || 0);
        }, 0);
        
        // Only include groups that have at least one answerable question
        const hasAnswerable = sorted.some(q => 
          !q.is_context_only && q.needs_answer !== false && q.marks > 0
        );
        
        if (hasAnswerable) {
          sortedGroups.push({
            questionNumber,
            questions: sorted,
            totalMarks
          });
        }
      });
      
      // Sort groups by question number
      sortedGroups.sort((a, b) => {
        const numA = typeof a.questionNumber === 'number' ? a.questionNumber : parseInt(String(a.questionNumber)) || 0;
        const numB = typeof b.questionNumber === 'number' ? b.questionNumber : parseInt(String(b.questionNumber)) || 0;
        return numA - numB;
      });
      
      setQuestionGroups(sortedGroups);
      
      // Also set flat questions for backward compatibility
      const flatQuestions = sortedGroups.flatMap(g => g.questions.filter(q => 
        !q.is_context_only && q.needs_answer !== false && q.marks > 0
      ));
      setQuestions(flatQuestions);
      
      // Initialize question statuses
      const statuses: Record<string, QuestionStatus> = {};
      (questionsData || []).forEach((q: Question) => {
        statuses[q.id] = { viewed: false, assessment: null, showAnswer: false };
      });
      setQuestionStatuses(statuses);
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', JSON.stringify(err, null, 2));
      console.error('Subject slug:', subjectSlug);
      console.error('Topic slug:', topicSlug);
      setError(err.message || err.details || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const currentGroup = questionGroups[currentIndex];
  const estimatedTime = topic?.estimated_time || Math.max(60, questionGroups.length * 4);

  const handleStartPractice = useCallback(() => {
    setViewMode('practice');
    setCurrentIndex(0);
    setSessionStartTime(Date.now());
    // Try to restore session from localStorage
    const savedSession = localStorage.getItem(`practice-${subjectSlug}-${topicSlug}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.questionStatuses && Object.keys(parsed.questionStatuses).length === questions.length) {
          setQuestionStatuses(parsed.questionStatuses);
          setCurrentIndex(parsed.currentIndex || 0);
          setTotalTimeSpent(parsed.totalTimeSpent || 0);
        }
      } catch (e) {
        console.error('Error restoring session:', e);
      }
    }
    // Mark first question as viewed
    if (questions.length > 0) {
      setQuestionStatuses(prev => ({
        ...prev,
        [questions[0].id]: { ...prev[questions[0].id], viewed: true }
      }));
    }
    // Track progress
    if (subject && topic) {
      trackProgress('practicing_questions', {
        subjectId: subject.id,
        topicId: topic.id,
        progressData: { questionIndex: 0, totalQuestions: questions.length },
        completionPercentage: 0
      });
    }
  }, [questions, subject, topic, subjectSlug, topicSlug, trackProgress]);

  // Save session to localStorage periodically
  useEffect(() => {
    if (viewMode !== 'practice' || questions.length === 0) return;
    
    const saveSession = () => {
      const sessionData = {
        questionStatuses,
        currentIndex,
        totalTimeSpent,
        savedAt: Date.now()
      };
      localStorage.setItem(`practice-${subjectSlug}-${topicSlug}`, JSON.stringify(sessionData));
    };
    
    const interval = setInterval(saveSession, 5000); // Save every 5 seconds
    return () => {
      clearInterval(interval);
      saveSession(); // Save on unmount
    };
  }, [viewMode, questionStatuses, currentIndex, totalTimeSpent, subjectSlug, topicSlug, questions.length]);

  // Keyboard navigation
  useEffect(() => {
    if (viewMode !== 'practice') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          goToPrevQuestion();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          goToNextQuestion();
          break;
        case '1':
          e.preventDefault();
          if (currentQuestion) handleSelfAssessment('correct');
          break;
        case '2':
          e.preventDefault();
          if (currentQuestion) handleSelfAssessment('incorrect');
          break;
        case '3':
          e.preventDefault();
          if (currentQuestion) handleSelfAssessment('flagged');
          break;
        case 's':
        case 'a':
          e.preventDefault();
          toggleShowAnswer();
          break;
        case 'Escape':
          e.preventDefault();
          setViewMode('landing');
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, currentQuestion, questions.length]);

  // Check if session is complete - based on groups, not individual questions
  const isSessionComplete = questionGroups.length > 0 && 
    questionGroups.every(group => {
      // A group is complete if any of its answerable questions has an assessment
      return group.questions.some(q => 
        q.marks > 0 && q.needs_answer !== false && !q.is_context_only && 
        questionStatuses[q.id]?.assessment !== null
      );
    });

  const handleFinishSession = useCallback(() => {
    setViewMode('summary');
    // Clear saved session
    localStorage.removeItem(`practice-${subjectSlug}-${topicSlug}`);
  }, [subjectSlug, topicSlug]);

  const handleRestartSession = useCallback(() => {
    const statuses: Record<string, QuestionStatus> = {};
    questions.forEach(q => {
      statuses[q.id] = { viewed: false, assessment: null, showAnswer: false };
    });
    setQuestionStatuses(statuses);
    setCurrentIndex(0);
    setTotalTimeSpent(0);
    setViewMode('practice');
    setSessionStartTime(Date.now());
    localStorage.removeItem(`practice-${subjectSlug}-${topicSlug}`);
  }, [questions, subjectSlug, topicSlug]);

  const handleQuestionSelect = (index: number) => {
    setCurrentIndex(index);
    const group = questionGroups[index];
    if (group) {
      // Mark all questions in the group as viewed
      setQuestionStatuses(prev => {
        const updated = { ...prev };
        group.questions.forEach(q => {
          updated[q.id] = { ...updated[q.id], viewed: true };
        });
        return updated;
      });
    }
    // Update progress tracking
    if (subject && topic && questionGroups.length > 0) {
      const completionPercentage = Math.round(((index + 1) / questionGroups.length) * 100);
      trackProgress('practicing_questions', {
        subjectId: subject.id,
        topicId: topic.id,
        progressData: { questionIndex: index, totalQuestions: questionGroups.length },
        completionPercentage
      });
    }
  };

  const handleSelfAssessment = (assessment: SelfAssessment) => {
    if (!currentGroup) return;
    // Apply assessment to all answerable questions in the group
    setQuestionStatuses(prev => {
      const updated = { ...prev };
      currentGroup.questions.forEach(q => {
        if (q.marks > 0 && q.needs_answer !== false && !q.is_context_only) {
          updated[q.id] = { ...updated[q.id], assessment };
        }
      });
      return updated;
    });
  };

  const toggleShowAnswer = () => {
    if (!currentGroup) return;
    // Toggle showAnswer for all questions in the group
    const currentShowState = currentGroup.questions.some(q => questionStatuses[q.id]?.showAnswer);
    setQuestionStatuses(prev => {
      const updated = { ...prev };
      currentGroup.questions.forEach(q => {
        updated[q.id] = { ...updated[q.id], showAnswer: !currentShowState };
      });
      return updated;
    });
  };

  const goToNextQuestion = () => {
    if (currentIndex < questionGroups.length - 1) {
      handleQuestionSelect(currentIndex + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentIndex > 0) {
      handleQuestionSelect(currentIndex - 1);
    }
  };

  // Calculate stats - count groups, not individual parts
  const getGroupAssessment = (group: QuestionGroup): SelfAssessment => {
    // Return the assessment of the first answerable question in the group
    for (const q of group.questions) {
      if (q.marks > 0 && q.needs_answer !== false && !q.is_context_only) {
        return questionStatuses[q.id]?.assessment || null;
      }
    }
    return null;
  };
  
  const correctCount = questionGroups.filter(g => getGroupAssessment(g) === 'correct').length;
  const incorrectCount = questionGroups.filter(g => getGroupAssessment(g) === 'incorrect').length;
  const flaggedCount = questionGroups.filter(g => getGroupAssessment(g) === 'flagged').length;

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
                <a href={getProxiedStorageUrl(topic.pdf_url)} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
            {topic?.answers_pdf_url && (
              <Button variant="outline" asChild>
                <a href={getProxiedStorageUrl(topic.answers_pdf_url)} target="_blank" rel="noopener noreferrer">
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

  // Summary view
  if (viewMode === 'summary') {
    const viewedCount = Object.values(questionStatuses).filter(s => s.viewed).length;
    return (
      <div className="py-8 max-w-4xl mx-auto px-4">
        <SessionSummary
          stats={{
            correct: correctCount,
            incorrect: incorrectCount,
            flagged: flaggedCount,
            viewed: viewedCount,
            unanswered: questions.length - (correctCount + incorrectCount + flaggedCount),
            totalTimeSpent,
            isComplete: isSessionComplete
          }}
          totalQuestions={questions.length}
          topicName={topic?.name || ''}
          subjectName={subject?.name || ''}
          subjectSlug={subjectSlug}
          onRestart={handleRestartSession}
        />
      </div>
    );
  }

  // Practice view - SaveMyExams style question display
  return (
    <div className="py-6 max-w-4xl mx-auto px-4">
      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowKeyboardHelp(false)}>
          <Card className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Keyboard className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Keyboard Shortcuts</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Next question</span><kbd className="px-2 py-1 bg-muted rounded">→ or L</kbd></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Previous question</span><kbd className="px-2 py-1 bg-muted rounded">← or H</kbd></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mark correct</span><kbd className="px-2 py-1 bg-muted rounded">1</kbd></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mark incorrect</span><kbd className="px-2 py-1 bg-muted rounded">2</kbd></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Flag for review</span><kbd className="px-2 py-1 bg-muted rounded">3</kbd></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Show/hide answer</span><kbd className="px-2 py-1 bg-muted rounded">A or S</kbd></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Back to overview</span><kbd className="px-2 py-1 bg-muted rounded">Esc</kbd></div>
              </div>
              <Button className="w-full mt-4" onClick={() => setShowKeyboardHelp(false)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setViewMode('landing')}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to overview
        </Button>
        <div className="flex items-center gap-4">
          {/* Timer removed for topical questions - only show progress stats */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-green-600 font-medium">{correctCount} ✓</span>
            <span className="text-red-600 font-medium">{incorrectCount} ✗</span>
            {flaggedCount > 0 && <span className="text-orange-500 font-medium">{flaggedCount} 🚩</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(true)} title="Keyboard shortcuts">
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{correctCount + incorrectCount + flaggedCount} / {questionGroups.length} answered</span>
        </div>
        <Progress value={questionGroups.length > 0 ? ((correctCount + incorrectCount + flaggedCount) / questionGroups.length) * 100 : 0} className="h-2" />
      </div>

      {/* Question Navigator - Shows one button per question group */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {questionGroups.map((group, idx) => {
            const groupAssessment = getGroupAssessment(group);
            const isViewed = group.questions.some(q => questionStatuses[q.id]?.viewed);
            return (
              <button
                key={`group-${group.questionNumber}`}
                onClick={() => handleQuestionSelect(idx)}
                className={cn(
                  "w-10 h-10 rounded-lg border-2 font-medium transition-all flex-shrink-0",
                  "flex items-center justify-center text-sm",
                  idx === currentIndex && "ring-2 ring-primary ring-offset-2",
                  groupAssessment === 'correct' && "bg-green-500 text-white border-green-500",
                  groupAssessment === 'incorrect' && "bg-red-500 text-white border-red-500",
                  groupAssessment === 'flagged' && "bg-orange-500 text-white border-orange-500",
                  !groupAssessment && isViewed && "bg-muted border-muted-foreground/30",
                  !groupAssessment && !isViewed && "bg-background border-border"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Display - Shows all parts of the current group */}
      {currentGroup && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4">
              <Badge variant="default" className="text-lg px-4 py-2 font-bold rounded-md">
                Q{currentGroup.questionNumber}
              </Badge>
              {currentGroup.totalMarks > 0 && (
                <Badge variant="secondary">
                  {currentGroup.totalMarks} mark{currentGroup.totalMarks > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Render all parts of the question group */}
            <div className="space-y-4">
              {currentGroup.questions.map((q, partIdx) => {
                const isContext = q.is_context_only || q.marks === 0 || q.needs_answer === false;
                const showAnswer = questionStatuses[q.id]?.showAnswer;
                
                // Context parts - no marks, just display
                if (isContext) {
                  return (
                    <div key={q.id} className={cn(
                      "rounded-lg p-4",
                      !q.part_label ? "bg-muted/30 border-l-4 border-primary" : "bg-muted/20"
                    )}>
                      <div className="flex items-start gap-3">
                        {q.part_label && (
                          <Badge variant="outline" className="text-sm font-semibold shrink-0">
                            ({q.part_label})
                          </Badge>
                        )}
                        <div className="flex-1">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {q.stem_markdown || q.stem_md || q.context_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Answerable parts - with marks
                return (
                  <div key={q.id} className="rounded-lg border bg-card overflow-hidden">
                    {/* Part header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                      <div className="flex items-center gap-2">
                        {q.part_label && (
                          <span className="text-sm font-semibold text-foreground">
                            ({q.part_label})
                          </span>
                        )}
                      </div>
                      {q.marks > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                        </span>
                      )}
                    </div>
                    
                    {/* Part content */}
                    <div className="p-4">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap mb-4">
                        {q.stem_markdown || q.stem_md}
                      </p>
                      
                      {/* MCQ Options */}
                      {(q.question_type === 'multiple_choice' || q.question_type === 'mcq') && q.options && (
                        <div className="space-y-2">
                          {(q.options as any[]).map((option: any, idx: number) => (
                            <div
                              key={option.label || idx}
                              className={cn(
                                "p-3 rounded-lg border-2 transition-all",
                                showAnswer && option.is_correct
                                  ? "border-green-500 bg-green-500/10"
                                  : "border-border"
                              )}
                            >
                              <span className="font-semibold mr-2">{option.label || String.fromCharCode(65 + idx)}.</span>
                              <span>{option.text}</span>
                              {showAnswer && option.is_correct && (
                                <CheckCircle className="inline-block ml-2 w-4 h-4 text-green-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Answer display for this part */}
                      {showAnswer && q.correct_answer && (
                        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-sm text-green-700 dark:text-green-400">
                            <strong>Answer:</strong> {typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : String(q.correct_answer)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Self Assessment Section - For the whole group */}
            {currentGroup.totalMarks > 0 && (
              <div className="border-t pt-4 mt-6">
                <p className="text-sm text-muted-foreground mb-3">How did you do on this question?</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelfAssessment('correct')}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                      getGroupAssessment(currentGroup) === 'correct'
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
                      getGroupAssessment(currentGroup) === 'incorrect'
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
                      getGroupAssessment(currentGroup) === 'flagged'
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "border-orange-500 text-orange-500 hover:bg-orange-500/10"
                    )}
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

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
                {currentGroup.questions.some(q => questionStatuses[q.id]?.showAnswer) ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide answers
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    View answers
                  </>
                )}
              </Button>
            </div>
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {questionGroups.length}
          </span>
          {isSessionComplete && (
            <Button size="sm" onClick={handleFinishSession}>
              <Trophy className="w-4 h-4 mr-1" />
              View Results
            </Button>
          )}
        </div>
        {currentIndex === questionGroups.length - 1 ? (
          <Button onClick={handleFinishSession}>
            Finish
            <Trophy className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={goToNextQuestion}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
