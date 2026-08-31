/**
 * AI Test Builder
 * POST /api/v1/tests/generate
 *
 * Natural language in, a draft assessment out. One LLM call reads the request;
 * everything after that is deterministic. See docs/ai-test-builder-spec.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { recordLlmUsage } from '@/lib/llm/usage';
import {
  AmbiguousResolutionError,
  GenerationError,
  IntentParseError,
  UnresolvedFieldError,
  type GenerationFailureCode,
} from '@/lib/test-generation/errors';
import { isProviderUnavailableError } from '@/lib/llm';
import { parseIntent } from '@/lib/test-generation/parse-intent';
import { persistGeneratedTest } from '@/lib/test-generation/persist';
import { fetchCandidatePool } from '@/lib/test-generation/pool';
import { resolveSpec } from '@/lib/test-generation/resolve-spec';
import { solve } from '@/lib/test-generation/solver';
import type { SolverResult } from '@/lib/test-generation/types';

// The Anthropic SDK needs Node, and one LLM call plus two queries plus
// in-memory solving lands around 2-4s.
export const runtime = 'nodejs';
export const maxDuration = 30;

const GenerateRequestSchema = z.object({
  prompt: z.string().min(3).max(1000),
  /** Supplies subject, board and level the teacher did not need to state. */
  classId: z.string().uuid().optional(),
  /** Reproduce an earlier generation exactly. */
  seed: z.number().int().optional(),
  /** Preview without writing anything. */
  dryRun: z.boolean().default(false),
});

/**
 * What the teacher reads. Each one says which part gave way and whether trying
 * again is worth their time — "Failed to generate the test" said neither.
 */
const FAILURE_MESSAGES: Record<GenerationFailureCode, string> = {
  llm_unavailable:
    'The test writer is unavailable right now. This is on our side, not your prompt — please try again shortly.',
  llm_unparseable:
    'The request came back garbled. Try rewording your prompt, or generate again.',
  pool_query_failed:
    'Could not read the question bank. Please try again — if it keeps happening, report the reference below.',
  persist_failed:
    'The test was built but could not be saved. Please try again and report the reference below if it repeats.',
  unknown:
    'Something went wrong generating the test. Please try again, and report the reference below if it repeats.',
};

const DAILY_GENERATION_LIMITS: Record<string, number> = {
  guest: 0,
  basic: 5,
  essential: 50,
  pro: 200,
};

/**
 * Which stage an untyped failure came from.
 *
 * The client gets this code and nothing else — enough for a teacher to quote in
 * a bug report, with no provider or Postgres text crossing the wire.
 */
