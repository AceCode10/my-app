/**
 * Auto-Submit Expired Attempts API
 * POST /api/v1/attempts/auto-submit-expired
 * 
 * Called by cron job to auto-submit timed attempts that have expired.
 * This endpoint should be called every minute by a scheduled job.
 * 
 * Security: Uses a secret key to authorize cron requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Secret key for cron authorization
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');
    
    const isAuthorized = 
      authHeader === `Bearer ${CRON_SECRET}` ||
      cronSecret === CRON_SECRET;

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      assessmentAttempts: { found: 0, submitted: 0, errors: 0 },
      testAttempts: { found: 0, submitted: 0, errors: 0 }
    };

    // Find and submit expired assessment_attempts
    const { data: expiredAssessmentAttempts, error: assessmentError } = await supabaseAdmin
      .from('assessment_attempts')
      .select('id, user_id, expires_at')
      .eq('status', 'in_progress')
      .not('expires_at', 'is', null)
      .lt('expires_at', now.toISOString());

    if (assessmentError) {
      console.error('Error fetching expired assessment attempts:', assessmentError);
    } else if (expiredAssessmentAttempts) {
      results.assessmentAttempts.found = expiredAssessmentAttempts.length;

      for (const attempt of expiredAssessmentAttempts) {
        try {
          await autoSubmitAttempt(attempt.id, 'assessment_attempts', attempt.user_id);
          results.assessmentAttempts.submitted++;
        } catch (error) {
          console.error(`Error auto-submitting assessment attempt ${attempt.id}:`, error);
          results.assessmentAttempts.errors++;
        }
      }
    }

    // Find and submit expired test_attempts
    const { data: expiredTestAttempts, error: testError } = await supabaseAdmin
      .from('test_attempts')
      .select('id, user_id, expires_at')
      .eq('status', 'in_progress')
      .not('expires_at', 'is', null)
      .lt('expires_at', now.toISOString());

    if (testError) {
      console.error('Error fetching expired test attempts:', testError);
    } else if (expiredTestAttempts) {
      results.testAttempts.found = expiredTestAttempts.length;

      for (const attempt of expiredTestAttempts) {
        try {
          await autoSubmitAttempt(attempt.id, 'test_attempts', attempt.user_id);
          results.testAttempts.submitted++;
        } catch (error) {
          console.error(`Error auto-submitting test attempt ${attempt.id}:`, error);
          results.testAttempts.errors++;
        }
      }
    }

    const totalSubmitted = results.assessmentAttempts.submitted + results.testAttempts.submitted;
    const totalErrors = results.assessmentAttempts.errors + results.testAttempts.errors;

    return NextResponse.json({
      success: true,
      message: `Auto-submitted ${totalSubmitted} expired attempts`,
      results,
      processedAt: now.toISOString()
    });

  } catch (error) {
    console.error('Auto-submit cron error:', error);
    return NextResponse.json(
      { error: 'Server error', message: String(error) },
      { status: 500 }
    );
  }
}

// Auto-submit a single attempt
async function autoSubmitAttempt(
  attemptId: string,
  tableName: 'assessment_attempts' | 'test_attempts',
  userId: string
): Promise<void> {
  // Get the attempt with answers
  const { data: attempt, error: fetchError } = await supabaseAdmin
    .from(tableName)
    .select('*')
    .eq('id', attemptId)
    .single();

  if (fetchError || !attempt) {
    throw new Error(`Failed to fetch attempt: ${fetchError?.message}`);
  }

  // Perform auto-grading
  const gradingResult = await autoGradeAttempt(attempt, tableName);

  // Calculate time spent
  const startedAt = new Date(attempt.started_at);
  const submittedAt = new Date();
  const timeSpentSeconds = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000);

  // Update the attempt
  const { error: updateError } = await supabaseAdmin
    .from(tableName)
    .update({
      status: gradingResult.needsManualGrading ? 'submitted' : 'graded',
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
    })
    .eq('id', attemptId);

  if (updateError) {
    throw new Error(`Failed to update attempt: ${updateError.message}`);
  }

  // Create notification for user
  await createAutoSubmitNotification(userId, attemptId, tableName);

  // Award XP
  await awardCompletionXP(userId, gradingResult);
}

// Auto-grade attempt (simplified version for cron)
async function autoGradeAttempt(
  attempt: any,
  tableName: string
): Promise<{
  totalScore: number;
  maxScore: number;
  details: any[];
  needsManualGrading: boolean;
}> {
  const answers = attempt.answers || {};
  const details: any[] = [];
  let totalScore = 0;
  let maxScore = attempt.max_score || 0;
  let needsManualGrading = false;

  // Get questions based on snapshot or paper
  let questions: any[] = [];

  if (attempt.questions_snapshot) {
    const questionIds = attempt.questions_snapshot.map((q: any) => q.questionId);
    
    if (questionIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('questions')
        .select('*, choices:question_choices(*)')
        .in('id', questionIds);

      questions = data || [];
    }
  } else if (attempt.paper_id) {
    const { data } = await supabaseAdmin
      .from('paper_questions')
      .select('*')
      .eq('paper_id', attempt.paper_id);

    questions = data || [];
    maxScore = questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);
  }

  // Grade each question
  for (const question of questions) {
    const answer = answers[question.id];
    const marks = question.marks || 1;

    if (!answer) {
      details.push({
        questionId: question.id,
        isCorrect: false,
        marksAwarded: 0,
        maxMarks: marks,
        autoGraded: true
      });
      continue;
    }

    const gradeResult = gradeAnswer(question, answer);
    
    if (gradeResult.needsManualGrading) {
      needsManualGrading = true;
    }

    totalScore += gradeResult.marksAwarded;
    details.push({
      questionId: question.id,
      isCorrect: gradeResult.isCorrect,
      marksAwarded: gradeResult.marksAwarded,
      maxMarks: marks,
      autoGraded: !gradeResult.needsManualGrading
    });
  }

  return { totalScore, maxScore, details, needsManualGrading };
}

// Grade a single answer
function gradeAnswer(question: any, answer: any): {
  isCorrect: boolean;
  marksAwarded: number;
  needsManualGrading: boolean;
} {
  const questionType = question.question_type;
  const marks = question.marks || 1;

  // MCQ
  if (questionType === 'mcq' && answer.selectedChoiceId) {
    const correctChoice = question.choices?.find((c: any) => c.is_correct);
    const isCorrect = answer.selectedChoiceId === correctChoice?.id;
    return { isCorrect, marksAwarded: isCorrect ? marks : 0, needsManualGrading: false };
  }

  // True/False
  if (questionType === 'true_false' && answer.answer) {
    const isCorrect = answer.answer.toLowerCase().trim() === 
      (question.correct_answer || '').toLowerCase().trim();
    return { isCorrect, marksAwarded: isCorrect ? marks : 0, needsManualGrading: false };
  }

  // Calculation
  if (questionType === 'calculation' && answer.answer && question.correct_answer) {
    const studentNum = parseFloat(answer.answer.replace(/[^\d.-]/g, ''));
    const correctNum = parseFloat(question.correct_answer.replace(/[^\d.-]/g, ''));
    
    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      const isCorrect = Math.abs(studentNum - correctNum) <= Math.abs(correctNum * 0.01);
      return { isCorrect, marksAwarded: isCorrect ? marks : 0, needsManualGrading: false };
    }
  }

  // Everything else needs manual grading
  return { isCorrect: false, marksAwarded: 0, needsManualGrading: true };
}

// Create notification for auto-submitted attempt
async function createAutoSubmitNotification(
  userId: string,
  attemptId: string,
  tableName: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'attempt_auto_submitted',
        title: 'Assessment Auto-Submitted',
        message: 'Your timed assessment was automatically submitted because time expired.',
        action_url: `/student/assessments/${attemptId}/results`,
        priority: 'normal',
        data: { attemptId, tableName }
      });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Award XP for completion
async function awardCompletionXP(
  userId: string,
  gradingResult: { totalScore: number; maxScore: number }
): Promise<void> {
  try {
    const percentage = gradingResult.maxScore > 0 
      ? (gradingResult.totalScore / gradingResult.maxScore) * 100 
      : 0;

    let xpAwarded = 10;
    if (percentage >= 90) xpAwarded = 50;
    else if (percentage >= 70) xpAwarded = 30;
    else if (percentage >= 50) xpAwarded = 20;

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('xp')
      .eq('id', userId)
      .single();

    await supabaseAdmin
      .from('users')
      .update({ xp: (userData?.xp || 0) + xpAwarded })
      .eq('id', userId);

    await supabaseAdmin
      .from('xp_transactions')
      .insert({
        user_id: userId,
        amount: xpAwarded,
        reason: 'assessment_auto_submitted',
        metadata: { score: gradingResult.totalScore, maxScore: gradingResult.maxScore }
      });
  } catch (error) {
    console.error('Error awarding XP:', error);
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'auto-submit-expired',
    description: 'POST to this endpoint to auto-submit expired timed attempts'
  });
}
