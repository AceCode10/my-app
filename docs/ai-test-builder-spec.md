# AI Test Builder — Implementation Spec

Implementation-grade companion to [`ai-test-builder-plan.md`](./ai-test-builder-plan.md).
The plan sets direction; this document is what gets built.

**Deliverable:** `POST /api/v1/tests/generate` — natural language in, a draft
assessment in the existing test-builder editor out.

---

## 0. Corrections to the plan doc

Four things in the plan are wrong or under-specified against the actual schema.
They are corrected here and the plan should be updated to match.

| Plan says | Reality | Consequence |
|---|---|---|
| Writes to a generic "test" | Test builder writes `assessments` + `assessment_questions` ([`test-builder-service.ts:21`](../src/lib/test-builder/test-builder-service.ts)). `tests` is a separate legacy path used by `assignments`. | Target `assessments`, or generated tests cannot be opened in the editor. |
| Questions are flat rows | `questions` has `parent_question_id` + `part_label`: 3 levels (main → part → sub-part). Parent carries the context stem, children carry the marks. | **Selection unit is the tree, not the row.** Row-level selection emits orphan `(b)(ii)` with no stem. |
| `~1 mark ≈ 1.5 min for Cambridge` | Varies per component. `past_papers` stores `duration_minutes` and `total_marks`. | Derive marks/minute empirically per subject + component from the paper bank. Do not hardcode. |
| No provenance handling | `questions.paper_id` is non-null for rows mirrored from past papers ([`mirror-to-question-bank.ts`](../src/lib/ingestion/mirror-to-question-bank.ts)). | This is the copyright filter. Must be a first-class solver constraint. |

Also: the plan proposes calling OpenAI directly. Use the existing
[`FailoverLlmProvider`](../src/lib/llm/index.ts) instead — it already has retry,
failover and token accounting.

---

## 1. Architecture

```
prompt ──▶ Stage 1: INTENT (LLM, ~800 tok)   -- strings only, never UUIDs
             │
             ▼
           Stage 2: RESOLVE (DB, no LLM)     -- strings to UUIDs, or 422
             │
             ▼
           Stage 3: SOLVE (pure TS, no LLM)  -- deterministic, seeded, testable
             │
             ▼
           Stage 4: PERSIST (DB, no LLM)     -- assessments + assessment_questions
             │
             ▼
           redirect to /teacher/test-builder/[id]/edit
```

One LLM call. Everything downstream is deterministic. The LLM never sees the
question bank, never picks questions, and never emits an identifier.

### Why the LLM does not select questions

Selection is a constraint problem with a checkable answer: hit a mark budget,
spread topics, respect a difficulty curve, keep trees intact. A solver does this
in under 50 ms for free, and its output can be unit-tested. An LLM does it slower,
non-deterministically, at cost, and cannot be tested. Restrict the model to the
one job that is genuinely ambiguous — reading the teacher's sentence.

---

## 2. Migration

Column names follow the plan doc so the two stay consistent.

```sql
-- supabase/migrations/<ts>_ai_test_generation.sql

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB;

COMMENT ON COLUMN assessments.generation_metadata IS
  'Resolved TestSpec + solver diagnostics + seed. Enables deterministic regeneration.';

-- Empirical timing calibration, refreshed from the paper bank.
CREATE MATERIALIZED VIEW IF NOT EXISTS subject_timing_calibration AS
SELECT
  subject_id,
  component_code,
  level,
  SUM(total_marks)::numeric / NULLIF(SUM(duration_minutes), 0) AS marks_per_minute,
  COUNT(*) AS sample_papers
FROM past_papers
WHERE total_marks > 0
  AND duration_minutes > 0
  AND status = 'published'
GROUP BY subject_id, component_code, level
HAVING COUNT(*) >= 3;

CREATE UNIQUE INDEX IF NOT EXISTS subject_timing_calibration_key
  ON subject_timing_calibration (subject_id, component_code, level);

-- Solver hot path: candidate pool fetch.
CREATE INDEX IF NOT EXISTS questions_solver_pool_idx
  ON questions (subject_id, status, exam_board_id, level)
  WHERE parent_question_id IS NULL;

CREATE INDEX IF NOT EXISTS questions_parent_idx
  ON questions (parent_question_id)
  WHERE parent_question_id IS NOT NULL;
```

