/**
 * GPT Prompts for Question Extraction
 * 
 * These prompts are designed to extract questions EXACTLY as they appear in the source
 * without making assumptions about sequential numbering.
 */

/**
 * Build the main extraction prompt for GPT
 * Focus: Preserve exact structure from source
 */
export function buildAccurateExtractionPrompt(): string {
  return `You are a precise exam paper question extractor. Your job is to extract questions EXACTLY as they appear in the source document.

## CRITICAL RULES - MUST FOLLOW

### 1. EXTRACT EXACTLY AS SHOWN
- Extract question numbers EXACTLY as they appear in the document
- DO NOT assume sequential numbering (e.g., if you see 1, then 2a, that's correct)
- DO NOT "fix" or "normalize" question numbers
- If a question shows "1" in the paper, output question_number: 1
- If next question shows "2" with part "(a)", output question_number: 2, part_label: "a"

### 2. PRESERVE THE HIERARCHY
Cambridge IGCSE papers use this hierarchy:
- Main question: Just a number (1, 2, 3...)
- Parts: Letter in parentheses (a), (b), (c)...
- Sub-parts: Roman numerals in parentheses (i), (ii), (iii)...

Examples:
- "1" → question_number: 1, part_label: null
- "(a)" under question 1 → question_number: 1, part_label: "a"
- "(i)" under part (a) → question_number: 1, part_label: "a(i)"
- "(ii)" under part (c) → question_number: X, part_label: "c(ii)"

### 3. DETECT QUESTION NUMBERS FROM CONTEXT
Question numbers in Cambridge papers appear:
- On their own line before the question text
- At the start of a line followed by the question
- The number indicates which main question this belongs to

### 4. MARKS EXTRACTION
Look for marks in these formats:
- [2] at end of line = 2 marks
- [MARKS:3] = 3 marks  
- (4 marks) = 4 marks

### 5. NO DUPLICATES
- Each question/part combination should appear EXACTLY ONCE
- If you see the same text twice, extract it only once
- Same question_number + part_label = DUPLICATE (error)

### 6. QUESTION TYPES
- "mcq": Has options A, B, C, D or asks to tick/circle
- "short_answer": 1-2 marks, brief answer expected
- "structured": 3-4 marks, requires explanation
- "essay": 5+ marks, requires detailed answer

## OUTPUT FORMAT

Return a JSON object with this structure:
{
  "questions": [
    {
      "question_number": <integer - EXACT number from paper>,
      "part_label": <null | "a" | "b" | "a(i)" | "c(ii)" etc - EXACT from paper>,
      "question_text": <the question text WITHOUT the number/part prefix>,
      "question_type": <"mcq" | "short_answer" | "structured" | "essay">,
      "marks": <integer from marks notation, 0 if not found>,
      "options": <array of {label, text} for MCQ, null otherwise>
    }
  ],
  "extraction_notes": <any issues or uncertainties you encountered>
}

## EXAMPLE

Input text:
"1
State three items that should be included in the technical documentation of a computer system.
[3]

2
(a) Describe the characteristics of a primary key.
[2]

(b) Describe the characteristics of a foreign key.
[2]

3
Describe four benefits of using smart devices.
[4]"

Output:
{
  "questions": [
    {"question_number": 1, "part_label": null, "question_text": "State three items that should be included in the technical documentation of a computer system.", "question_type": "short_answer", "marks": 3, "options": null},
    {"question_number": 2, "part_label": "a", "question_text": "Describe the characteristics of a primary key.", "question_type": "short_answer", "marks": 2, "options": null},
    {"question_number": 2, "part_label": "b", "question_text": "Describe the characteristics of a foreign key.", "question_type": "short_answer", "marks": 2, "options": null},
    {"question_number": 3, "part_label": null, "question_text": "Describe four benefits of using smart devices.", "question_type": "structured", "marks": 4, "options": null}
  ],
  "extraction_notes": "Clean extraction, all question numbers clearly visible"
}

## IMPORTANT REMINDERS
1. Extract numbers EXACTLY as shown - don't infer or assume
2. Each question_number + part_label combination must be UNIQUE
3. Part labels inherit the parent question number
4. Sub-parts like (i), (ii) go under part labels: "a(i)", "b(ii)"
5. When in doubt, preserve what you see in the source

Return ONLY the JSON object, no additional text.`;
}

/**
 * Build a validation prompt to check extraction accuracy
 */
export function buildValidationPrompt(
  sourceText: string,
  extractedQuestions: any[]
): string {
  const questionsJson = JSON.stringify(extractedQuestions, null, 2);
  
  return `You are a validation expert. Compare the extracted questions against the source text and identify any errors.

## SOURCE TEXT (first 3000 chars):
${sourceText.slice(0, 3000)}

## EXTRACTED QUESTIONS:
${questionsJson}

## VALIDATION CHECKS

Check each extracted question for:
1. **Number Accuracy**: Does question_number match what's in the source?
2. **Part Label Accuracy**: Does part_label match the hierarchy in source?
3. **Text Accuracy**: Is the question_text correct and complete?
4. **Marks Accuracy**: Do the marks match what's shown in source?
5. **No Duplicates**: Is each question_number + part_label unique?
6. **No Missing**: Are any questions from the source missing?

## OUTPUT FORMAT

{
  "accuracy_score": <0-100>,
  "issues": [
    {
      "question_index": <index in extracted array>,
      "issue_type": "wrong_number" | "wrong_part" | "wrong_text" | "wrong_marks" | "duplicate" | "missing",
      "description": <what's wrong>,
      "suggested_fix": <how to fix it>
    }
  ],
  "missing_questions": [
    {
      "question_number": <number>,
      "part_label": <label or null>,
      "reason": <why it's missing>
    }
  ],
  "summary": <brief summary of validation result>
}

Be thorough and precise. Every error must be identified.`;
}

/**
 * Build a correction prompt to fix identified issues
 */
export function buildCorrectionPrompt(
  sourceText: string,
  extractedQuestions: any[],
  validationIssues: any[]
): string {
  return `You are a correction expert. Fix the identified issues in the extracted questions.

## SOURCE TEXT (first 3000 chars):
${sourceText.slice(0, 3000)}

## CURRENT EXTRACTION:
${JSON.stringify(extractedQuestions, null, 2)}

## IDENTIFIED ISSUES:
${JSON.stringify(validationIssues, null, 2)}

## TASK
Apply the corrections to produce an accurate extraction. For each issue:
1. If wrong_number: Fix the question_number to match source
2. If wrong_part: Fix the part_label to match source
3. If duplicate: Remove the duplicate entry
4. If missing: Add the missing question

## OUTPUT FORMAT
Return the CORRECTED questions array:
{
  "questions": [
    // All questions with fixes applied
  ],
  "corrections_made": [
    // List of corrections applied
  ]
}

Be precise. Match the source exactly.`;
}

/**
 * Build prompt for extracting from specific page ranges
 */
export function buildPageRangeExtractionPrompt(
  pageNumber: number,
  previousContext?: { lastQuestionNumber: number; lastPartLabel: string | null }
): string {
  let contextNote = '';
  if (previousContext) {
    contextNote = `
## CONTEXT FROM PREVIOUS PAGE
Last question was: Q${previousContext.lastQuestionNumber}${previousContext.lastPartLabel ? `(${previousContext.lastPartLabel})` : ''}
Continue from this context - if you see a part label without a new question number, it belongs to Q${previousContext.lastQuestionNumber}.
`;
  }
  
  return `Extract questions from PAGE ${pageNumber} of an exam paper.
${contextNote}
${buildAccurateExtractionPrompt()}`;
}
