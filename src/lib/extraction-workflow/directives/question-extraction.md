# Question Extraction Directive (SOP)

## Purpose
Extract questions from IGCSE/Cambridge exam papers with **EXACT** numbering, structure, and metadata as they appear in the source document.

## Multi-Layered Extraction System

The extraction system uses 5 layers to ensure accuracy:

### Layer 1: Source Truth Extractor
- Extracts question markers directly from source text
- Preserves exact positions for validation
- Detects question numbers, part labels, sub-parts

### Layer 2: Structure Parser
- Parses markers into structured question blocks
- Maintains parent-child relationships (Q → part → sub-part)
- Calculates display order for sorting

### Layer 3: Validation Engine
- Validates extraction against source text
- Detects anomalies (duplicates, missing numbers, wrong sequences)
- Calculates confidence score (0-100%)

### Layer 4: Confidence Gate
- Only approves extraction when confidence ≥ 90%
- Applies automatic fixes for detected issues
- Removes duplicates, keeping most complete version

### Layer 5: Learning System
- Records extraction patterns and outcomes
- Stores successful patterns for future use
- Tracks corrections for continuous improvement

## Critical Requirements

### 1. EXACT Number Extraction (NOT Sequential)
- Extract question numbers **EXACTLY** as they appear in the document
- DO NOT assume or enforce sequential numbering
- If paper shows Q1, Q2, Q5, Q6 - extract those exact numbers
- Question numbers must be read from:
  - Explicit numbers at start of lines (standalone)
  - Numbers followed by text on same line
  - Context within hierarchical structure

### 2. Part Label Hierarchy
- Main question: no part_label (null)
- Sub-parts: (a), (b), (c)...
- Sub-sub-parts: (i), (ii), (iii)...
- Combined: a(i), a(ii), b(i), etc.

### 3. Marks Detection
- Look for [X], [MARKS:X], (X marks) patterns
- If no marks found, use default values:
  - MCQ: 1 mark (fixed)
  - Short Answer: 1 mark (fixed)
  - Structured: 4-6 marks
  - Essay: 6-12 marks
- **Mark Scheme Matching**: When processing mark sheets, match mark allocations exactly with question numbers/parts from question paper
- **Cambridge Priority**: If Cambridge IGCSE detected, apply Cambridge-specific rules first, then fallback to general rules

### 4. Cambridge IGCSE Specific Rules (Priority 1)
**Apply these FIRST when Cambridge is detected:**

#### Question Number Format
- Numbers on separate lines: "1\nQuestion text"
- Parts in parentheses: "(a)", "(b)", "(c)"
- Sub-parts: "(i)", "(ii)", "(iii)"
- Total marks at end: "[MARKS:2]" or "[2]"

#### Marks Allocation Pattern
- MCQ: Usually 1 mark, sometimes 2
- Short answer: 1-3 marks
- Structured: 4-6 marks total (split across parts)
- Essay: 6-12 marks

#### Common Cambridge Patterns
```
1
Question text here [MARKS:2]

2
(a) Explain... [MARKS:2]
(b) Give examples... [MARKS:2]
(i) Example 1 [MARKS:1]
(ii) Example 2 [MARKS:1]
```

### 5. Display Order Calculation
```
display_order = question_number * 10000 + part_value * 100 + subpart_value
```
Where:
- part_value: a=1, b=2, c=3...
- subpart_value: i=1, ii=2, iii=3...

## Validation Rules

### Post-Extraction Checks
1. **Sequential Numbers**: Questions should have sequential numbers 1,2,3...
2. **No Duplicates**: No two main questions should have same number without part_label
3. **Marks Sum**: Total marks should roughly match paper total
4. **Ordering**: display_order should create proper sort sequence

### Error Detection Patterns
| Error Pattern | Detection | Auto-Fix |
|--------------|-----------|----------|
| All question_number = 1 | Count unique numbers < 3 | Re-infer from text patterns |
| Missing question numbers | Gaps > 3 in sequence | Sequential assignment |
| Part labels as questions | Has (a) but no parent | Create parent question |
| Duplicate entries | Same text + same number | **Remove duplicates (keep most complete)** |

### Duplicate Removal Logic
When duplicates are detected:
1. Create unique key: `question_number|part_label|first_100_chars_of_text`
2. If duplicate found, keep the entry with:
   - Higher marks value (more complete extraction)
   - Longer question text (more complete extraction)
3. Log removed duplicates for debugging

## Self-Annealing Protocol

When an error is detected:
1. Log the error pattern and raw input
2. Attempt auto-fix using rules above
3. If fix succeeds, record the fix in extraction_history
4. If fix fails, flag for manual review
5. Update this directive with new patterns discovered

### Cambridge Exception Handling
- When Cambridge patterns don't match expected format:
  1. Log the exception pattern with document ID
  2. Extract the actual pattern used
  3. Add to Cambridge exception database
  4. Update Cambridge rules to include new pattern
  5. Test on next Cambridge document

## Learning Database

Store successful extractions to improve:
- Pattern recognition for question boundaries
- Marks estimation accuracy
- Question type classification
- **Cambridge pattern variations** (track exceptions and improvements)
