
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader2, Award, Repeat, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import type { Quiz, Question, QuizAttempt } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { generateQuizQuestions, generateModelAnswer, GenerateModelAnswerOutput } from '@/lib/ai-placeholders';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useActivityRewards } from '@/hooks/use-activity-rewards';
import { RewardBreakdownModal } from '@/components/gamification';

type QuizState = 'idle' | 'loading' | 'active' | 'completed' | 'error';
type AnswerState = 'unanswered' | 'correct' | 'incorrect';

interface AnswerRecord {
  question: Question;
  selectedAnswer: string;
  isCorrect: boolean;
}

interface QuizClientProps {
  topic: string;
  classId?: string | null;
}

export function QuizClient({ topic, classId }: QuizClientProps) {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [answerLog, setAnswerLog] = useState<AnswerRecord[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState<GenerateModelAnswerOutput | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const supabase = createClient();
  const { user } = useUser();
  const isSubscribed = user?.subscription_tier === 'pro' || user?.subscription_tier === 'premium';
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isPublicFlow = searchParams.get('from') === 'public';
  const { processTopicalQuestion, lastBreakdown, clearLastBreakdown } = useActivityRewards();
  const [showRewardBreakdown, setShowRewardBreakdown] = useState(false);
  const [startTime] = useState(() => Date.now());

  const startQuiz = async () => {
    setQuizState('loading');

    try {
      // Fetch quiz from Supabase
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('topic', topic)
        .eq('visibility', 'published')
        .limit(1)
        .single();

      let fetchedQuestions: Question[] = [];

      if (quizData && !quizError) {
        // Fetch questions for this quiz
        if (quizData.question_ids && quizData.question_ids.length > 0) {
          const { data: questionsData } = await supabase
            .from('questions')
            .select('*')
            .in('id', quizData.question_ids);
          
          if (questionsData) {
            // Ensure questions are in the order specified by the quiz
            fetchedQuestions = quizData.question_ids
              .map((id: string) => questionsData.find(q => q.id === id))
              .filter(Boolean) as Question[];
          }
        }
      }

      // If no pre-made quiz found OR if found quiz has no questions, generate with AI
      if (!quizData || fetchedQuestions.length === 0) {
        setIsLoadingAi(true);
        toast({
            title: 'No pre-made quiz found',
            description: 'Generating a new quiz with AI. This may take a moment...'
        });
        
        const aiResult = await generateQuizQuestions({ topic, numQuestions: 5 });
        
        const aiQuiz: Quiz = {
            id: `ai-${Date.now()}`,
            title: `${topic} (AI Generated)`,
            subject: '', 
            topic: topic,
            visibility: 'published',
            questionIds: aiResult.questions.map(q => q.id),
            aiGenerated: true,
        } as Quiz;

        setQuestions(aiResult.questions);
        setQuiz(aiQuiz);
        setQuizState('active');
        setIsLoadingAi(false);
      } else {
        setQuiz(quizData);
        setQuestions(fetchedQuestions);
        setQuizState('active');
      }
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Could not load quiz',
        description: error.message || 'Please try again later.',
      });
      setQuizState('error');
      setIsLoadingAi(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !questions) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    if (isCorrect) {
      setAnswerState('correct');
      setScore((prev) => prev + 1);
    } else {
      setAnswerState('incorrect');
    }
    setAnswerLog(prev => [...prev, { question: currentQuestion, selectedAnswer, isCorrect }]);

    // Award XP for answering question (if logged in)
    if (user && !isPublicFlow) {
      const timeSpent = Math.round((Date.now() - startTime) / 60000); // minutes
      await processTopicalQuestion({
        questionId: currentQuestion.id,
        subjectName: quiz?.subject,
        topicName: quiz?.topic,
        isCorrect,
        timeSpentMinutes: Math.max(1, timeSpent),
      });
    }
  };

  const saveQuizAttemptToSupabase = async (attempt: Omit<QuizAttempt, 'id' | 'completedAt'>) => {
    if (!user) return;
    
    try {
      // Save quiz attempt (XP is now awarded per-question via processTopicalQuestion)
      await supabase.from('quiz_attempts').insert({
        user_id: attempt.userId,
        quiz_id: attempt.quizId,
        class_id: attempt.classId,
        topic: attempt.topic,
        score: attempt.score,
        total_questions: attempt.totalQuestions,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }
  };

  const handleNextQuestion = () => {
    if (!questions) return;
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setAnswerState('unanswered');
    } else {
      if (user && quiz) {
        const attempt: Omit<QuizAttempt, 'id' | 'completedAt'> = {
            userId: user.id,
            quizId: quiz.id,
            classId: classId || null,
            topic: quiz.topic,
            score: score,
            totalQuestions: questions.length,
        };
        saveQuizAttemptToSupabase(attempt);
        // Show reward breakdown if user earned XP
        if (!isPublicFlow && lastBreakdown && lastBreakdown.totalXP > 0) {
          setShowRewardBreakdown(true);
        }
      }
      setQuizState('completed');
    }
  };
  
  const handleGetFeedback = async (record: AnswerRecord) => {
    setIsFeedbackModalOpen(true);
    setIsFeedbackLoading(true);
    setFeedbackData(null);

    try {
        const feedback = await generateModelAnswer({
            topic: quiz?.topic || 'general',
            question: record.question.stem,
            correctAnswer: record.question.correctAnswer as string,
            studentAnswer: record.selectedAnswer
        });
        setFeedbackData(feedback);
    } catch (error) {
        console.error("Error getting AI feedback:", error);
        setFeedbackData({
            modelAnswer: "Error",
            feedback: "Sorry, I couldn't generate feedback at this moment. Please try again."
        });
    } finally {
        setIsFeedbackLoading(false);
    }
  }

  const resetQuiz = () => {
    setQuizState('idle');
    setQuiz(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerState('unanswered');
    setScore(0);
    setAnswerLog([]);
  }

  if (quizState === 'idle') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Start Quiz: {topic}</CardTitle>
          <CardDescription>
            Test your knowledge with a set of questions on this topic.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={startQuiz} className="w-full">
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (quizState === 'loading') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
        <CardFooter>
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isLoadingAi ? 'Generating AI Quiz...' : 'Loading Quiz...'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (quizState === 'error') {
     return (
        <Card className="w-full max-w-2xl mx-auto text-center">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive">Error</CardTitle>
                <CardDescription>
                    We couldn't load the quiz for this topic. Please try again later.
                </CardDescription>
            </CardHeader>
             <CardFooter>
                <Button onClick={resetQuiz} variant="outline" className="w-full">
                    Go Back
                </Button>
            </CardFooter>
        </Card>
     )
  }

  if (quizState === 'completed') {
     return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-full w-fit">
            <Award className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-3xl mt-4">Quiz Complete!</CardTitle>
           <CardDescription>
            {isPublicFlow ? "Great job! Sign up to save your progress." : `You've earned ${score * 10} XP!`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-5xl font-bold">{score}/{questions.length}</p>
          <p className="text-center text-muted-foreground mt-2">Correct Answers</p>

          <div className="mt-8 space-y-4">
            <h3 className="font-bold text-lg text-center">Your Answers</h3>
            {answerLog.map((record, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-foreground truncate">{index + 1}. {record.question.stem}</p>
                    <div className="mt-2 text-sm">
                      {record.isCorrect ? (
                        <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p><span className="font-semibold">Your answer:</span> {record.selectedAnswer}</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                           <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <p><span className="font-semibold">Your answer:</span> {record.selectedAnswer}</p>
                           </div>
                           <div className="flex items-start gap-2 text-foreground">
                              <CheckCircle className="h-4 w-4 mt-0.5 text-green-700 dark:text-green-400 flex-shrink-0" />
                              <p><span className="font-semibold">Correct answer:</span> {record.question.correctAnswer}</p>
                           </div>
                        </div>
                      )}
                    </div>
                    {!record.isCorrect && (
                        <div className="flex justify-end mt-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div tabIndex={0}> 
                                            <Button size="sm" variant="secondary" onClick={() => handleGetFeedback(record)} disabled={!isSubscribed}>
                                                <Bot className="h-4 w-4 mr-1.5"/> Get AI Feedback
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {!isSubscribed && (
                                    <TooltipContent>
                                        <p>Upgrade to Pro to unlock AI feedback.</p>
                                    </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          {isPublicFlow && (
            <Button asChild className="w-full">
              <Link href="/signup">Sign Up to Save Progress</Link>
            </Button>
          )}
          <Button onClick={resetQuiz} className="w-full" variant={isPublicFlow ? 'secondary' : 'default'}>
            <Repeat className="mr-2 h-4 w-4" />
            Take Another Quiz
          </Button>
        </CardFooter>
         <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Feedback</DialogTitle>
                    <DialogDescription>
                        Here's a breakdown of the question and your answer.
                    </DialogDescription>
                </DialogHeader>
                 {isFeedbackLoading ? (
                    <div className="space-y-4 py-8">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                 ) : feedbackData ? (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-foreground">Model Answer</h4>
                            <p className="text-sm text-muted-foreground bg-green-500/10 p-3 rounded-md mt-1">{feedbackData.modelAnswer}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">Feedback for You</h4>
                            <p className="text-sm text-muted-foreground">{feedbackData.feedback}</p>
                        </div>
                    </div>
                 ) : null}
                 <DialogFooter>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Reward Breakdown Modal */}
        <RewardBreakdownModal
          isOpen={showRewardBreakdown}
          onClose={() => {
            setShowRewardBreakdown(false);
            clearLastBreakdown();
          }}
          breakdown={lastBreakdown}
          activityName={`${topic} Quiz`}
        />
      </Card>
     );
  }

  if (quizState === 'active' && questions.length > 0) {
    const question = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span className="text-sm font-medium text-primary">Score: {score}</span>
          </div>
          <Progress value={progress} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{question.stem}</CardTitle>
            {quiz?.aiGenerated && (
                <CardDescription className="text-xs text-blue-500 font-semibold">✨ AI-Generated</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedAnswer ?? ''}
              onValueChange={setSelectedAnswer}
              disabled={answerState !== 'unanswered'}
            >
              <div className="space-y-2">
                {question.options?.map((option, index) => {
                  const isCorrect = option.label === question.correctAnswer;
                  const isSelected = option.label === selectedAnswer;
                  let itemState: 'default' | 'correct' | 'incorrect' = 'default';

                  if (answerState !== 'unanswered') {
                    if (isCorrect) itemState = 'correct';
                    else if (isSelected && !isCorrect) itemState = 'incorrect';
                  }

                  return (
                    <Label
                      key={index}
                      htmlFor={`option-${index}`}
                      className={cn(
                        "flex items-center space-x-3 rounded-md border p-4 transition-colors",
                        "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-70",
                        itemState === 'correct' && "border-green-500 bg-green-500/10",
                        itemState === 'incorrect' && "border-red-500 bg-red-500/10",
                        selectedAnswer === option.label && answerState === 'unanswered' && "border-primary"
                      )}
                    >
                      <RadioGroupItem value={option.label} id={`option-${index}`} />
                      <span className="text-foreground">{option.label}</span>
                       {itemState === 'correct' && <CheckCircle className="ml-auto h-5 w-5 text-green-500"/>}
                       {itemState === 'incorrect' && <XCircle className="ml-auto h-5 w-5 text-red-500"/>}
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter>
            {answerState === 'unanswered' ? (
              <Button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer}
                className="w-full"
              >
                Submit
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} className="w-full">
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </Button>
            )}
          </CardFooter>
        </Card>

        {answerState !== 'unanswered' && (
           <Alert variant={answerState === 'correct' ? 'default' : 'destructive'} className={cn(
             answerState === 'correct' && 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 [&>svg]:text-green-500'
           )}>
            <AlertTitle className="flex items-center gap-2">
              {answerState === 'correct' ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
              {answerState === 'correct' ? "Correct!" : "Incorrect"}
            </AlertTitle>
            <AlertDescription className="pl-6 text-foreground">
              {question.explanation}
              {answerState === 'incorrect' && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Need to review this topic?</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`../notes`}>
                      📚 View Revision Notes
                    </Link>
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return null;
}
