/**
 * Get Attempt Results API
 * GET /api/v1/attempts/:attemptId/results
 * 
 * Returns detailed results for a submitted attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to find attempt in assessment_attempts first, then test_attempts
    let attempt: any = null;
    let tableName = 'assessment_attempts';

    const { data: assessmentAttempt } = await supabase
      .from('assessment_attempts')
      .select(`
        *,
        paper:past_papers(
          id, title, year, session, paper_number, variant,
          subject:subjects(id, name, slug),
          exam_board:exam_boards(id, name, short_name)
        ),
        topic:topics(id, name)
      `)
      .eq('id', attemptId)
      .single();

    if (assessmentAttempt) {
      attempt = assessmentAttempt;
      tableName = 'assessment_attempts';
    } else {
      const { data: testAttempt } = await supabase
        .from('test_attempts')
        .select(`
          *,
          test:tests(id, title, description, subject_id, total_marks),
          assignment:assignments(
            id, title, show_results, results_released, due_at, assigned_by
          )
        `)
        .eq('id', attemptId)
        .single();

      if (testAttempt) {
        attempt = testAttempt;
        tableName = 'test_attempts';
      }
    }

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    // Check access - user must own the attempt or be the teacher
    const isOwner = attempt.user_id === user.id;
    let isTeacher = false;

    if (attempt.assignment?.assigned_by === user.id) {
      isTeacher = true;
    }

    if (!isOwner && !isTeacher) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if results are available
    if (isOwner && !isTeacher) {
      const resultsAvailable = checkResultsAvailability(attempt);
      if (!resultsAvailable.available) {
        return NextResponse.json(
          { 
            error: 'Results not available yet',
            message: resultsAvailable.message,
            availableAt: resultsAvailable.availableAt
          },
          { status: 403 }
        );
      }
    }

    // Get questions with solutions
    const questions = await getQuestionsWithSolutions(supabase, attempt, tableName);

    // Build response
    const answers = attempt.answers || {};
    const gradingDetails = attempt.grading_details || [];

    const questionResults = questions.map((question: any) => {
      const answer = answers[question.id] || {};
      const grading = gradingDetails.find((g: any) => g.questionId === question.id) || {};

      return {
        id: question.id,
        questionNumber: question.question_number || question.order,
        questionText: question.stem_markdown || question.question_text,
        questionType: question.question_type,
        marks: question.marks || 1,
        yourAnswer: answer.answer || answer.selectedChoiceId || null,
        correctAnswer: question.correct_answer,
        isCorrect: grading.isCorrect,
        marksAwarded: grading.marksAwarded || 0,
        maxMarks: grading.maxMarks || question.marks || 1,
        explanation: question.explanation,
        markScheme: question.mark_scheme,
        examinerComments: question.examiner_comments,
        teacherFeedback: grading.teacherFeedback || null,
        choices: question.choices?.map((c: any) => ({
          id: c.id,
          text: c.choice_text,
          isCorrect: c.is_correct
        }))
      };
    });

    // Calculate summary
    const totalQuestions = questionResults.length;
    const correct = questionResults.filter((q: any) => q.isCorrect === true).length;
    const incorrect = questionResults.filter((q: any) => q.isCorrect === false).length;
    const unanswered = questionResults.filter((q: any) => !q.yourAnswer).length;
    const pendingGrading = questionResults.filter((q: any) => q.isCorrect === null).length;

    // Build title
    let title = 'Assessment Results';
    if (attempt.paper) {
      title = `${attempt.paper.subject?.name || 'Paper'} - ${attempt.paper.year} ${attempt.paper.session || ''} Paper ${attempt.paper.paper_number || ''}`.trim();
    } else if (attempt.test) {
      title = attempt.test.title;
    } else if (attempt.topic) {
      title = `${attempt.topic.name} Practice`;
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        title,
        score: attempt.score || 0,
        maxScore: attempt.max_score || 0,
        percentage: attempt.percentage || 0,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        timeSpent: attempt.time_spent_seconds,
        status: attempt.status,
        practiceMode: attempt.practice_mode
      },
      questions: questionResults,
      summary: {
        totalQuestions,
        correct,
        incorrect,
        unanswered,
        pendingGrading,
        byDifficulty: calculateDifficultyBreakdown(questions, questionResults)
      }
    });

  } catch (error) {
    console.error('Results error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// Check if results are available based on release policy
function checkResultsAvailability(attempt: any): {
  available: boolean;
  message?: string;
  availableAt?: string;
} {
  // Self-practice: always available after submission
  if (!attempt.assignment_id) {
    if (attempt.status === 'in_progress') {
      return { available: false, message: 'Please submit your attempt first' };
    }
    return { available: true };
  }

  const assignment = attempt.assignment;
  if (!assignment) {
    return { available: true };
  }

  // Check release policy
  switch (assignment.show_results) {
    case 'immediately':
      return { available: attempt.status !== 'in_progress' };

    case 'after_submit':
      return { available: attempt.status !== 'in_progress' };

    case 'after_due':
      if (assignment.due_at && new Date(assignment.due_at) > new Date()) {
        return {
          available: false,
          message: 'Results will be available after the due date',
          availableAt: assignment.due_at
        };
      }
      return { available: true };

    case 'manual':
      if (!assignment.results_released) {
        return {
          available: false,
          message: 'Results will be released by your teacher'
        };
      }
      return { available: true };

    default:
      return { available: true };
  }
}

// Get questions with solutions
async function getQuestionsWithSolutions(
  supabase: any,
  attempt: any,
  tableName: string
): Promise<any[]> {
  let questions: any[] = [];

  if (attempt.questions_snapshot) {
    const questionIds = attempt.questions_snapshot.map((q: any) => q.questionId);
    
    if (questionIds.length > 0) {
      const { data } = await supabase
        .from('questions')
        .select(`
          *,
          choices:question_choices(*)
        `)
        .in('id', questionIds);

      // Preserve order from snapshot
      const questionMap = new Map((data || []).map((q: any) => [q.id, q]));
      questions = attempt.questions_snapshot.map((snap: any, idx: number) => {
        const questionData = questionMap.get(snap.questionId) || {};
        return {
          ...questionData,
          order: snap.order || idx + 1,
          marks: snap.marks
        };
      }).filter((q: any) => q.id);
    }
  } else if (attempt.paper_id) {
    const { data } = await supabase
      .from('paper_questions')
      .select('*')
      .eq('paper_id', attempt.paper_id)
      .order('question_number', { ascending: true });

    questions = data || [];
  } else if (attempt.test_id) {
    const { data: test } = await supabase
      .from('tests')
      .select('sections')
      .eq('id', attempt.test_id)
      .single();

    if (test?.sections) {
      const questionIds: string[] = [];
      const orderMap = new Map<string, number>();
      let order = 1;

      for (const section of test.sections) {
        for (const q of section.questions || []) {
          const qId = q.questionId || q.id;
          questionIds.push(qId);
          orderMap.set(qId, order++);
        }
      }

      if (questionIds.length > 0) {
        const { data } = await supabase
          .from('questions')
          .select(`
            *,
            choices:question_choices(*)
          `)
          .in('id', questionIds);

        questions = (data || []).map((q: any) => ({
          ...q,
          order: orderMap.get(q.id) || 0
        })).sort((a: any, b: any) => a.order - b.order);
      }
    }
  }

  return questions;
}

// Calculate breakdown by difficulty
function calculateDifficultyBreakdown(
  questions: any[],
  results: any[]
): Record<string, { total: number; correct: number; percentage: number }> {
  const breakdown: Record<string, { total: number; correct: number }> = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 }
  };

  questions.forEach((q: any, idx: number) => {
    const difficulty = q.difficulty || 'medium';
    const result = results[idx];

    if (breakdown[difficulty]) {
      breakdown[difficulty].total++;
      if (result?.isCorrect) {
        breakdown[difficulty].correct++;
      }
    }
  });

  return Object.fromEntries(
    Object.entries(breakdown).map(([key, value]) => [
      key,
      {
        ...value,
        percentage: value.total > 0 
          ? Math.round((value.correct / value.total) * 100) 
          : 0
      }
    ])
  );
}