function classifyFailure(err: unknown): GenerationFailureCode {
  if (err instanceof GenerationError) return err.code;
  if (isProviderUnavailableError(err)) return 'llm_unavailable';
  if (String((err as Error)?.message ?? '').includes('did not return parseable JSON')) {
    return 'llm_unparseable';
  }
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Please log in to generate a test' },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_admin, subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'teacher' && !profile.is_admin)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Test generation is available to teachers' },
      { status: 403 },
    );
  }

  let body: z.infer<typeof GenerateRequestSchema>;
  try {
    body = GenerateRequestSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Tell me what test you want, in a sentence.',
        issues: err instanceof z.ZodError ? err.issues : undefined,
      },
      { status: 400 },
    );
  }

  const quota = await checkGenerationQuota(
    supabase,
    user.id,
    profile.subscription_tier ?? 'basic',
    Boolean(profile.is_admin),
  );

  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Limit Reached', message: quota.message, upgradeRequired: true },
      { status: 429 },
    );
  }

  try {
    const { intent, usage } = await parseIntent(body.prompt);

    // Awaited, not fired and forgotten: this runtime can freeze the process as
    // soon as the response is returned, which would drop the row.
    await recordLlmUsage(supabase, {
      feature: 'test_generation',
      provider: usage.provider,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      userId: user.id,
      metadata: { promptLength: body.prompt.length, classId: body.classId ?? null },
    });

    const spec = await resolveSpec(supabase, intent, {
      userId: user.id,
      classId: body.classId,
      seed: body.seed,
      target: 'pdf_export',
    });

    const pool = await fetchCandidatePool(supabase, spec);
    const result = solve(pool, spec);

    if (result.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Insufficient Content',
          message: explainShortfall(result),
          spec,
          diagnostics: result.diagnostics,
        },
        { status: 422 },
      );
    }

    if (body.dryRun) {
      return NextResponse.json({
        status: result.status,
        spec,
        preview: toPreview(result),
        diagnostics: result.diagnostics,
      });
    }

    const assessmentId = await persistGeneratedTest(
      supabase,
      user.id,
      body.prompt,
      spec,
      result,
      usage,
    );

    return NextResponse.json(
      {
        assessmentId,
        status: result.status,
        message:
          result.status === 'partial' ? explainShortfall(result) : undefined,
        spec,
        preview: toPreview(result),
        diagnostics: result.diagnostics,
        editUrl: `/teacher/test-builder/${assessmentId}/edit`,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof IntentParseError) {
      // The call was billed even though its output was unusable.
      if (err.usage) {
        await recordLlmUsage(supabase, {
          feature: 'test_generation',
          provider: err.usage.provider,
          model: err.usage.model,
          inputTokens: err.usage.inputTokens,
          outputTokens: err.usage.outputTokens,
          userId: user.id,
          succeeded: false,
          error: 'intent_unparseable',
        });
      }

      return NextResponse.json(
        { error: 'Unclear Request', message: err.message, issues: err.issues },
        { status: 400 },
      );
    }

    if (err instanceof AmbiguousResolutionError) {
      return NextResponse.json(
        {
          error: 'Ambiguous',
          field: err.field,
          message: `Which one did you mean?`,
          candidates: err.candidates,
        },
        { status: 422 },
      );
    }

    if (err instanceof UnresolvedFieldError) {
      return NextResponse.json(
        {
          error: 'Unresolved',
          field: err.field,
          message: `I could not work out which ${err.field} you meant. Try naming it directly, or generate from inside a class.`,
        },
        { status: 422 },
      );
    }

    const code = classifyFailure(err);
    console.error(`[tests/generate] ${requestId} ${code}`, err);

    return NextResponse.json(
      {
        error: 'Server Error',
        message: FAILURE_MESSAGES[code],
        code,
        requestId,
      },
      { status: 500 },
    );
  }
}

/**
 * A shortfall is not a failure so much as a conversation: say which topics were
 * thin and by how much, so the UI can offer widening or shortening as a fix.
 */
function explainShortfall(result: SolverResult): string {
  const { diagnostics } = result;
  const short = diagnostics.targetMarks - diagnostics.achievedMarks;

  if (diagnostics.candidateTrees === 0) {
    const excludedForCopyright = diagnostics.exclusions.find(
      (e) => e.reason === 'past_paper_excluded',
    );
    if (excludedForCopyright) {
      return 'Every matching question comes from a past paper, which cannot be exported. Original questions are needed for this subject.';
    }
    return 'No published questions match that request yet.';
  }

  if (short > 0) {
    return `The question bank could only fill ${diagnostics.achievedMarks} of ${diagnostics.targetMarks} marks. Widen the topics or shorten the test.`;
  }

  return 'Generated with adjustments.';
}

function toPreview(result: SolverResult) {
  return {
    totalMarks: result.totalMarks,
    questionCount: result.trees.length,
    sections: result.sections.map((section) => ({
      name: section.name,
      marks: section.marks,
      questions: section.treeIds.map((id) => {
        const tree = result.trees.find((t) => t.root.id === id);
        return {
          questionId: id,
          marks: tree?.marks ?? 0,
          parts: (tree?.nodeCount ?? 1) - 1,
          difficulty: tree?.difficulty ?? 'medium',
        };
      }),
    })),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function checkGenerationQuota(
  supabase: any,
  userId: string,
  tier: string,
  isAdmin: boolean,
): Promise<{ allowed: boolean; message?: string }> {
  if (isAdmin) return { allowed: true };

  const limit = DAILY_GENERATION_LIMITS[tier] ?? DAILY_GENERATION_LIMITS.basic;

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('assessments')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .eq('ai_generated', true)
    .gte('created_at', since.toISOString());

  // A counting failure should not block a teacher mid-lesson.
  if (error) return { allowed: true };

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      message: `You have generated ${limit} tests today. Upgrade for a higher limit.`,
    };
  }

  return { allowed: true };
}