`marks_per_minute` falls back to `1.0` when a subject has fewer than 3 sampled
papers. Refresh the view from the ingestion job's completion hook.

---

## 3. Types

`src/lib/test-generation/types.ts`

```ts
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SolverStatus = 'ok' | 'partial' | 'failed';

/** Stage 1 output. Strings only — the model never emits an identifier. */
export interface RawIntent {
  subject: string | null;          // "biology", "0610", "ICT"
  examBoard: string | null;        // "cambridge", "CIE", "edexcel"
  level: string | null;            // "igcse", "as", "a2"
  durationMinutes: number | null;
  totalMarks: number | null;       // explicit override; else derived from duration
  topics: string[];                // free-text topic names, [] = whole syllabus
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | null;
  questionTypes: string[];         // "mcq", "structured", "extended"
  calculatorAllowed: boolean | null;
  title: string | null;
  notes: string | null;            // anything unparsed, surfaced to the teacher
}

/** Stage 2 output. Fully resolved, safe to hand the solver. */
export interface TestSpec {
  subjectId: string;
  examBoardId: string | null;
  level: string | null;
  durationMinutes: number;
  targetMarks: number;
  marksTolerance: number;                     // absolute, default ceil(target * 0.1)
  topicIds: string[];                         // [] = spread across all root topics
  difficultyMix: Record<Difficulty, number>;  // weights summing to 1
  questionTypes: string[];                    // [] = any
  allowPastPaperContent: boolean;
  maxMarksPerTree: number;
  maxTreesPerSourcePaper: number;
  calculatorAllowed: boolean;
  title: string;
  seed: number;
}

export interface QuestionNode {
  id: string;
  parentId: string | null;
  partLabel: string | null;
  marks: number;
  difficulty: Difficulty;
  questionType: string;
  topicId: string | null;
  displayOrder: number;
  hasImage: boolean;
  children: QuestionNode[];
}

/** The atom of selection. Never split. */
export interface QuestionTree {
  root: QuestionNode;
  marks: number;              // summed over every node
  nodeCount: number;
  quotaTopicId: string;       // root-level ancestor topic, for spread accounting
  difficulty: Difficulty;     // mark-weighted dominant difficulty
  types: string[];
  paperId: string | null;
  fromPastPaper: boolean;
}

export interface SolvedSection {
  name: string;
  instructions: string | null;
  treeIds: string[];
  marks: number;
}

export interface SolverDiagnostics {
  targetMarks: number;
  achievedMarks: number;
  poolSize: number;
  candidateTrees: number;
  topicCoverage: { topicId: string; targetMarks: number; achievedMarks: number }[];
  difficultyCoverage: Record<Difficulty, { targetMarks: number; achievedMarks: number }>;
  exclusions: { reason: string; treeCount: number }[];
  shortfallReasons: string[];
  iterations: number;
}

export interface SolverResult {
  status: SolverStatus;
  trees: QuestionTree[];
  totalMarks: number;
  sections: SolvedSection[];
  diagnostics: SolverDiagnostics;
}
```

---

## 4. Stage 1 — intent parsing

`src/lib/test-generation/parse-intent.ts`

```ts
import { z } from 'zod';
import { getLlmProvider, parseJsonLoose } from '@/lib/llm';
import type { RawIntent } from './types';

const RawIntentSchema = z.object({
  subject: z.string().nullable(),
  examBoard: z.string().nullable(),
  level: z.string().nullable(),
  durationMinutes: z.number().int().min(5).max(360).nullable(),
  totalMarks: z.number().int().min(1).max(300).nullable(),
  topics: z.array(z.string()).max(20).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).nullable(),
  questionTypes: z.array(z.string()).max(10).default([]),
  calculatorAllowed: z.boolean().nullable(),
  title: z.string().max(160).nullable(),
  notes: z.string().max(500).nullable(),
});

const SYSTEM = `You extract test parameters from a teacher's request.

