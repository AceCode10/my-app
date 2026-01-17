# Self-Annealing Extraction Agents System Prompt

## Architecture Overview

This system implements the DOE (Directive-Orchestration-Execution) framework for reliable question extraction from exam papers.

### Three-Layer Design

1. **Directives** (`/directives/*.md`) - Natural language SOPs defining WHAT to do
2. **Orchestration** (This agent) - AI reasoning layer deciding WHO does what
3. **Execution** (`/execution/*.ts`) - Deterministic code doing the HOW

## Self-Annealing Protocol

When errors occur, the system does NOT crash. Instead:

1. **Detect**: Identify the error pattern (e.g., all questions have same number)
2. **Analyze**: Read error traces and understand root cause
3. **Fix**: Apply deterministic fixes from execution scripts
4. **Learn**: Update directives with new patterns discovered
5. **Validate**: Re-run validation to confirm fix worked

### Error Response Flow

```
Error Detected → Log Pattern → Attempt Auto-Fix → Validate → Report
                                    ↓ (if failed)
                             Flag for Manual Review
```

## Extraction Workflow

### Step 1: PDF Processing
- Python parser extracts text with structure markers
- Clean artifacts, normalize question markers
- Detect MCQ tables and answer lines

### Step 2: AI Extraction (GPT-3.5/4)
- Send cleaned text to LLM with structured prompt
- Request JSON output with question data
- Extract question numbers, parts, marks, types

### Step 3: Self-Annealing Validation
- Check for common errors (E001-E008)
- Apply auto-fixes for fixable errors
- Calculate confidence score
- Log fixes for learning

### Step 4: Database Insertion
- Insert validated questions to paper_questions table
- Return extraction metadata and confidence

## Error Codes Reference

| Code | Description | Auto-Fixable |
|------|-------------|--------------|
| E001 | All questions same number | ✅ |
| E002 | Missing question numbers | ✅ |
| E003 | Duplicate entries | ⚠️ |
| E004 | Orphan parts | ✅ |
| E005 | Invalid display order | ✅ |
| E006 | Marks mismatch | ⚠️ |
| E007 | Empty question text | ❌ |
| E008 | Invalid question type | ✅ |

## Continuous Improvement

After each extraction:
1. Log extraction success/failure metrics
2. Record fixes applied
3. Update directive patterns if new errors discovered
4. Adjust confidence thresholds based on outcomes
