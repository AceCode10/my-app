/**
 * Submit Attempt API
 * POST /api/v1/attempts/:attemptId/submit
 * 
 * Finalizes an assessment attempt and triggers auto-grading
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SubmitRequest {
  answers?: {
    [questionId: string]: {
      answer?: string;
      selectedChoiceId?: string;
      timeTaken?: number;
    };
  };
  autoSubmit?: boolean; // True if submitted by timer expiry
}

interface GradingDetail {
  questionId: string;
  isCorrect: boolean | null;
  marksAwarded: number;
  maxMarks: number;
  autoGraded: boolean;
  feedback?: string;
}

export async function POST(
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

    // Parse request body
    const body: SubmitRequest = await request.json().catch(() => ({}));
    const { answers: finalAnswers, autoSubmit = false } = body;

    // Try to find attempt in assessment_attempts first, then test_attempts
    let attempt: any = null;
    let tableName = 'assessment_attempts';

    const { data: assessmentAttempt } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (assessmentAttempt) {
      attempt = assessmentAttempt;
      tableName = 'assessment_attempts';
    } else {
      const { data: testAttempt } = await supabase
        .from('test_attempts')
        .select('*, assignment:assignments(*)')
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

    if (attempt.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      return NextResponse.json(
        { error: 'Attempt already submitted' },
        { status: 400 }
      );
    }

    // Merge final answers with existing
    const existingAnswers = attempt.answers || {};
    const mergedAnswers = { ...existingAnswers };

    if (finalAnswers) {
      for (const [questionId, answerData] of Object.entries(finalAnswers)) {
        mergedAnswers[questionId] = {
          ...(mergedAnswers[questionId] || {}),
          ...answerData,
          submittedAt: new Date().toISOString()
        };
      }
    }

    // Perform auto-grading
    const gradingResult = await autoGradeAttempt(supabase, attempt, mergedAnswers, tableName);

    // Calculate time spent
    const startedAt = new Date(attempt.started_at);
    const submittedAt = new Date();
    const timeSpentSeconds = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000);

    // Determine status based on grading
    const status = gradingResult.needsManualGrading ? 'submitted' : 'graded';

    // Update the attempt
    const updateData = {
      answers: mergedAnswers,
      status,
      submitted_at: submittedAt.toISOString(),
      time_spent_seconds: timeSpentSeconds,
      score: gradingResult.totalScore,
      max_score: gradingResult.maxScore,
      percentage: gradingResult.maxScore > 0 
        ? Math.round((gradingResult.totalScore / gradingResult.maxScore) * 100 * 10) / 10 
        : 0,
      auto_graded: true,
      requires_manual_grading: gradingResult.needsManualGrading,
      grading_details: gradingResult.details,
      updated_at: submittedAt.toISOString()
    };

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', attemptId);

    if (updateError) {
      console.error('Error submitting attempt:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit attempt' },
        { status: 500 }
      );
    }

    // Award XP for completing the assessment
    await awardCompletionXP(supabase, user.id, gradingResult);

    // Determine when results are available
    let resultsAvailableAt: string | null = null;
    const assignment = attempt.assignment;

    if (assignment) {
      switch (assignment.show_results) {
        case 'immediately':
          resultsAvailableAt = submittedAt.toISOString();
          break;
        case 'after_due':
          resultsAvailableAt = assignment.due_at;
          break;
        case 'manual':
          resultsAvailableAt = null; // Teacher must release
          break;
        default:
          resultsAvailableAt = submittedAt.toISOString();
      }
    } else {
      // Self-practice: immediate results
      resultsAvailableAt = submittedAt.toISOString();
    }

    return NextResponse.json({
      attemptId,
      status,
      autoSubmit,
      score: gradingResult.totalScore,
      maxScore: gradingResult.maxScore,
      percentage: updateData.percentage,
      autoGradeComplete: true,
      needsManualGrading: gradingResult.needsManualGrading,
      manualGradingCount: gradingResult.manualGradingCount,
      resultsAvailableAt,
      submittedAt: submittedAt.toISOString(),
      timeSpentSeconds
    });

  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// Auto-grade the attempt
async function autoGradeAttempt(
  supabase: any,
  attempt: any,
  answers: Record<string, any>,
  tableName: string
): Promise<{
  totalScore: number;
  maxScore: number;
  details: GradingDetail[];
  needsManualGrading: boolean;
  manualGradingCount: number;
}> {
  const details: GradingDetail[] = [];
  let totalScore = 0;
  let maxScore = 0;
  let manualGradingCount = 0;

  // Get questions based on attempt type
  let questions: any[] = [];

  if (attempt.questions_snapshot) {
    // Get question IDs from snapshot
    const questionIds = attempt.questions_snapshot.map((q: any) => q.questionId);
    
    if (questionIds.length > 0) {
      const { data } = await supabase
        .from('questions')
        .select(`
          *,
          choices:question_choices(*)
        `)
        .in('id', questionIds);

      questions = data || [];
    }
  } else if (attempt.paper_id) {
    // Get paper questions
    const { data } = await supabase
      .from('paper_questions')
      .select('*')
      .eq('paper_id', attempt.paper_id);

    questions = data || [];
  } else if (attempt.test_id) {
    // Get test questions from sections
    const { data: test } = await supabase
      .from('tests')
      .select('sections')
      .eq('id', attempt.test_id)
      .single();

    if (test?.sections) {
      const questionIds: string[] = [];
      for (const section of test.sections) {
        for (const q of section.questions || []) {
          questionIds.push(q.questionId || q.id);
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

        questions = data || [];
      }
    }
  }

  // Grade each question
  for (const question of questions) {
    const questionId = question.id;
    const answer = answers[questionId];
    const questionMarks = question.marks || 1;
    maxScore += questionMarks;

    if (!answer) {
      // No answer provided
      details.push({
        questionId,
        isCorrect: false,
        marksAwarded: 0,
        maxMarks: questionMarks,
        autoGraded: true,
        feedback: 'No answer provided'
      });
      continue;
    }

    const gradeResult = gradeAnswer(question, answer);
    
    if (gradeResult.needsManualGrading) {
      manualGradingCount++;
      details.push({
        questionId,
        isCorrect: null,
        marksAwarded: 0,
        maxMarks: questionMarks,
        autoGraded: false,
        feedback: 'Awaiting teacher grading'
      });
    } else {
      totalScore += gradeResult.marksAwarded;
      details.push({
        questionId,
        isCorrect: gradeResult.isCorrect,
        marksAwarded: gradeResult.marksAwarded,
        maxMarks: questionMarks,
        autoGraded: true,
        feedback: gradeResult.feedback
      });
    }
  }

  return {
    totalScore,
    maxScore,
    details,
    needsManualGrading: manualGradingCount > 0,
    manualGradingCount
  };
}

// Grade a single answer
function gradeAnswer(
  question: any,
  answer: any
): {
  isCorrect: boolean;
  marksAwarded: number;
  needsManualGrading: boolean;
  feedback?: string;
} {
  const questionType = question.question_type;
  const marks = question.marks || 1;

  // MCQ - exact match
  if (questionType === 'mcq' && answer.selectedChoiceId) {
    const correctChoice = question.choices?.find((c: any) => c.is_correct);
    const isCorrect = answer.selectedChoiceId === correctChoice?.id;
    
    return {
      isCorrect,
      marksAwarded: isCorrect ? marks : 0,
      needsManualGrading: false,
      feedback: isCorrect ? 'Correct!' : `Correct answer: ${correctChoice?.choice_text || 'N/A'}`
    };
  }

  // True/False
  if (questionType === 'true_false' && answer.answer) {
    const normalizedAnswer = answer.answer.toLowerCase().trim();
    const normalizedCorrect = (question.correct_answer || '').toLowerCase().trim();
    const isCorrect = normalizedAnswer === normalizedCorrect;
    
    return {
      isCorrect,
      marksAwarded: isCorrect ? marks : 0,
      needsManualGrading: false,
      feedback: isCorrect ? 'Correct!' : `Correct answer: ${question.correct_answer}`
    };
  }

  // Calculation/Numeric - with tolerance
  if (questionType === 'calculation' && answer.answer && question.correct_answer) {
    const studentNum = parseFloat(answer.answer.replace(/[^\d.-]/g, ''));
    const correctNum = parseFloat(question.correct_answer.replace(/[^\d.-]/g, ''));

    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      const tolerance = 0.01; // 1% tolerance
      const isCorrect = Math.abs(studentNum - correctNum) <= Math.abs(correctNum * tolerance);

      return {
        isCorrect,
        marksAwarded: isCorrect ? marks : 0,
        needsManualGrading: false,
        feedback: isCorrect ? 'Correct!' : `Expected: ${correctNum}`
      };
    }
  }

  // Short answer - fuzzy matching
  if (questionType === 'short_answer' && answer.answer && question.correct_answer) {
    const similarity = calculateSimilarity(
      answer.answer.toLowerCase().trim(),
      question.correct_answer.toLowerCase().trim()
    );

    if (similarity > 0.9) {
      return {
        isCorrect: true,
        marksAwarded: marks,
        needsManualGrading: false,
        feedback: 'Correct!'
      };
    }

    if (similarity > 0.7) {
      // Close match - needs review
      return {
        isCorrect: false,
        marksAwarded: 0,
        needsManualGrading: true,
        feedback: 'Close match - needs teacher review'
      };
    }

    return {
      isCorrect: false,
      marksAwarded: 0,
      needsManualGrading: false,
      feedback: 'Incorrect'
    };
  }

  // Essay, long answer, fill-in-blank - needs manual grading
  return {
    isCorrect: false,
    marksAwarded: 0,
    needsManualGrading: true,
    feedback: 'Awaiting teacher grading'
  };
}

// Calculate string similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Award XP for completing assessment
async function awardCompletionXP(
  supabase: any,
  userId: string,
  gradingResult: { totalScore: number; maxScore: number }
): Promise<void> {
  try {
    // Calculate XP based on score
    const percentage = gradingResult.maxScore > 0 
      ? (gradingResult.totalScore / gradingResult.maxScore) * 100 
      : 0;

    let xpAwarded = 10; // Base XP for completion

    if (percentage >= 90) {
      xpAwarded = 50;
    } else if (percentage >= 70) {
      xpAwarded = 30;
    } else if (percentage >= 50) {
      xpAwarded = 20;
    }

    // Update user XP
    const { data: userData } = await supabase
      .from('users')
      .select('xp')
      .eq('id', userId)
      .single();

    const currentXP = userData?.xp || 0;

    await supabase
      .from('users')
      .update({ xp: currentXP + xpAwarded })
      .eq('id', userId);

    // Log XP transaction
    await supabase
      .from('xp_transactions')
      .insert({
        user_id: userId,
        amount: xpAwarded,
        reason: 'assessment_completion',
        metadata: {
          score: gradingResult.totalScore,
          maxScore: gradingResult.maxScore,
          percentage
        }
      })
      .select()
      .single();

  } catch (error) {
    console.error('Error awarding XP:', error);
    // Don't fail the submission if XP award fails
  }
}
