/**
 * Candidate pool fetch.
 *
 * Roots first, then their descendants two levels down. Kept separate from the
 * solver so the solver stays pure and testable against fixtures.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { GenerationError } from './errors';
import { fetchTopicRoots } from './resolve-spec';
import { buildTrees } from './trees';
import { POOL_LIMIT, type QuestionRow, type QuestionTree, type TestSpec } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

const COLUMNS =
  'id, parent_question_id, part_label, marks, difficulty, question_type, topic_id, display_order, image_url, paper_id';

export async function fetchCandidatePool(
  supabase: Db,
  spec: TestSpec,
): Promise<QuestionTree[]> {
  let query = supabase
    .from('questions')
    .select(COLUMNS)
    .eq('subject_id', spec.subjectId)
    .eq('status', 'published')
    .is('parent_question_id', null)
    // Postgres gives no row order guarantee; the solver's determinism needs one.
    .order('id', { ascending: true })
    .limit(POOL_LIMIT);

  // Only narrow on fields we actually resolved — a null board means
  // "board-agnostic", not "rows whose board is null".
  if (spec.examBoardId) query = query.eq('exam_board_id', spec.examBoardId);
  if (spec.level) query = query.eq('level', spec.level);

  const { data: roots, error } = await query;
  if (error) {
    throw new GenerationError(
      'pool_query_failed',
      `Failed to fetch question pool: ${error.message}`,
      { cause: error },
    );
  }

  const rootRows = (roots ?? []) as QuestionRow[];
  if (rootRows.length === 0) return [];

  // Topic roots do not depend on the questions, so fetch both at once. Against
  // a hosted project each round trip is most of a second; the descendant walk
  // is already two sequential hops and does not need a third behind it.
  const [descendants, { roots: topicRoots }] = await Promise.all([
    fetchDescendants(
      supabase,
      rootRows.map((r) => r.id),
    ),
    fetchTopicRoots(supabase, spec.subjectId),
  ]);

  return buildTrees([...rootRows, ...descendants], { topicRoots });
}

/**
 * Two levels of children: part (a) then sub-part (i). Chunked because Postgres
 * rejects an `in` list of a few thousand ids.
 */
async function fetchDescendants(supabase: Db, rootIds: string[]): Promise<QuestionRow[]> {
  const collected: QuestionRow[] = [];
  let frontier = rootIds;

  for (let depth = 0; depth < 2 && frontier.length > 0; depth += 1) {
    const rows = await fetchChildren(supabase, frontier);
    if (rows.length === 0) break;
    collected.push(...rows);
    frontier = rows.map((r) => r.id);
  }

  return collected;
}

const CHUNK = 200;

async function fetchChildren(supabase: Db, parentIds: string[]): Promise<QuestionRow[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < parentIds.length; i += CHUNK) {
    chunks.push(parentIds.slice(i, i + CHUNK));
  }

  // Chunks within a depth are independent, so issue them together rather than
  // paying a round trip each. Ordering is restored in buildTrees.
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from('questions')
        .select(COLUMNS)
        .in('parent_question_id', chunk)
        .order('id', { ascending: true });

      if (error) {
        throw new GenerationError(
          'pool_query_failed',
          `Failed to fetch question parts: ${error.message}`,
          { cause: error },
        );
      }
      return (data ?? []) as QuestionRow[];
    }),
  );

  return results.flat();
}
