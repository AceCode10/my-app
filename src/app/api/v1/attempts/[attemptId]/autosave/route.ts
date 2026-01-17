/**
 * Autosave API
 * PATCH /api/v1/attempts/:attemptId/autosave
 * 
 * Saves partial answers during an assessment attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AutosaveRequest {
  answers: {
    [questionId: string]: {
      answer?: string;
      selectedChoiceId?: string;
      timeTaken?: number;
      flagged?: boolean;
    };
  };
  timeSpentSeconds?: number;
}

export async function PATCH(
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
    const body: AutosaveRequest = await request.json();
    const { answers, timeSpentSeconds } = body;

    // Verify attempt belongs to user and is in progress
    const { data: attempt, error: attemptError } = await supabase
      .from('assessment_attempts')
      .select('id, user_id, status, expires_at, answers')
      .eq('id', attemptId)
      .single();

    // Also check test_attempts table
    let testAttempt = null;
    if (!attempt) {
      const { data: ta } = await supabase
        .from('test_attempts')
        .select('id, user_id, status, expires_at, answers')
        .eq('id', attemptId)
        .single();
      testAttempt = ta;
    }

    const currentAttempt = attempt || testAttempt;
    const tableName = attempt ? 'assessment_attempts' : 'test_attempts';

    if (!currentAttempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    if (currentAttempt.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (currentAttempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Attempt already submitted', status: currentAttempt.status },
        { status: 400 }
      );
    }

    // Check if expired
    if (currentAttempt.expires_at && new Date(currentAttempt.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Attempt has expired', expired: true },
        { status: 400 }
      );
    }

    // Merge new answers with existing
    const existingAnswers = currentAttempt.answers || {};
    const mergedAnswers = { ...existingAnswers };

    for (const [questionId, answerData] of Object.entries(answers)) {
      mergedAnswers[questionId] = {
        ...(mergedAnswers[questionId] || {}),
        ...answerData,
        updatedAt: new Date().toISOString()
      };
    }

    // Update the attempt
    const updateData: any = {
      answers: mergedAnswers,
      updated_at: new Date().toISOString()
    };

    if (timeSpentSeconds !== undefined) {
      updateData.time_spent_seconds = timeSpentSeconds;
    }

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', attemptId);

    if (updateError) {
      console.error('Error saving answers:', updateError);
      return NextResponse.json(
        { error: 'Failed to save answers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      saved: true,
      lastSavedAt: new Date().toISOString(),
      answersCount: Object.keys(mergedAnswers).length
    });

  } catch (error) {
    console.error('Autosave error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
