/**
 * Unified Assessment Start API
 * POST /api/v1/attempts/start
 * 
 * Handles both assigned and self-practice assessments:
 * - Topic quizzes (self-practice)
 * - Full papers (self-practice or assigned)
 * - Custom tests (assigned)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Types for the request
interface StartAttemptRequest {
  assessmentType: 'topic_quiz' | 'full_paper' | 'custom_test' | 'quick_quiz';
  // One of these should be provided based on type
  topicId?: string;
  paperId?: string;
  testId?: string;
  assessmentId?: string;
  assignmentId?: string; // null for self-practice
  // Optional settings
  questionCount?: number;
  difficulty?: ('easy' | 'medium' | 'hard')[];
  timed?: boolean;
}

interface StartAttemptResponse {
  attemptId: string;
  assessment: {
    title: string;
    duration: number | null;
    questionsCount: number;
    totalMarks: number;
  };
  questions: any[];
  startedAt: string;
  expiresAt: string | null;
}

// Freemium limits by subscription tier
const DAILY_PRACTICE_LIMITS: Record<string, number> = {
  guest: 3,
  basic: 5,
  essential: 999,
  pro: 999,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to start an assessment' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: StartAttemptRequest = await request.json();
    const { assessmentType, topicId, paperId, testId, assessmentId, assignmentId, questionCount = 10, difficulty, timed = true } = body;

    // Validate request
    if (!assessmentType) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'assessmentType is required' },
        { status: 400 }
      );
    }

    // Get user's subscription tier
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Server Error', message: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const subscriptionTier = userData?.subscription_tier || 'basic';

    // Check freemium limits for self-practice (no assignmentId)
    if (!assignmentId) {
      const limitCheckResult = await checkFreemiumLimits(supabase, user.id, subscriptionTier);
      if (!limitCheckResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Limit Reached', 
            message: limitCheckResult.message,
            upgradeRequired: true,
            currentTier: subscriptionTier
          },
          { status: 429 }
        );
      }
    }

    // Validate assignment if provided
    if (assignmentId) {
      const assignmentCheck = await validateAssignment(supabase, user.id, assignmentId);
      if (!assignmentCheck.valid) {
        return NextResponse.json(
          { error: 'Assignment Error', message: assignmentCheck.message },
          { status: assignmentCheck.status }
        );
      }
    }

    // Route to appropriate handler based on assessment type
    let result: StartAttemptResponse;

    switch (assessmentType) {
      case 'topic_quiz':
        if (!topicId) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'topicId is required for topic_quiz' },
            { status: 400 }
          );
        }
        result = await startTopicQuiz(supabase, user.id, topicId, questionCount, difficulty);
        break;

      case 'full_paper':
        if (!paperId) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'paperId is required for full_paper' },
            { status: 400 }
          );
        }
        result = await startFullPaper(supabase, user.id, paperId, assignmentId, timed);
        break;

      case 'custom_test':
        if (!testId && !assignmentId) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'testId or assignmentId is required for custom_test' },
            { status: 400 }
          );
        }
        result = await startCustomTest(supabase, user.id, testId, assignmentId);
        break;

      case 'quick_quiz':
        result = await startQuickQuiz(supabase, user.id, topicId, questionCount);
        break;

      default:
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid assessmentType' },
          { status: 400 }
        );
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error starting attempt:', error);
    return NextResponse.json(
      { error: 'Server Error', message: 'Failed to start assessment' },
      { status: 500 }
    );
  }
}

// Check freemium limits for self-practice
async function checkFreemiumLimits(
  supabase: any,
  userId: string,
  subscriptionTier: string
): Promise<{ allowed: boolean; message?: string }> {
  const limit = DAILY_PRACTICE_LIMITS[subscriptionTier] || DAILY_PRACTICE_LIMITS.basic;

  // Count today's self-practice attempts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('assessment_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('assignment_id', null) // Self-practice only
    .gte('started_at', today.toISOString());

  if (error) {
    console.error('Error checking limits:', error);
    return { allowed: true }; // Allow on error to not block users
  }

  if ((count || 0) >= limit) {
    return {
      allowed: false,
      message: `You've reached your daily practice limit of ${limit} sessions. Upgrade to Essential or Pro for unlimited practice.`
    };
  }

  return { allowed: true };
}

// Validate assignment access
async function validateAssignment(
  supabase: any,
  userId: string,
  assignmentId: string
): Promise<{ valid: boolean; message?: string; status?: number }> {
  // Get assignment details
  const { data: assignment, error } = await supabase
    .from('assignments')
    .select(`
      *,
      target_class:classes(id, name)
    `)
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    return { valid: false, message: 'Assignment not found', status: 404 };
  }

  // Check if user is target
  let isTarget = false;

  // Check if user is in target class
  if (assignment.target_class_id) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', assignment.target_class_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    isTarget = !!enrollment;
  }

  // Check if user is in target_user_ids array
  if (assignment.target_user_ids && assignment.target_user_ids.includes(userId)) {
    isTarget = true;
  }

  if (!isTarget) {
    return { valid: false, message: 'You are not authorized for this assignment', status: 403 };
  }

  // Check time window
  const now = new Date();
  if (assignment.start_at && new Date(assignment.start_at) > now) {
    return { valid: false, message: 'This assignment is not yet available', status: 403 };
  }

  if (assignment.due_at && new Date(assignment.due_at) < now) {
    return { valid: false, message: 'This assignment deadline has passed', status: 403 };
  }

  // Check attempt count
  const { count: attemptCount } = await supabase
    .from('test_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId);

  const maxAttempts = assignment.allow_retakes ? (assignment.max_attempts || 999) : 1;
  if ((attemptCount || 0) >= maxAttempts) {
    return { valid: false, message: 'Maximum attempts reached for this assignment', status: 403 };
  }

  return { valid: true };
}

// Start a topic quiz (self-practice)
async function startTopicQuiz(
  supabase: any,
  userId: string,
  topicId: string,
  questionCount: number,
  difficulty?: ('easy' | 'medium' | 'hard')[]
): Promise<StartAttemptResponse> {
  // Get topic info
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id, name, subject_id, subjects(name)')
    .eq('id', topicId)
    .single();

  if (topicError || !topic) {
    throw new Error('Topic not found');
  }

  // Build query for questions
  let query = supabase
    .from('questions')
    .select(`
      *,
      choices:question_choices(*)
    `)
    .eq('topic_id', topicId)
    .eq('status', 'published');

  if (difficulty && difficulty.length > 0) {
    query = query.in('difficulty', difficulty);
  }

  // Get more questions than needed for random selection
  const { data: allQuestions, error: questionsError } = await query.limit(questionCount * 3);

  if (questionsError) {
    throw new Error('Failed to fetch questions');
  }

  if (!allQuestions || allQuestions.length === 0) {
    throw new Error('No questions available for this topic');
  }

  // Shuffle and select
  const shuffled = shuffleArray(allQuestions);
  const selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  // Calculate total marks
  const totalMarks = selectedQuestions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  // Create the attempt record
  const startedAt = new Date().toISOString();
  
  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .insert({
      user_id: userId,
      topic_id: topicId,
      practice_mode: 'untimed',
      status: 'in_progress',
      started_at: startedAt,
      questions_snapshot: selectedQuestions.map((q: any, idx: number) => ({
        questionId: q.id,
        order: idx + 1,
        marks: q.marks || 1
      })),
      max_score: totalMarks
    })
    .select()
    .single();

  if (attemptError) {
    console.error('Error creating attempt:', attemptError);
    throw new Error('Failed to create attempt');
  }

  return {
    attemptId: attempt.id,
    assessment: {
      title: `${topic.name} Practice`,
      duration: null, // Untimed
      questionsCount: selectedQuestions.length,
      totalMarks: totalMarks as number
    },
    questions: selectedQuestions.map((q: any, idx: number) => ({
      ...q,
      order: idx + 1,
      // Remove correct answer for client
      correct_answer: undefined,
      explanation: undefined,
      mark_scheme: undefined
    })),
    startedAt,
    expiresAt: null
  };
}

// Start a full paper attempt
async function startFullPaper(
  supabase: any,
  userId: string,
  paperId: string,
  assignmentId: string | undefined,
  timed: boolean
): Promise<StartAttemptResponse> {
  // Get paper info
  const { data: paper, error: paperError } = await supabase
    .from('past_papers')
    .select(`
      *,
      subject:subjects(name),
      exam_board:exam_boards(name, short_name)
    `)
    .eq('id', paperId)
    .single();

  if (paperError || !paper) {
    throw new Error('Paper not found');
  }

  // Get paper questions
  const { data: paperQuestions, error: questionsError } = await supabase
    .from('paper_questions')
    .select(`
      *
    `)
    .eq('paper_id', paperId)
    .order('question_number', { ascending: true });

  if (questionsError) {
    console.error('Error fetching paper questions:', questionsError);
  }

  const questions = paperQuestions || [];
  const totalMarks = paper.total_marks || questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  // Calculate expiry time if timed
  const startedAt = new Date();
  let expiresAt: Date | null = null;
  
  if (timed && paper.duration_minutes) {
    expiresAt = new Date(startedAt.getTime() + paper.duration_minutes * 60 * 1000);
  }

  // Create the attempt record
  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .insert({
      user_id: userId,
      paper_id: paperId,
      assignment_id: assignmentId || null,
      practice_mode: timed ? 'timed' : 'untimed',
      status: 'in_progress',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt?.toISOString() || null,
      questions_snapshot: questions.map((q: any, idx: number) => ({
        questionId: q.id,
        order: idx + 1,
        marks: q.marks || 1
      })),
      max_score: totalMarks
    })
    .select()
    .single();

  if (attemptError) {
    console.error('Error creating attempt:', attemptError);
    throw new Error('Failed to create attempt');
  }

  const paperTitle = `${paper.subject?.name || 'Paper'} - ${paper.year} ${paper.session || ''} Paper ${paper.paper_number || ''}`.trim();

  return {
    attemptId: attempt.id,
    assessment: {
      title: paperTitle,
      duration: timed ? paper.duration_minutes : null,
      questionsCount: questions.length,
      totalMarks
    },
    questions: questions.map((q: any, idx: number) => ({
      ...q,
      order: idx + 1,
      // Keep mark_scheme hidden for now
      mark_scheme: undefined
    })),
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt?.toISOString() || null
  };
}

// Start a custom test (teacher-created)
async function startCustomTest(
  supabase: any,
  userId: string,
  testId: string | undefined,
  assignmentId: string | undefined
): Promise<StartAttemptResponse> {
  let test: any;
  let assignment: any;

  // Get test from assignment or directly
  if (assignmentId) {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        test:tests(*)
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignmentData) {
      throw new Error('Assignment not found');
    }

    assignment = assignmentData;
    test = assignmentData.test;
  } else if (testId) {
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      throw new Error('Test not found');
    }

    test = testData;
  }

  if (!test) {
    throw new Error('Test not found');
  }

  // Parse sections to get questions
  const sections = test.sections || [];
  const allQuestions: any[] = [];
  
  for (const section of sections) {
    const sectionQuestions = section.questions || [];
    for (const sq of sectionQuestions) {
      allQuestions.push({
        ...sq,
        sectionName: section.name
      });
    }
  }

  // Get full question data
  const questionIds = allQuestions.map((q: any) => q.questionId || q.id);
  
  let questions: any[] = [];
  if (questionIds.length > 0) {
    const { data: fullQuestions } = await supabase
      .from('questions')
      .select(`
        *,
        choices:question_choices(*)
      `)
      .in('id', questionIds);

    questions = fullQuestions || [];
  }

  // Merge with section info
  const mergedQuestions = allQuestions.map((sq: any, idx: number) => {
    const fullQ = questions.find((q: any) => q.id === (sq.questionId || sq.id));
    return {
      ...fullQ,
      order: idx + 1,
      sectionName: sq.sectionName,
      customMarks: sq.marks,
      correct_answer: undefined,
      explanation: undefined,
      mark_scheme: undefined
    };
  });

  const totalMarks = test.total_marks || mergedQuestions.reduce((sum: number, q: any) => sum + (q.customMarks || q.marks || 1), 0);

  // Calculate expiry
  const startedAt = new Date();
  let expiresAt: Date | null = null;
  
  const duration = assignment?.time_limit_minutes || test.duration_minutes;
  if (duration) {
    expiresAt = new Date(startedAt.getTime() + duration * 60 * 1000);
  }

  // Create attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('test_attempts')
    .insert({
      user_id: userId,
      test_id: test.id,
      assignment_id: assignmentId || null,
      status: 'in_progress',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt?.toISOString() || null,
      max_score: totalMarks
    })
    .select()
    .single();

  if (attemptError) {
    console.error('Error creating attempt:', attemptError);
    throw new Error('Failed to create attempt');
  }

  return {
    attemptId: attempt.id,
    assessment: {
      title: test.title,
      duration: duration || null,
      questionsCount: mergedQuestions.length,
      totalMarks
    },
    questions: mergedQuestions,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt?.toISOString() || null
  };
}

// Start a quick quiz (random questions)
async function startQuickQuiz(
  supabase: any,
  userId: string,
  topicId: string | undefined,
  questionCount: number
): Promise<StartAttemptResponse> {
  // Get random published questions
  let query = supabase
    .from('questions')
    .select(`
      *,
      choices:question_choices(*),
      topic:topics(name)
    `)
    .eq('status', 'published');

  if (topicId) {
    query = query.eq('topic_id', topicId);
  }

  const { data: allQuestions, error } = await query.limit(questionCount * 3);

  if (error || !allQuestions || allQuestions.length === 0) {
    throw new Error('No questions available');
  }

  const shuffled = shuffleArray(allQuestions);
  const selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));
  const totalMarks = selectedQuestions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  const startedAt = new Date().toISOString();

  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .insert({
      user_id: userId,
      practice_mode: 'untimed',
      status: 'in_progress',
      started_at: startedAt,
      questions_snapshot: selectedQuestions.map((q: any, idx: number) => ({
        questionId: q.id,
        order: idx + 1,
        marks: q.marks || 1
      })),
      max_score: totalMarks
    })
    .select()
    .single();

  if (attemptError) {
    throw new Error('Failed to create attempt');
  }

  return {
    attemptId: attempt.id,
    assessment: {
      title: 'Quick Quiz',
      duration: null,
      questionsCount: selectedQuestions.length,
      totalMarks: totalMarks as number
    },
    questions: selectedQuestions.map((q: any, idx: number) => ({
      ...q,
      order: idx + 1,
      correct_answer: undefined,
      explanation: undefined,
      mark_scheme: undefined
    })),
    startedAt,
    expiresAt: null
  };
}

// Utility: Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
