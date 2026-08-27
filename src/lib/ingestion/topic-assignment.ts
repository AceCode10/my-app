import type { SupabaseClient } from '@supabase/supabase-js';
import type { LlmProvider } from '../llm';
import type { ExtractedQuestion } from './types';
import { UNCLASSIFIED_TOPIC_NAME, UNCLASSIFIED_TOPIC_SLUG } from '../topic-utils';

/**
 * Assign a syllabus topic to each ingested question.
 *
 * This matters more than it looks: the teacher test builder filters
 * `.not('topic_id','is',null)`, so a question with no topic is invisible no
 * matter how well it was extracted. Anything that cannot be classified is
 * therefore parked on an "Unclassified" topic rather than left null.
 *
 * One LLM call per paper, not per question.
 */

export interface TopicRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

export interface TopicAssignment {
  ref: string;
  topicId: string | null;
  confidence: number;
  assignedBy: 'llm' | 'rule' | 'fallback';
}

const MIN_CONFIDENCE = 0.6;
const INHERIT_OVERRIDE_CONFIDENCE = 0.8;

export async function loadTopics(
  supabase: SupabaseClient,
  subjectId: string,
  examBoardId?: string,
): Promise<TopicRow[]> {
  let query = supabase
    .from('topics')
    .select('id, name, code, description')
    .eq('subject_id', subjectId);

  if (examBoardId) query = query.or(`exam_board_id.eq.${examBoardId},exam_board_id.is.null`);

  const { data, error } = await query;
  if (error) throw new Error(`Loading topics failed: ${error.message}`);
  return (data ?? []) as TopicRow[];
}

/** Find or create the subject's catch-all topic. */
export async function ensureUnclassifiedTopic(
  supabase: SupabaseClient,
  subjectId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('topics')
    .select('id')
    .eq('subject_id', subjectId)
    .ilike('name', UNCLASSIFIED_TOPIC_NAME)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('topics')
    .insert({
      subject_id: subjectId,
      name: UNCLASSIFIED_TOPIC_NAME,
      slug: UNCLASSIFIED_TOPIC_SLUG,
      description: 'Ingested questions awaiting a syllabus topic.',
      display_order: 9999,
      status: 'published',
    })
    .select('id')
    .single();

  if (error) {
    console.warn(`Could not create an Unclassified topic: ${error.message}`);
    return null;
  }
  return data.id;
}

interface LlmTopicResponse {
  assignments: { question: string; topic_id: string; confidence?: number }[];
}

const SYSTEM = `You map exam questions onto the syllabus topics of a course.

For each question, choose the single most appropriate topic from the supplied list.

RULES
1. "topic_id" MUST be one of the supplied topic ids, copied exactly. Never invent one.
2. "confidence" is 0..1 - how certain you are. Be honest; a low score is better
   than a wrong topic, because low-confidence questions are routed to a human.
3. If no supplied topic fits the question, omit that question entirely.
4. Judge by the subject matter the question tests, not by its wording or format.`;

export interface TopicAssignmentResult {
  assignments: Map<string, TopicAssignment>;
  /**
   * True when classification could not run at all — no model, no topic tree, or
   * the call failed (an expired key, an exhausted credit balance, a timeout).
   * Callers MUST NOT treat the resulting fallbacks as a decision: overwriting a
   * previously good topic with "Unclassified" because billing lapsed is data
   * loss, not a downgrade.
   */
  llmUnavailable: boolean;
  error?: string;
  /** Present whenever a model call was actually made, successful or not. */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    provider: string;
  };
}

export async function assignTopics(
  questions: ExtractedQuestion[],
  topics: TopicRow[],
  llm: LlmProvider | undefined,
  fallbackTopicId: string | null,
): Promise<TopicAssignmentResult> {
  const result = new Map<string, TopicAssignment>();

  const fallback = (ref: string): TopicAssignment => ({
    ref,
    topicId: fallbackTopicId,
    confidence: 0,
    assignedBy: 'fallback',
  });

  // No topic tree, or no model: everything is parked, honestly labelled.
  if (topics.length === 0 || !llm) {
    for (const question of questions) result.set(question.ref, fallback(question.ref));
    return {
      assignments: result,
      llmUnavailable: true,
      error: topics.length === 0 ? 'the subject has no topics' : 'no language model configured',
    };
  }

  const answerable = questions.filter((q) => !q.isContextOnly);
  if (answerable.length === 0) {
    for (const question of questions) result.set(question.ref, fallback(question.ref));
    return { assignments: result, llmUnavailable: false };
  }

  const validIds = new Set(topics.map((t) => t.id));
  let llmError: string | undefined;
  let usage: TopicAssignmentResult['usage'];

  try {
    const payload = {
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description?.slice(0, 200) ?? null,
      })),
      questions: answerable.map((q) => ({
        ref: q.ref,
        text: q.questionText.slice(0, 500),
        marks: q.marks,
        type: q.questionType,
      })),
    };

    const response = await llm.complete<LlmTopicResponse>({
      system: SYSTEM,
      user: JSON.stringify(payload),
      jsonSchema: { assignments: [{ question: '1(a)', topic_id: 'uuid', confidence: 0.9 }] },
      maxTokens: 8192,
    });

    // Recorded before the response is interpreted: the call is billed whether
    // or not its assignments turn out to be usable.
    usage = {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      model: response.model,
      provider: response.provider,
    };

    for (const assignment of response.json?.assignments ?? []) {
      const ref = String(assignment.question ?? '').trim();
      const topicId = String(assignment.topic_id ?? '').trim();
      const confidence = Number(assignment.confidence ?? 0);

      if (!ref || !validIds.has(topicId)) continue;
      if (confidence < MIN_CONFIDENCE) continue;

      result.set(ref, { ref, topicId, confidence, assignedBy: 'llm' });
    }
  } catch (error) {
    llmError = (error as Error).message;
    console.warn(`Topic assignment failed: ${llmError}`);
  }

  // Children inherit their parent's topic unless the model was more confident.
  const byRef = new Map(questions.map((q) => [q.ref, q]));
  for (const question of questions) {
    const own = result.get(question.ref);
    if (own && own.confidence >= INHERIT_OVERRIDE_CONFIDENCE) continue;

    let parentRef = question.parentRef;
    while (parentRef) {
      const inherited = result.get(parentRef);
      if (inherited?.topicId) {
        if (!own || own.confidence < inherited.confidence) {
          result.set(question.ref, { ...inherited, ref: question.ref, assignedBy: 'rule' });
        }
        break;
      }
      parentRef = byRef.get(parentRef)?.parentRef ?? null;
    }
  }

  // A context row takes the topic of its first classified child, so it does not
  // vanish from the builder.
  for (const question of questions) {
    if (!question.isContextOnly || result.get(question.ref)?.topicId) continue;
    const child = questions.find((q) => q.parentRef === question.ref && result.get(q.ref)?.topicId);
    if (child) {
      const inherited = result.get(child.ref)!;
      result.set(question.ref, { ...inherited, ref: question.ref, assignedBy: 'rule' });
    }
  }

  for (const question of questions) {
    if (!result.has(question.ref)) result.set(question.ref, fallback(question.ref));
  }

  return {
    assignments: result,
    llmUnavailable: Boolean(llmError),
    error: llmError,
    usage,
  };
}