Return ONLY JSON matching the given schema. Rules:
- Never invent an id, uuid, or database key. Emit the words the teacher used.
- Null means "not stated". Do not guess a duration or a mark total.
- topics: only topic names the teacher explicitly named. Empty array otherwise.
- Put anything you could not map into "notes" verbatim.
- Do not write questions. You are only reading the request.`;

export async function parseIntent(prompt: string): Promise<RawIntent> {
  const llm = getLlmProvider();
  const { json } = await llm.complete<unknown>({
    system: SYSTEM,
    user: prompt,
    jsonSchema: zodToJsonSchema(RawIntentSchema),
    temperature: 0,
    maxTokens: 800,
  });

  const parsed = RawIntentSchema.safeParse(
    typeof json === 'string' ? parseJsonLoose(json) : json,
  );
  if (!parsed.success) {
    throw new IntentParseError('Could not read that request', parsed.error.issues);
  }
  return parsed.data;
}
```

`temperature: 0` because this step should be reproducible. The pipeline is
deterministic apart from the model's own nondeterminism, which this minimises.

---

## 5. Stage 2 — resolution

`src/lib/test-generation/resolve-spec.ts`

The trust boundary. Free text becomes UUIDs here, by DB lookup only.

```ts
export async function resolveSpec(
  supabase: SupabaseClient,
  intent: RawIntent,
  ctx: { classId?: string; userId: string; seed?: number },
): Promise<TestSpec>
```

Resolution order, most reliable signal first:

1. **Subject** — exact `subjects.code` match (`"0610"`), then exact `slug`, then
   case-insensitive `name` / `display_name`, then trigram similarity >= 0.4.
   Ambiguous (more than one match above threshold) throws
   `AmbiguousResolutionError` → `422` listing the candidates. Unresolved and
   `classId` given → inherit `classes.subject_id`.
2. **Exam board** — `exam_boards.code` / `short_name` / `name`. Unresolved falls
   back to `users.preferred_exam_board_id`, then null (board-agnostic pool).
3. **Level** — explicit, else `classes.level`, else `subjects.level`.
4. **Topics** — name match scoped to the resolved subject. Unmatched names are
   dropped and reported in diagnostics, never silently ignored.
5. **Duration and marks:**

```ts
const duration = intent.durationMinutes ?? DEFAULT_DURATION_MINUTES;  // 45
const rate = await getMarksPerMinute(supabase, subjectId, level);     // view, fallback 1.0
const targetMarks = intent.totalMarks ?? Math.round(duration * rate);
const marksTolerance = Math.max(2, Math.ceil(targetMarks * 0.1));
```

6. **Difficulty mix:**

```ts
const DIFFICULTY_MIX: Record<string, Record<Difficulty, number>> = {
  easy:   { easy: 0.60, medium: 0.35, hard: 0.05 },
  medium: { easy: 0.25, medium: 0.55, hard: 0.20 },
  hard:   { easy: 0.10, medium: 0.40, hard: 0.50 },
  mixed:  { easy: 0.30, medium: 0.50, hard: 0.20 },
};
```

7. **`allowPastPaperContent`** — see §8. Defaults `false`.
8. **Seed** — `ctx.seed ?? Math.floor(Math.random() * 2 ** 31)`, persisted.

---

## 6. Stage 3 — the solver

`src/lib/test-generation/solver.ts`. Pure: no Supabase, no network, no `Date.now()`.
Takes a pool and a spec, returns a result. This is what the unit tests hit.

### 6.1 Pool fetch (caller's job)

