'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TestInterface } from '@/components/assessment/TestInterface';
import { createClient } from '@/lib/supabase/client';
import { Assessment, AssessmentAttempt, Question, SubmitAnswerRequest } from '@/types/assessment';
import { autoGradeAnswer } from '@/lib/assessment-utils';

interface PageProps {
  params: {
    id: string;
    attemptId: string;
  };
}

export default function TakeAssessmentPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessmentData();
  }, [params.id, params.attemptId]);

  const loadAssessmentData = async () => {
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

      // Check if attempt is still valid
      if (attemptData.status !== 'in_progress') {
        router.push(`/student/assessments/${params.id}/results/${params.attemptId}`);
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

      // Randomize if needed
      if (assessmentData.randomize_questions) {
        questionsList.sort(() => Math.random() - 0.5);
      }

      // Randomize answer choices if needed
      if (assessmentData.randomize_answers) {
        questionsList.forEach(q => {
          if (q.choices) {
            q.choices.sort(() => Math.random() - 0.5);
          }
        });
      }

      setQuestions(questionsList);

    } catch (err: any) {
      console.error('Error loading assessment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (answer: SubmitAnswerRequest) => {
    try {
      // Find the question
      const question = questions.find(q => q.id === answer.question_id);
      if (!question) return;

      // Auto-grade the answer
      const gradingResult = autoGradeAnswer({
        question,
        answer: answer.answer_text || null,
        selected_choice_id: answer.selected_choice_id || null
      });

      // Save answer to database
      const { error } = await supabase
        .from('assessment_answers')
        .upsert({
          attempt_id: answer.attempt_id,
          question_id: answer.question_id,
          answer_text: answer.answer_text,
          selected_choice_id: answer.selected_choice_id,
          is_correct: gradingResult.is_correct,
          marks_awarded: gradingResult.marks_awarded,
          max_marks: question.marks,
          flagged_for_review: answer.flagged_for_review,
          time_spent_seconds: answer.time_spent_seconds
        }, {
          onConflict: 'attempt_id,question_id'
        });

      if (error) throw error;

    } catch (err) {
      console.error('Error submitting answer:', err);
      throw err;
    }
  };

  const handleSubmitAssessment = async () => {
    if (!attempt || !assessment) return;

    try {
      // Calculate total score
      const { data: answers, error: answersError } = await supabase
        .from('assessment_answers')
        .select('marks_awarded, is_correct')
        .eq('attempt_id', attempt.id);

      if (answersError) throw answersError;

      const totalScore = answers?.reduce((sum, a) => sum + (a.marks_awarded || 0), 0) || 0;
      const maxScore = assessment.total_marks || 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Calculate time spent
      const startTime = new Date(attempt.started_at).getTime();
      const endTime = Date.now();
      const timeSpent = Math.floor((endTime - startTime) / 1000);

      // Update attempt
      const { error: updateError } = await supabase
        .from('assessment_attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          score: totalScore,
          percentage: percentage,
          max_score: maxScore,
          time_spent_seconds: timeSpent
        })
        .eq('id', attempt.id);

      if (updateError) throw updateError;

      // Navigate to results
      router.push(`/student/assessments/${params.id}/results/${params.attemptId}`);

    } catch (err) {
      console.error('Error submitting assessment:', err);
      throw err;
    }
  };

  const handleAutoSave = async () => {
    // Auto-save is handled by individual answer submissions
    console.log('Auto-save triggered');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment || !attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Failed to load assessment'}</p>
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
    <TestInterface
      assessment={assessment}
      attempt={attempt}
      questions={questions}
      onSubmitAnswer={handleSubmitAnswer}
      onSubmitAssessment={handleSubmitAssessment}
      onAutoSave={handleAutoSave}
    />
  );
}
