# AI Test Builder — Prompt-Based Test Generation

> Reference document for future implementation. This feature allows teachers to generate tests using natural language prompts.

## Architecture Overview

```
Teacher Prompt → API Route → AI Service (OpenAI) → Question Selection/Generation → PDF Generation → Delivery
```

## Key Components

### 1. Prompt Input UI (`src/components/test-builder/AITestPrompt.tsx`)
- Single textarea for natural language prompts (e.g., "Create a Cambridge ICT 0417 test, 40 minutes, 25 marks")
- Smart prompt suggestions / auto-complete for subject codes, exam boards
- Preset templates: "Quick Quiz", "Full Exam", "Topic Focus"
- Optional constraints panel: subject dropdown, exam board, difficulty, topic filters

### 2. Prompt Parsing API (`src/app/api/test-builder/ai-generate/route.ts`)
- Receives raw prompt text
- Uses OpenAI (GPT-4-mini) to parse into structured parameters:
  ```json
  {
    "subject_code": "0417",
    "exam_board": "cambridge",
    "duration_minutes": 40,
    "total_marks": 25,
    "topics": null,
    "difficulty": "mixed",
    "question_types": ["short_answer", "extended_response"]
  }
  ```

### 3. Question Selection Strategy (Hybrid)

**Primary — Database-first:**
- Query existing questions from `questions` table
- Filter by subject_id, exam_board_id, marks, topic, difficulty
- Scoring algorithm assembles a balanced test hitting target marks and time
- Fast, reliable, uses verified content

**Fallback — AI-generated questions:**
- If database has <80% of target marks coverage, use GPT-4 to generate new questions in Cambridge format
- Flag as "AI-generated", optionally require teacher approval
- Always show teachers which questions are bank vs. AI-generated

### 4. Test Assembly Algorithm

```
1. Parse prompt → structured params
2. Query questions matching subject, board, topics
3. Score questions by relevance (topic coverage, difficulty spread)
4. Greedy knapsack: fill marks budget with optimal question mix
5. Validate: check time estimate vs. duration (~1 mark ≈ 1.5 min for Cambridge)
6. If insufficient questions → trigger AI generation for remaining marks
7. Return assembled test ordered by difficulty/topic
```

### 5. PDF Generation (`src/lib/pdf/test-pdf-generator.ts`)

**Options:**
- `@react-pdf/renderer` — React-based, no headless browser needed
- `puppeteer` — Server-side, full HTML/CSS rendering
- `jsPDF` — Lightweight, no headless browser

**Template structure (matching Cambridge format):**
- Header: Subject name, code, paper number, time, total marks
- Instructions section
- Questions with mark allocations in margin
- Answer lines/spaces proportional to marks
- Separate mark scheme PDF

### 6. Database Additions

```sql
ALTER TABLE assessments ADD COLUMN ai_generated BOOLEAN DEFAULT false;
ALTER TABLE assessments ADD COLUMN ai_prompt TEXT;
ALTER TABLE assessments ADD COLUMN generation_metadata JSONB;

ALTER TABLE questions ADD COLUMN ai_generated BOOLEAN DEFAULT false;
ALTER TABLE questions ADD COLUMN ai_verified BOOLEAN DEFAULT false;
```

## Cost & Performance

| Aspect | Detail |
|--------|--------|
| OpenAI API cost | Parsing: ~$0.01/req (GPT-4-mini). Generation: ~$0.05-0.15/question (GPT-4) |
| Latency | Parsing: 1-2s. DB query + assembly: <1s. PDF: 2-5s. Total: ~5-8s |
| Rate limiting | 10 AI generations/day for free tier |
| Caching | Cache parsed prompts → assembled tests for repeated similar prompts |
| Quality control | AI-generated questions flagged and optionally reviewed |

## Implementation Phases

### Phase 1 (MVP)
- Prompt parsing + database question selection + test assembly
- No AI question generation
- PDF export with basic template

### Phase 2
- AI question generation as supplement
- Improved PDF templates matching Cambridge format
- Mark scheme auto-generation

### Phase 3
- Smart suggestions, prompt history, template library
- Analytics on generated tests
- Student performance correlation with AI-generated content

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Hallucinated questions | Only use AI questions as supplements, clearly labeled. Require teacher review. |
| Incorrect mark allocation | Validate total marks against prompt requirements before delivery. |
| Subject mismatches | Map subject codes (0417, 0478, etc.) to database subjects — maintain mapping table. |
| PDF formatting | Test with multiple Cambridge paper formats for professional output. |