```ts
// One round trip for roots, one for descendants.
const { data: roots } = await supabase
  .from('questions')
  .select('id,parent_question_id,part_label,marks,difficulty,question_type,topic_id,display_order,image_url,paper_id')
  .eq('subject_id', spec.subjectId)
  .eq('status', 'published')
  .is('parent_question_id', null)
  .order('id')                       // stable ordering — see 6.6
  .limit(POOL_LIMIT);                // 2000
```

Board and level filters are applied only when resolved. Then one fetch for
children by `parent_question_id IN (...)`, repeated once for the third level.
Build trees in memory.

### 6.2 Tree marks

```ts
function computeTreeMarks(node: QuestionNode): number {
  if (node.children.length === 0) return node.marks ?? 0;
  const childSum = node.children.reduce((s, c) => s + computeTreeMarks(c), 0);
  // A parent with children is a context stem; its own marks column is often a
  // denormalised total. Trust the children, fall back to the parent.
  return childSum > 0 ? childSum : (node.marks ?? 0);
}
```

This rule matters. Summing parent *and* children double-counts every multi-part
question, and every generated test then comes out at half the intended length.

### 6.3 Exclusion filters

Applied before scoring, each counted into `diagnostics.exclusions`:

| Reason | Rule |
|---|---|
| `past_paper_excluded` | `fromPastPaper && !spec.allowPastPaperContent` |
| `zero_marks` | `tree.marks <= 0` — malformed ingestion |
| `oversized` | `tree.marks > spec.maxMarksPerTree` |
| `topic_out_of_scope` | `spec.topicIds.length > 0 && !inScope(tree)` |
| `type_excluded` | `spec.questionTypes.length > 0 && no overlap` |
| `missing_image_asset` | `hasImage && image_url unreachable` (phase 2) |

If exclusions leave less than `targetMarks` of pool, fail fast with the reason.
Never serve a test you know is short without saying so.

`maxMarksPerTree` defaults to `max(8, ceil(targetMarks * 0.35))` so one long
question cannot eat a third of a short test.

### 6.4 Quotas

Marks-based, not count-based. A 6-mark tree fills 6 units of its topic quota.

```ts
function buildTopicQuotas(spec: TestSpec, pool: QuestionTree[]): Quota[] {
  const topics = spec.topicIds.length > 0
    ? spec.topicIds
    : [...new Set(pool.map(t => t.quotaTopicId))];

  // Weight by available depth so a thin topic is not handed an impossible quota.
  const availability = new Map<string, number>();
  for (const t of pool) {
    availability.set(t.quotaTopicId, (availability.get(t.quotaTopicId) ?? 0) + t.marks);
  }
  const totalAvail = topics.reduce((s, id) => s + (availability.get(id) ?? 0), 0);

  return largestRemainder(
    topics.map(id => ({
      key: id,
      share: totalAvail > 0
        ? (availability.get(id) ?? 0) / totalAvail
        : 1 / topics.length,
    })),
    spec.targetMarks,
  );
}
```

`largestRemainder` distributes integer marks without drift — plain rounding leaves
the quotas summing to something other than `targetMarks`.

Difficulty quotas are the same operation applied to `spec.difficultyMix`.

### 6.5 Selection

Greedy on deficit, seeded jitter for variety, bounded repair pass.

