'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ResultsView } from '@/components/assessment/ResultsView';
import { createClient } from '@/lib/supabase/client';
import { Assessment, AssessmentAttempt, Question, AssessmentAnswer } from '@/types/assessment';

export default function AssessmentResultsPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  const attemptId = params.attemptId as string;
  const supabase = createClient();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [teacherFeedback, setTeacherFeedback] = useState<string | null>(null);
  const [gradingDetails, setGradingDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignmentId && attemptId) {
      loadResultsData();
    }
  }, [assignmentId, attemptId]);

  const loadResultsData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // First try to load from test_attempts (new system)
      const { data: testAttemptData, error: testAttemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .single();

      if (testAttemptData) {
        // New system - load from test_attempts
        
        // Check if attempt is completed
        if (testAttemptData.status === 'in_progress') {
          router.push(`/student/assessments/${assignmentId}/take/${attemptId}`);
          return;
        }

        // Get assignment to find assessment_id
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select('assessment_id')
          .eq('id', testAttemptData.assignment_id)
          .single();

        const assessmentId = assignmentData?.assessment_id || testAttemptData.test_id;

        // Load assessment
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select(`
            *,
            assessment_type:assessment_types(*),
            subject:subjects(*),
            exam_board:exam_boards(*),
            topic:topics(*)
          `)
          .eq('id', assessmentId)
          .single();

        if (assessmentError) throw assessmentError;
        setAssessment(assessmentData);

        // Convert test_attempt to AssessmentAttempt format
        setAttempt({
          id: testAttemptData.id,
          assessment_id: assessmentId,
          user_id: testAttemptData.user_id,
          started_at: testAttemptData.started_at,
          submitted_at: testAttemptData.submitted_at,
          status: testAttemptData.status,
          score: testAttemptData.total_score,
          max_score: testAttemptData.max_score,
          percentage: testAttemptData.percentage,
          attempt_number: 1,
          time_spent_seconds: testAttemptData.time_spent_seconds
        } as any);

        // Store teacher feedback and grading details
        setTeacherFeedback(testAttemptData.teacher_feedback);
        setGradingDetails(testAttemptData.grading_details || []);

        // Load questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('assessment_questions')
          .select(`
            *,
            question:questions(
              *,
              choices:question_choices(*)
            )
          `)
          .eq('assessment_id', assessmentId)
          .order('question_order', { ascending: true });

        if (questionsError) throw questionsError;

        const questionsList = questionsData?.map(aq => ({
          ...aq.question,
          choices: aq.question.choices || []
        })) || [];

        setQuestions(questionsList);

        // Convert answers from test_attempts.answers JSON to AssessmentAnswer format
        const answersFromAttempt = testAttemptData.answers || {};
        const answersList = Object.entries(answersFromAttempt).map(([questionId, answerData]: [string, any]) => ({
          id: `${attemptId}-${questionId}`,
          attempt_id: attemptId,
          question_id: questionId,
          answer_text: answerData.answer_text || answerData.text || null,
          selected_choice_id: answerData.selected_choice_id || null,
          is_correct: answerData.is_correct ?? null,
          marks_awarded: answerData.marks_awarded ?? null,
          feedback: answerData.feedback || null,
          created_at: new Date().toISOString()
        })) as AssessmentAnswer[];

        setAnswers(answersList);

      } else {
        // Fallback to old assessment_attempts system
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select(`
            *,
            assessment_type:assessment_types(*),
            subject:subjects(*),
            exam_board:exam_boards(*),
            topic:topics(*)
          `)
          .eq('id', assignmentId)
          .single();

        if (assessmentError) throw assessmentError;
        setAssessment(assessmentData);

        const { data: attemptData, error: attemptError } = await supabase
          .from('assessment_attempts')
          .select('*')
          .eq('id', attemptId)
          .eq('user_id', user.id)
          .single();

        if (attemptError) throw attemptError;

        if (attemptData.status === 'in_progress') {
          router.push(`/student/assessments/${assignmentId}/take/${attemptId}`);
          return;
        }

        setAttempt(attemptData);

        const { data: questionsData, error: questionsError } = await supabase
          .from('assessment_questions')
          .select(`
            *,
            question:questions(
              *,
              choices:question_choices(*)
            )
          `)
          .eq('assessment_id', assignmentId)
          .order('question_order', { ascending: true });

        if (questionsError) throw questionsError;

        const questionsList = questionsData?.map(aq => ({
          ...aq.question,
          choices: aq.question.choices || []
        })) || [];

        setQuestions(questionsList);

        const { data: answersData, error: answersError } = await supabase
          .from('assessment_answers')
          .select('*')
          .eq('attempt_id', attemptId);

        if (answersError) throw answersError;
        setAnswers(answersData || []);
      }

    } catch (err: any) {
      console.error('Error loading results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!assessment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create new attempt using test_attempts
      const { data: newAttempt, error } = await supabase
        .from('test_attempts')
        .insert({
          assignment_id: assignmentId,
          test_id: assessment.id,
          user_id: user.id,
          started_at: new Date().toISOString(),
          status: 'in_progress',
          answers: {}
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to new attempt
      router.push(`/student/assessments/${assignmentId}/take/${newAttempt.id}`);
    } catch (err) {
      console.error('Error creating retry attempt:', err);
      alert('Failed to start retry. Please try again.');
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF generation
    alert('PDF download feature coming soon!');
  };

  const handleGoHome = () => {
    router.push('/student/assessments');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment || !attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Failed to load results'}</p>
          <button
            onClick={() => router.push('/student/assessments')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <ResultsView
      assessment={assessment}
      attempt={attempt}
      questions={questions}
      answers={answers}
      teacherFeedback={teacherFeedback}
      gradingDetails={gradingDetails}
      onRetry={handleRetry}
      onDownloadPDF={handleDownloadPDF}
      onGoHome={handleGoHome}
    />
  );
}
