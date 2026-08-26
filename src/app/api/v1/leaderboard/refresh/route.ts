/**
 * Leaderboard Cache Refresh
 * POST /api/v1/leaderboard/refresh
 *
 * Rebuilds `leaderboard_cache` by calling the `update_leaderboard_cache()`
 * function. Driven by the cron entry in vercel.json.
 *
 * Why a cron and not a trigger: the function rebuilds the whole board with
 * DELETE + INSERT (up to 1000 rows), so firing it per XP event would write
 * thousands of rows for every quiz a student finishes. On a schedule the cost
 * is one rebuild per interval no matter how many students are playing.
 *
 * The client reads only this cache — never `user_gamification`, whose RLS
 * (`user_id = auth.uid()`) confines a SELECT to the caller's own row.
 *
 * Security: shared secret, matching /api/v1/attempts/auto-submit-expired.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  const isAuthorized =
    authHeader === `Bearer ${CRON_SECRET}` || cronSecret === CRON_SECRET;

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Built here rather than at module scope so `next build` cannot fail on a
  // missing env var — the same reason the LLM providers construct lazily.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false } },
  );

  const { error } = await supabaseAdmin.rpc('update_leaderboard_cache');

  if (error) {
    console.error('[leaderboard] cache refresh failed:', error.message);
    return NextResponse.json(
      { error: 'Refresh failed', message: error.message },
      { status: 500 },
    );
  }

  const { count, error: countError } = await supabaseAdmin
    .from('leaderboard_cache')
    .select('user_id', { count: 'exact', head: true });

  if (countError) {
    // The rebuild itself succeeded; only the tally failed.
    return NextResponse.json({ refreshed: true, ranked: null });
  }

  return NextResponse.json({ refreshed: true, ranked: count ?? 0 });
}

// Vercel cron issues GET. Same work, same guard.
export async function GET(request: NextRequest) {
  return POST(request);
}