```ts
const W_TOPIC = 3.0;
const W_DIFFICULTY = 2.0;
const W_TYPE = 1.0;
const W_JITTER = 0.35;
const MAX_REPAIR_ITERATIONS = 200;

export function solve(pool: QuestionTree[], spec: TestSpec): SolverResult {
  const rng = mulberry32(spec.seed);
  const topicQuotas = buildTopicQuotas(spec, pool);
  const diffQuotas = buildDifficultyQuotas(spec);
  const perPaper = new Map<string, number>();

  const picked: QuestionTree[] = [];
  const remaining = [...pool];
  let marks = 0;
  let iterations = 0;

  // ---- greedy fill ----
  while (marks < spec.targetMarks - spec.marksTolerance && remaining.length > 0) {
    iterations++;
    const budgetLeft = spec.targetMarks + spec.marksTolerance - marks;

    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const tree = remaining[i];
      if (tree.marks > budgetLeft) continue;
      if (tree.paperId && (perPaper.get(tree.paperId) ?? 0) >= spec.maxTreesPerSourcePaper) continue;

      const score =
        W_TOPIC * deficitRatio(topicQuotas, tree.quotaTopicId) +
        W_DIFFICULTY * deficitRatio(diffQuotas, tree.difficulty) +
        W_TYPE * typeBonus(spec, tree) +
        W_JITTER * rng();

      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    if (bestIdx === -1) break;  // nothing left fits the remaining budget

    const [tree] = remaining.splice(bestIdx, 1);
    picked.push(tree);
    marks += tree.marks;
    fill(topicQuotas, tree.quotaTopicId, tree.marks);
    fill(diffQuotas, tree.difficulty, tree.marks);
    if (tree.paperId) perPaper.set(tree.paperId, (perPaper.get(tree.paperId) ?? 0) + 1);
  }

  // ---- repair: swap to close a residual gap ----
  let gap = spec.targetMarks - marks;
  let repairs = 0;
  while (Math.abs(gap) > spec.marksTolerance && repairs < MAX_REPAIR_ITERATIONS) {
    repairs++;
    const swap = findSwap(picked, remaining, gap, spec, perPaper);
    if (!swap) break;
    applySwap(swap, { picked, remaining, topicQuotas, diffQuotas, perPaper });
    marks += swap.delta;
    gap = spec.targetMarks - marks;
  }

  return assemble(picked, spec, {
    topicQuotas, diffQuotas, pool, iterations: iterations + repairs,
  });
}
```

`findSwap` looks for an unpicked tree whose marks differ from a picked tree's by
approximately `gap`, preferring swaps that do not worsen topic or difficulty
deficit. Bounded, so the loop always terminates.

`deficitRatio` returns `(target - filled) / max(target, 1)`, clamped at 0. A quota
that is already met stops attracting selections; it does not repel them, so a thin
bank still yields a full-length test rather than failing.

### 6.6 Determinism

