import { z } from 'zod';

/**
 * Zod schemas + helpers for admin content forms.
 *
 * Phase-1 migration approach: forms keep their existing useState wiring,
 * but submit handlers run `safeParse(schema, data)` and surface field
 * errors via the returned `fieldErrors` map. This lets us layer real
 * validation in without a full react-hook-form rewrite.
 */

export const QUESTION_TYPES = [
  'multiple_choice',
  'short_answer',
  'long_answer',
  'numeric',
  'true_false',
  'matching',
  'fill_in_blank',
] as const;

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'very_hard'] as const;
export const CONTENT_STATUSES = ['draft', 'pending', 'published', 'archived'] as const;

const uuid = z.string().uuid({ message: 'Invalid id' });
const optionalUuid = uuid.nullable().or(z.literal('')).optional();

export const mcqOptionSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1, 'Option text required'),
  is_correct: z.boolean(),
});

export const questionSchema = z
  .object({
    stem_markdown: z
      .string()
      .min(5, 'Question stem must be at least 5 characters'),
    question_type: z.enum(QUESTION_TYPES),
    difficulty: z.enum(DIFFICULTY_LEVELS),
    marks: z.coerce.number().int().min(0, 'Marks cannot be negative'),
    examiner_comment: z.string().optional().default(''),
    subject_id: optionalUuid,
    topic_id: optionalUuid,
    subtopic_id: optionalUuid,
    exam_board: z.string().min(1, 'Select an exam board'),
    status: z.enum(CONTENT_STATUSES),
    correct_answer: z.string().optional().default(''),
    answer_tolerance: z.coerce.number().min(0).optional().default(0),
    options: z.array(mcqOptionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.question_type === 'multiple_choice') {
      const options = data.options ?? [];
      if (options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'Provide at least two choices',
        });
      }
      if (!options.some(o => o.is_correct)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'Mark one option as correct',
        });
      }
    }
    if (data.question_type === 'true_false' && !['true', 'false'].includes(data.correct_answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correct_answer'],
        message: 'Select true or false',
      });
    }
    if (data.question_type === 'numeric' && !data.correct_answer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correct_answer'],
        message: 'Numeric answer required',
      });
    }
  });

export type QuestionFormData = z.infer<typeof questionSchema>;

export const paperSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  year: z.coerce
    .number()
    .int()
    .min(1900, 'Year must be 1900 or later')
    .max(2100, 'Year must be 2100 or earlier'),
  paper_number: z.string().min(1, 'Paper number required'),
  session: z.string().min(1, 'Session required'),
  exam_board: z.string().min(1, 'Select an exam board'),
  level: z.string().min(1, 'Select a level'),
  subject_id: uuid,
  status: z.enum(CONTENT_STATUSES),
});
export type PaperFormData = z.infer<typeof paperSchema>;

export const subjectSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and dashes'),
  exam_board_id: optionalUuid,
  level: z.string().optional().nullable(),
  display_order: z.coerce.number().int().min(0).optional().default(0),
});
export type SubjectFormData = z.infer<typeof subjectSchema>;

export const topicSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and dashes'),
  subject_id: uuid,
  display_order: z.coerce.number().int().min(0).optional().default(0),
});
export type TopicFormData = z.infer<typeof topicSchema>;

export const noteSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and dashes'),
  subject_id: uuid,
  topic_id: optionalUuid,
  visibility: z.enum(['draft', 'public', 'registered', 'premium']),
});
export type NoteFormData = z.infer<typeof noteSchema>;

/**
 * Validate via `safeParse` and return a friendly `{ ok, data, fieldErrors }`.
 * Pages can show `fieldErrors[field]?.[0]` next to the input.
 */
export function validateForm<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
):
  | { ok: true; data: z.infer<T>; fieldErrors: Record<string, string[]> }
  | { ok: false; data: null; fieldErrors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data, fieldErrors: {} };
  }
  const flat = result.error.flatten();
  return {
    ok: false,
    data: null,
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  };
}

/**
 * Translate well-known Supabase Postgres error codes into a fieldErrors map.
 * Use this on mutation failures so users see "slug already in use" instead of "Error 23505".
 */
export function mapSupabaseError(err: any, slugField = 'slug'): Record<string, string[]> {
  if (!err) return {};
  // 23505 = unique_violation, 23503 = foreign_key_violation, 23502 = not_null
  if (err.code === '23505') {
    return { [slugField]: [`This ${slugField} is already in use.`] };
  }
  if (err.code === '23503') {
    return { _form: ['Referenced record does not exist.'] };
  }
  if (err.code === '23502') {
    return { _form: ['A required field is missing.'] };
  }
  return { _form: [err.message ?? 'Unexpected error.'] };
}
