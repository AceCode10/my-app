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
import { useGamification } from '@/hooks/use-gamification';
import { useUser } from '@/hooks/use-user';

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
  const { user } = useUser();
  const gamification = useGamification();
  
  const [isLoading, setIsLoading] = useState(true);
  const [xpAwarded, setXpAwarded] = useState(false);
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
      
      // Sort each group by display_order and part_label, respecting parent_question_id hierarchy
      const sortedGroups: QuestionGroup[] = [];
      groupsByNumber.forEach((questions, questionNumber) => {
        // Build hierarchy: find parent-child relationships
        const questionsById = new Map(questions.map(q => [q.id, q]));
        const childrenByParentId = new Map<string, Question[]>();
        const rootQuestions: Question[] = [];
        
        questions.forEach(q => {
          if (q.parent_question_id && questionsById.has(q.parent_question_id)) {
            const siblings = childrenByParentId.get(q.parent_question_id) || [];
            siblings.push(q);
            childrenByParentId.set(q.parent_question_id, siblings);
          } else {
            rootQuestions.push(q);
          }
        });
        
        // Sort root questions
        rootQuestions.sort((a, b) => {
          const orderA = a.display_order ?? 9999;
          const orderB = b.display_order ?? 9999;
          if (orderA !== orderB) return orderA - orderB;
          const labelA = a.part_label || '';
          const labelB = b.part_label || '';
          if (!labelA && labelB) return -1;
          if (labelA && !labelB) return 1;
          return labelA.localeCompare(labelB);
        });
        
        // Flatten hierarchy: parent first, then children
        const sorted: Question[] = [];
        const addWithChildren = (q: Question) => {
          sorted.push(q);
          const children = childrenByParentId.get(q.id) || [];
          // Sort children by display_order then part_label
          children.sort((a, b) => {
            const orderA = a.display_order ?? 9999;
            const orderB = b.display_order ?? 9999;
            if (orderA !== orderB) return orderA - orderB;
            const labelA = a.part_label || '';
            const labelB = b.part_label || '';
            return labelA.localeCompare(labelB);
          });
          children.forEach(child => addWithChildren(child));
        };
        rootQuestions.forEach(q => addWithChildren(q));
        
        // Ensure context-only items appear before answerable items within the group.
        // This ensures the shared stem/context is displayed first, then the parts.
        sorted.sort((a, b) => {
          const aIsContext = a.is_context_only || (a.marks === 0 && !a.part_label) || a.needs_answer === false;
          const bIsContext = b.is_context_only || (b.marks === 0 && !b.part_label) || b.needs_answer === false;
          if (aIsContext && !bIsContext) return -1;
          if (!aIsContext && bIsContext) return 1;
          // Among non-context items: items without part_label before those with part_label
          if (!aIsContext && !bIsContext) {
            if (!a.part_label && b.part_label) return -1;
            if (a.part_label && !b.part_label) return 1;
          }
          return 0; // preserve existing order otherwise
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

  const handleFinishSession = useCallback(async () => {
    setViewMode('summary');
    // Clear saved session
    localStorage.removeItem(`practice-${subjectSlug}-${topicSlug}`);
    
    // Award XP for completing topical questions (only for logged-in users)
    if (user && gamification && !xpAwarded) {
      // Calculate XP based on performance
      const allAnswerableParts = questionGroups.flatMap(g => 
        g.questions.filter(q => q.marks > 0 && q.needs_answer !== false && !q.is_context_only)
      );
      const correctAnswers = allAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'correct').length;
      const totalAnswerable = allAnswerableParts.length;
      
      // Base XP: 5 XP per question answered
      const baseXP = totalAnswerable * 5;
      
      // Bonus XP for correct answers: +3 XP per correct
      const correctBonus = correctAnswers * 3;
      
      // Accuracy bonus: +10 XP if 80%+ correct, +25 XP if 100% correct
      const accuracy = totalAnswerable > 0 ? (correctAnswers / totalAnswerable) * 100 : 0;
      let accuracyBonus = 0;
      if (accuracy === 100) {
        accuracyBonus = 25;
      } else if (accuracy >= 80) {
        accuracyBonus = 10;
      }
      
      const totalXP = baseXP + correctBonus + accuracyBonus;
      
      // Only award XP to authenticated users (students)
      if (totalXP > 0 && user && gamification?.awardXP) {
        try {
          await gamification.awardXP(totalXP, 'topical_questions_completed');
          setXpAwarded(true);
        } catch (error) {
          console.error('Error awarding XP:', error);
        }
      }
        
      // Update topic progress in database for authenticated users
      if (user && topic) {
          supabase
            .from('user_topic_progress')
            .upsert({
              user_id: user.id,
              topic_id: topic.id,
              completed_questions: correctAnswers,
              total_questions: totalAnswerable,
              progress_percentage: Math.round(accuracy),
              last_practiced_at: new Date().toISOString()
            }, { onConflict: 'user_id,topic_id' })
            .then(() => console.log('Topic progress updated'))
            .catch((err: Error) => console.error('Error updating topic progress:', err));
      }
    }
  }, [subjectSlug, topicSlug, user, gamification, xpAwarded, questionGroups, questionStatuses, topic, supabase]);

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

  const handleSelfAssessment = (assessment: SelfAssessment, questionId?: string) => {
    if (!currentGroup) return;
    
    if (questionId) {
      // Apply assessment to a specific question
      setQuestionStatuses(prev => ({
        ...prev,
        [questionId]: { ...prev[questionId], assessment }
      }));
    } else {
      // Apply assessment to all answerable questions in the group (legacy behavior)
      setQuestionStatuses(prev => {
        const updated = { ...prev };
        currentGroup.questions.forEach(q => {
          if (q.marks > 0 && q.needs_answer !== false && !q.is_context_only) {
            updated[q.id] = { ...updated[q.id], assessment };
          }
        });
        return updated;
      });
    }
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

  // Calculate stats - count individual answerable parts
  const getGroupAssessment = (group: QuestionGroup): SelfAssessment => {
    // Return the assessment of the first answerable question in the group
    for (const q of group.questions) {
      if (q.marks > 0 && q.needs_answer !== false && !q.is_context_only) {
        return questionStatuses[q.id]?.assessment || null;
      }
    }
    return null;
  };

  // Get all answerable parts across all groups
  const allAnswerableParts = questionGroups.flatMap(g => 
    g.questions.filter(q => q.marks > 0 && q.needs_answer !== false && !q.is_context_only)
  );
  const totalAnswerableParts = allAnswerableParts.length;
  
  // Count individual part assessments
  const correctCount = allAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'correct').length;
  const incorrectCount = allAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'incorrect').length;
  const flaggedCount = allAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'flagged').length;
  const answeredCount = correctCount + incorrectCount + flaggedCount;

  // Loading state
  if (isLoading) {
    return (
      <div className="py-2 max-w-4xl mx-auto px-4">
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
      <div className="py-2 max-w-4xl mx-auto px-4">
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
      <div className="py-2 max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-4 flex-wrap gap-1">
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
              {Math.floor(estimatedTime / 60)} {estimatedTime >= 120 ? 'hours' : 'hour'}{estimatedTime % 60 > 0 ? ` ${estimatedTime % 60} mins` : ''} • {questionGroups.length} questions
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
        {questionGroups.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Questions</h2>
              <div className="flex flex-wrap gap-2">
                {questionGroups.map((group, idx) => (
                  <button
                    key={`group-${group.questionNumber}`}
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
      <div className="py-2 max-w-4xl mx-auto px-4">
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
    <div className="py-2 max-w-4xl mx-auto px-4">
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
          <span>Progress ({totalAnswerableParts} parts)</span>
          <span>{answeredCount} / {totalAnswerableParts} answered</span>
        </div>
        <Progress value={totalAnswerableParts > 0 ? (answeredCount / totalAnswerableParts) * 100 : 0} className="h-2" />
      </div>

      {/* Question Navigator - Shows one button per question group */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {questionGroups.map((group, idx) => {
            // Get all answerable parts in this group
            const groupAnswerableParts = group.questions.filter(q => 
              q.marks > 0 && q.needs_answer !== false && !q.is_context_only
            );
            // Count how many parts are assessed in this group
            const assessedParts = groupAnswerableParts.filter(q => 
              questionStatuses[q.id]?.assessment !== null && questionStatuses[q.id]?.assessment !== undefined
            );
            // Determine group coloring based on majority assessment or partial completion
            const correctParts = groupAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'correct').length;
            const incorrectParts = groupAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'incorrect').length;
            const flaggedParts = groupAnswerableParts.filter(q => questionStatuses[q.id]?.assessment === 'flagged').length;
            const allPartsAssessed = assessedParts.length === groupAnswerableParts.length && groupAnswerableParts.length > 0;
            const somePartsAssessed = assessedParts.length > 0;
            
            // Color based on: all correct = green, any incorrect = red, any flagged = orange, partial = mixed
            let buttonColor = "bg-background border-border"; // default
            if (allPartsAssessed) {
              if (incorrectParts > 0) {
                buttonColor = "bg-red-500 text-white border-red-500";
              } else if (flaggedParts > 0) {
                buttonColor = "bg-orange-500 text-white border-orange-500";
              } else {
                buttonColor = "bg-green-500 text-white border-green-500";
              }
            } else if (somePartsAssessed) {
              // Partial completion - show a mixed/partial state
              buttonColor = "bg-blue-100 border-blue-400 text-blue-700";
            }
            
            const isViewed = group.questions.some(q => questionStatuses[q.id]?.viewed);
            if (!somePartsAssessed && isViewed) {
              buttonColor = "bg-muted border-muted-foreground/30";
            }
            
            return (
              <button
                key={`group-${group.questionNumber}`}
                onClick={() => handleQuestionSelect(idx)}
                className={cn(
                  "w-10 h-10 rounded-lg border-2 font-medium transition-all flex-shrink-0",
                  "flex items-center justify-center text-sm",
                  idx === currentIndex && "ring-2 ring-primary ring-offset-2",
                  buttonColor
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
                          {q.image_url && (
                            <img src={q.image_url} alt="Question image" className="mt-3 max-w-full rounded-lg border" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Answerable parts - with marks
                const partAssessment = questionStatuses[q.id]?.assessment;
                
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
                      
                      {/* Question image */}
                      {q.image_url && (
                        <img src={q.image_url} alt="Question image" className="mb-4 max-w-full rounded-lg border" />
                      )}
                      
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
                      
                      {/* Answer & Mark Scheme display for this part */}
                      {showAnswer && (
                        <div className="mt-3 space-y-2">
                          {q.correct_answer && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <p className="text-sm text-green-700 dark:text-green-400">
                                <strong>Answer:</strong> {typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : String(q.correct_answer)}
                              </p>
                            </div>
                          )}
                          {q.explanation && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <p className="text-sm text-blue-700 dark:text-blue-400">
                                <strong>Explanation:</strong> {q.explanation}
                              </p>
                            </div>
                          )}
                          {q.examiner_comment && q.examiner_comment !== 'N/A' && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                              <p className="text-sm text-amber-700 dark:text-amber-400">
                                <strong>Mark Scheme:</strong> {q.examiner_comment}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Self Assessment for THIS part */}
                      <div className="border-t pt-3 mt-4">
                        <p className="text-xs text-muted-foreground mb-2">How did you do on this part?</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSelfAssessment('correct', q.id)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                partAssessment === 'correct'
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-green-500 text-green-500 hover:bg-green-500/10"
                              )}
                              title="I got it right"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSelfAssessment('incorrect', q.id)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                partAssessment === 'incorrect'
                                  ? "bg-red-500 border-red-500 text-white"
                                  : "border-red-500 text-red-500 hover:bg-red-500/10"
                              )}
                              title="I got it wrong"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSelfAssessment('flagged', q.id)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                partAssessment === 'flagged'
                                  ? "bg-orange-500 border-orange-500 text-white"
                                  : "border-orange-500 text-orange-500 hover:bg-orange-500/10"
                              )}
                              title="Flag for review"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setQuestionStatuses(prev => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], showAnswer: !showAnswer }
                              }));
                            }}
                            className="text-xs"
                          >
                            {showAnswer ? (
                              <>
                                <EyeOff className="w-3 h-3 mr-1" />
                                Hide answer
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                View answer
                              </>
                            )}
                          </Button>
                        </div>
                        <Link 
                          href={`/resources/revision-notes/${subjectSlug}`}
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                        >
                          Stuck? <span className="text-primary">View related notes</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
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