```ts
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Same pool + same spec + same seed produces a byte-identical test. Pool ordering
must therefore be stable — sort candidates by `id` before scoring, since Postgres
does not guarantee row order.

### 6.7 Ordering and sections

Cambridge convention, not arbitrary:

1. Partition into MCQ trees and structured/extended trees.
2. If both groups are non-empty and each holds at least 15% of total marks, emit
   `Section A (Multiple Choice)` and `Section B (Structured Questions)`.
   Otherwise a single unnamed section.
3. Within a section, ramp `easy → medium → hard`, ties broken by ascending marks,
   then by `id` for stability.
4. Renumber `question_order` 1..n across the whole assessment.

`section_name` and `section_instructions` map straight onto
`assessment_questions`, which already carries both columns.

---

## 7. Stage 4 — persistence

Reuse [`testBuilderService`](../src/lib/test-builder/test-builder-service.ts) so
generated tests are indistinguishable from hand-built ones downstream.

```ts
const { assessment } = await testBuilderService.createTest({
  assessment_type_code: 'custom_test',
  title: spec.title,
  subject_id: spec.subjectId,
  exam_board_id: spec.examBoardId ?? undefined,
  duration_minutes: spec.durationMinutes,
  total_marks: result.totalMarks,
  calculator_allowed: spec.calculatorAllowed,
  instructions: buildInstructions(spec, result),
});
```

Then bulk-insert `assessment_questions` — **one insert, not a loop**.
`addQuestionToTest` calls `recalculateTotalMarks` on every call
([`test-builder-service.ts:475`](../src/lib/test-builder/test-builder-service.ts)),
so calling it 30 times costs 30 extra round trips. Add
`addQuestionsToTestBulk(rows)` that inserts once and recalculates once.

Only root ids go into `assessment_questions`. Children resolve through the
existing question-fetch join, exactly as hand-built multi-part tests already do.

Finally stamp provenance:

```ts
await supabase.from('assessments').update({
  ai_generated: true,
  ai_prompt: prompt,
  generation_metadata: { spec, diagnostics: result.diagnostics, llmUsage, version: 1 },
}).eq('id', assessment.id);
```

`is_published` stays `false`. A generated test is always a draft.

---

## 8. Copyright control

`questions.paper_id != null` means the row was mirrored from a past paper. A
generated PDF handed to a teacher is redistribution of UCLES material.

```ts
// src/lib/test-generation/policy.ts
export function allowPastPaperContent(
  board: { code: string } | null,
  target: 'in_app' | 'pdf_export',
): boolean {
  if (target === 'in_app') return true;                 // viewing, attributed, in-product
  return LICENSED_BOARD_CODES.has(board?.code ?? '');   // empty until licensed
}
```

In-app practice may draw on past papers; PDF export defaults to original and
adapted content only. When the original pool cannot fill the budget, return
`status: 'partial'` with
`shortfallReasons: ['past_paper_content_excluded_from_export']` and let the
teacher decide — do not quietly substitute.

This is the constraint that most limits Phase 1 usefulness, and the reason
original-question authoring is a priority workstream rather than a nice-to-have.

### Measured position, 2026-08-25

Run `npx tsx scripts/test-generation-coverage.ts` to refresh these numbers.

| | |
|---|---|
| Published root questions | 435 |
| Original (exportable) | 30 (7%) |
| From past papers (blocked for export) | 405 (93%) |
| Exportable marks available | 81 |
| Past-paper marks blocked | 603 |
| Subjects that can fill a 40-mark PDF from original content | 1 of 3 |

Only three subjects have any content at all: IGCSE ICT 0417, AS and A2
Information Technology 9626. There is no Biology, so the flagship prompt does
not resolve to a subject yet.

The solver does work against this: IGCSE ICT fills a 30-mark export exactly, and
AS IT reaches 39 of 40. But ICT has 32 exportable marks in total, so a 30-mark
test consumes almost the whole pool — every generated paper will be close to
identical until the original bank grows. Treat 81 marks as the real Phase 1
ceiling, not the code.

---

## 9. API route

`src/app/api/v1/tests/generate/route.ts`

```ts
export const maxDuration = 30;
export const runtime = 'nodejs';

