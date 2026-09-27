/**
 * Stage 4 — write the solved test as an ordinary draft assessment.
 *
 * Generated tests use the same tables as hand-built ones so every downstream
 * feature (editor, preview, PDF export, assignment) works on them unchanged.
 * The only difference is the provenance stamp and the fact that they always
 * land unpublished: a teacher approves the paper, we do not publish for them.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { GenerationError } from './errors';
import { allocateRowMarks } from './trees';
import type { SolverResult, TestSpec } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

export interface LlmUsageSummary {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export function buildInstructions(spec: TestSpec, result: SolverResult): string {
  const lines = [
    `Time allowed: ${spec.durationMinutes} minutes.`,
    `Total marks: ${result.totalMarks}.`,
    'Answer all questions in the spaces provided.',
  ];
  lines.push(
    spec.calculatorAllowed
      ? 'You may use a calculator.'
      : 'You may not use a calculator.',
  );
  return lines.join('\n');
}

export async function persistGeneratedTest(
  supabase: Db,
  userId: string,
  prompt: string,
  spec: TestSpec,
  result: SolverResult,
  usage: LlmUsageSummary,
): Promise<string> {
  const { data: assessmentType } = await supabase
    .from('assessment_types')
    .select('id')
    .eq('code', 'custom_test')
    .single();

  if (!assessmentType) {
    throw new GenerationError(
      'persist_failed',
      'Assessment type "custom_test" is missing',
    );
  }

  const { data: assessment, error: insertError } = await supabase
    .from('assessments')
    .insert({
      assessment_type_id: assessmentType.id,
      title: spec.title,
      instructions: buildInstructions(spec, result),
      subject_id: spec.subjectId,
      exam_board_id: spec.examBoardId,
      level: spec.level,
      duration_minutes: spec.durationMinutes,
      total_marks: result.totalMarks,
      calculator_allowed: spec.calculatorAllowed,
      max_attempts: 1,
      show_results: 'immediately',
      randomize_questions: false,
      randomize_answers: false,
      is_template: false,
      // A generated test is a draft. The teacher decides whether it ships.
      is_published: false,
      created_by: userId,
      ai_generated: true,
      ai_prompt: prompt,
      generation_metadata: {
        version: 1,
        spec,
        diagnostics: result.diagnostics,
        llm: usage,
        generatedAt: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (insertError || !assessment) {
    throw new GenerationError(
      'persist_failed',
      `Failed to create assessment: ${insertError?.message ?? 'unknown error'}`,
      { cause: insertError },
    );
  }

  await insertQuestions(supabase, assessment.id, result);

  return assessment.id;
}

/**
 * assessment_questions rows for a solved test: every row of every selected
 * tree (context stem, parts, sub-parts), parent before children, each with the
 * marks it carries. This is what the manual builder stores, and what the
 * editor, preview and PDF export read: they group rows by parent_question_id
 * and do not fetch missing parts. Storing only the root, with the whole
 * tree's marks, printed a stem with no parts.
 */
export function buildAssessmentQuestionRows(
  assessmentId: string,
  result: SolverResult,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const treesById = new Map(result.trees.map((t) => [t.root.id, t]));
  let order = 1;

  for (const section of result.sections) {
    for (const treeId of section.treeIds) {
      const tree = treesById.get(treeId);
      // A tree id the solver did not return would be a solver bug; keep the
      // root rather than lose the question.
      const entries = tree
        ? allocateRowMarks(tree.root).map(({ node, marks }) => ({ id: node.id, marks }))
        : [{ id: treeId, marks: null }];

      for (const entry of entries) {
        rows.push({
          assessment_id: assessmentId,
          question_id: entry.id,
          question_order: order,
          section_name: section.name,
          section_instructions: section.instructions,
          custom_marks: entry.marks,
        });
        order += 1;
      }
    }
  }

  return rows;
}

/**
 * One insert for the whole paper.
 *
 * The per-question path in TestBuilderService recalculates the mark total on
 * every call, so inserting a 30-question test one row at a time costs 30 extra
 * round trips and 30 redundant recalculations.
 */
async function insertQuestions(
  supabase: Db,
  assessmentId: string,
  result: SolverResult,
): Promise<void> {
  const rows = buildAssessmentQuestionRows(assessmentId, result);
  if (rows.length === 0) return;

  const { error } = await supabase.from('assessment_questions').insert(rows);
  if (error) {
    // Leaving a titled assessment with no questions is worse than no assessment.
    await supabase.from('assessments').delete().eq('id', assessmentId);
    throw new GenerationError(
      'persist_failed',
      `Failed to attach questions: ${error.message}`,
      { cause: error },
    );
  }
}
