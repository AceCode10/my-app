'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResultsView } from '@/components/assessment/ResultsView';
import { createClient } from '@/lib/supabase/client';
import { Assessment, AssessmentAttempt, Question, AssessmentAnswer } from '@/types/assessment';

interface PageProps {
  params: {
    id: string;
    attemptId: string;
  };
}

export default function AssessmentResultsPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResultsData();
  }, [params.id, params.attemptId]);

  const loadResultsData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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
        .eq('id', params.id)
        .single();

      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData);

      // Load attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', params.attemptId)
        .eq('user_id', user.id)
        .single();

      if (attemptError) throw attemptError;

      // Check if attempt is completed
      if (attemptData.status === 'in_progress') {
        router.push(`/student/assessments/${params.id}/take/${params.attemptId}`);
        return;
      }

      setAttempt(attemptData);

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
        .eq('assessment_id', params.id)
        .order('question_order', { ascending: true });

      if (questionsError) throw questionsError;

      const questionsList = questionsData?.map(aq => ({
        ...aq.question,
        choices: aq.question.choices || []
      })) || [];

      setQuestions(questionsList);

      // Load answers
      const { data: answersData, error: answersError } = await supabase
        .from('assessment_answers')
        .select('*')
        .eq('attempt_id', params.attemptId);

      if (answersError) throw answersError;
      setAnswers(answersData || []);

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

      // Create new attempt
      const { data: newAttempt, error } = await supabase
        .from('assessment_attempts')
        .insert({
          assessment_id: assessment.id,
          user_id: user.id,
          started_at: new Date().toISOString(),
          status: 'in_progress',
          attempt_number: (attempt?.attempt_number || 0) + 1
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to new attempt
      router.push(`/student/assessments/${assessment.id}/take/${newAttempt.id}`);
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
      onRetry={handleRetry}
      onDownloadPDF={handleDownloadPDF}
      onGoHome={handleGoHome}
    />
  );
}