const GenerateRequestSchema = z.object({
  prompt: z.string().min(3).max(1000),
  classId: z.string().uuid().optional(),   // context: subject, level, board
  seed: z.number().int().optional(),       // regenerate identically
  dryRun: z.boolean().default(false),      // preview without writing
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const body = GenerateRequestSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: 'Bad Request', issues: body.error.issues },
      { status: 400 },
    );
  }

  const quota = await checkGenerationQuota(supabase, user.id, profile.subscription_tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Limit Reached', message: quota.message, upgradeRequired: true },
      { status: 429 },
    );
  }

  try {
    const intent = await parseIntent(body.data.prompt);
    const spec   = await resolveSpec(supabase, intent, { ...body.data, userId: user.id });
    const pool   = await fetchCandidatePool(supabase, spec);
    const result = solve(pool, spec);

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: 'Insufficient Content', spec, diagnostics: result.diagnostics },
        { status: 422 },
      );
    }

    if (body.data.dryRun) {
      return NextResponse.json({
        spec, preview: toPreview(result), diagnostics: result.diagnostics,
      });
    }

    const assessmentId = await persistGeneratedTest(
      supabase, user.id, body.data.prompt, spec, result,
    );

    return NextResponse.json({
      assessmentId,
      status: result.status,          // 'ok' | 'partial'
      spec,
      diagnostics: result.diagnostics,
      editUrl: `/teacher/test-builder/${assessmentId}/edit`,
    }, { status: 201 });

  } catch (err) {
    if (err instanceof IntentParseError) {
      return NextResponse.json(
        { error: 'Unclear Request', message: err.message, issues: err.issues },
        { status: 400 },
      );
    }
    if (err instanceof AmbiguousResolutionError) {
      return NextResponse.json(
        { error: 'Ambiguous', field: err.field, candidates: err.candidates },
        { status: 422 },
      );
    }
    console.error('[tests/generate]', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
```

### Status codes

| Code | Meaning |
|---|---|
| `201` | Created. `status` may still be `partial` — the client must check it. |
| `400` | Prompt unreadable, or malformed body. |
| `403` | Not a teacher. |
| `422` | Ambiguous subject/board, or the bank cannot fill the spec. Body carries candidates or diagnostics. |
| `429` | Generation quota exhausted. |

`422` is the interesting one. It is less an error than a conversation: the
response says exactly which topics were thin and by how many marks, so the UI can
offer "widen topics" or "shorten test" as one-click repairs.

Timing, measured against the hosted project rather than estimated: the pool
fetch is ~2.5 s warm (~5.8 s on a cold connection) and solving is 1-9 ms. With
one LLM call on top, expect 4-5 s warm. The cost is round trips, not rows — the
descendant walk is two sequential hops, so chunks within a hop and the topic
fetch all issue in parallel. If it needs to get faster, collapse the walk into a
single recursive CTE behind an RPC; nothing else in the path is worth tuning.
Node runtime, not edge, because of the Anthropic SDK.

---

## 10. Testing

The solver is pure, so it is genuinely testable. That is the point of the design.

**Fixtures.** Snapshot roughly 300 real published questions per subject to JSON,
including multi-part trees and known-thin topics.

**Unit — solver:**
- total marks within tolerance across 100 seeds
- identical seed produces identical output (byte-compare)
- no orphan children: every emitted id has `parent_question_id === null`
- multi-part marks counted once, never doubled
- `allowPastPaperContent: false` emits zero rows with a `paper_id`
- thin topic yields `status: 'partial'` with a named shortfall, never a silent short test
- `maxTreesPerSourcePaper` respected
- empty pool yields `failed`, no throw

**Integration — route:** student role gives 403; nonsense prompt gives 400;
`"biology"` matching two subjects gives 422 with candidates; `dryRun` writes nothing.

**Golden set.** 25 real teacher prompts with expected resolved specs. Run on every
change to the prompt or the mix constants and assert spec equality. This catches
prompt regressions, which are otherwise invisible.

### The metric

**Percentage of generated tests exported or assigned with zero question edits.**

Log `assessment_questions` mutations after generation. Below 50%, the solver
constants are wrong — tune `W_*` and the difficulty mixes. Do not tune the prompt;
Stage 1 is rarely the problem.

---

## 11. Phasing

| Phase | Scope | Gate |
|---|---|---|
| **1** | Migration, types, solver + tests, resolver, route, prompt box on `/teacher/tests`, redirect to editor | Solver tests green; golden set 20/25 |
| **2** | `dryRun` preview panel, `422` repair UI, regenerate-with-seed, coverage heatmap in admin | Zero-edit rate >= 50% |
| **3** | PDF template matching Cambridge layout, mark scheme PDF, direct assign-to-class | Teacher pilot |
| **4** | Original-question authoring pipeline, to lift the past-paper export constraint | Export pool >= 60% original |

Phase 1 is roughly 1400 lines, most of it the solver and its tests. No new UI
beyond a textarea — it redirects into the editor that already exists.

---

## 12. Not in scope

- **LLM question generation.** Deliberately excluded. Revisit only once the
  zero-edit metric is stable and a human review queue exists. A hallucinated mark
  scheme costs more trust than a short test does.
- **Async job queue.** 2-4 s is fine synchronously. Add a job row only if batch
  generation ("a test per topic for the term") ships.
