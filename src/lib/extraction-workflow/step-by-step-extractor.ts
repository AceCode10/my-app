/**
 * Step-by-Step Question Extractor
 * 
 * This module implements a sequential extraction approach:
 * 1. Extract all question numbers from the text
 * 2. Find all sub-parts (a), (b), (c) and attach to appropriate questions
 * 3. Extract question text for each question/part
 * 4. Extract marks for each question/part
 * 5. Determine question types
 * 
 * This approach is more accurate than trying to do everything at once.
 */

export interface ExtractedQuestionItem {
  questionNumber: number;
  partLabel: string | null;
  subPartLabel: string | null;
  fullLabel: string; // e.g., "1", "1a", "1a(i)"
  questionText: string;
  marks: number;
  questionType: string;
  startPosition: number;
  endPosition: number;
  displayOrder: number;
}

export interface ExtractionStep {
  step: number;
  name: string;
  input: any;
  output: any;
  success: boolean;
  errors: string[];
}

export interface StepByStepResult {
  questions: ExtractedQuestionItem[];
  steps: ExtractionStep[];
  totalMarks: number;
  maxQuestionNumber: number;
  confidence: number;
}

/**
 * STEP 1: Extract all main question numbers from text
 * Returns positions and numbers of all main questions (1, 2, 3, etc.)
 * 
 * RESILIENT APPROACH: Try multiple strategies, don't fail on one pattern not matching
 */
export function extractQuestionNumbers(text: string): Array<{
  number: number;
  position: number;
  context: string;
  isMCQ: boolean;
  isContext: boolean;
}> {
  const questions: Array<{ number: number; position: number; context: string; isMCQ: boolean; isContext: boolean }> = [];
  const seen = new Map<number, number>(); // number -> position
  
  console.log('[Step1] Starting question number extraction...');
  console.log('[Step1] Text length:', text.length);
  
  // Helper function to add a question if not already seen
  const addQuestion = (num: number, pos: number, isMCQ = false, isContext = false) => {
    if (num >= 1 && num <= 20 && !seen.has(num)) {
      seen.set(num, pos);
      questions.push({
        number: num,
        position: pos,
        context: text.substring(pos, Math.min(pos + 150, text.length)),
        isMCQ,
        isContext
      });
      return true;
    }
    return false;
  };
  
  // STRATEGY 1: Find questions after marks brackets [X]N (most reliable for Cambridge)
  // Patterns: [1]2 A..., [4]3A..., [2] 3 State...
  const afterMarksPatterns = [
    /\[(\d{1,2})\]\s*(\d{1,2})\s*([A-Z])/g,  // [1]2 A or [1] 2 A or [1]2A
  ];
  
  for (const pattern of afterMarksPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const questionNum = parseInt(match[2]);
      const position = text.indexOf(match[2], match.index + match[1].length + 1);
      if (addQuestion(questionNum, position >= 0 ? position : match.index)) {
        console.log(`[Step1] Found Q${questionNum} after [${match[1]}] at pos ${position}`);
      }
    }
  }
  
  // STRATEGY 2: Find MCQ questions (Tick patterns) - Q1 is usually MCQ
  const mcqPattern = /(\d{1,2})\s+([A-Z][^(]{5,50}?)(?:Tick|tick)\s*\(/g;
  let match;
  while ((match = mcqPattern.exec(text)) !== null) {
    const num = parseInt(match[1]);
    if (addQuestion(num, match.index, true)) {
      console.log(`[Step1] Found MCQ Q${num} (Tick pattern)`);
    }
  }
  
  // STRATEGY 3: Find questions with action keywords
  const actionKeywords = 'Explain|State|Describe|Give|Identify|Name|Define|Compare|Discuss|Calculate|Draw|Complete|Write|List|Show|Outline|Suggest';
  const actionPattern = new RegExp(`(\\d{1,2})\\s+(${actionKeywords})`, 'gi');
  while ((match = actionPattern.exec(text)) !== null) {
    const num = parseInt(match[1]);
    if (addQuestion(num, match.index)) {
      console.log(`[Step1] Found Q${num} with action word "${match[2]}"`);
    }
  }
  
  // STRATEGY 4: Find context questions (A student has..., A headteacher...)
  const contextPattern = /(\d{1,2})\s+(A\s+(?:student|headteacher|teacher|company|business|school|user|person|systems|book)|The\s+(?:student|file|systems|diagram)|Some\s+people|Portable|Absolute|Members|Anchors)/gi;
  while ((match = contextPattern.exec(text)) !== null) {
    const num = parseInt(match[1]);
    if (addQuestion(num, match.index, false, true)) {
      console.log(`[Step1] Found context Q${num}`);
    }
  }
  
  // STRATEGY 5: Generic - number followed by capital letter word (3+ chars)
  const genericPattern = /(?:^|[.\])\s])(\d{1,2})\s+([A-Z][a-z]{2,})/gm;
  while ((match = genericPattern.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const pos = match.index + match[0].indexOf(match[1]);
    if (addQuestion(num, pos)) {
      console.log(`[Step1] Found generic Q${num}`);
    }
  }
  
  // STRATEGY 6: If text has [MARKS:X] patterns, use them to infer question boundaries
  // This helps when question numbers are not clearly marked in the text
  if (questions.length < 5) {
    console.log('[Step1] Few questions found, trying [MARKS:X] pattern inference...');
    
    // Find all [MARKS:X] positions - these often mark question endings
    const marksPattern = /\[MARKS:(\d+)\]/g;
    const marksPositions: number[] = [];
    while ((match = marksPattern.exec(text)) !== null) {
      marksPositions.push(match.index);
    }
    
    console.log(`[Step1] Found ${marksPositions.length} [MARKS:X] patterns`);
    
    // If we have many marks patterns, we likely have many questions
    // Try to find question numbers before each marks pattern
    if (marksPositions.length >= 10) {
      // Look for numbers 1-17 that appear before [MARKS:X]
      for (let qNum = 1; qNum <= 17; qNum++) {
        if (seen.has(qNum)) continue;
        
        // Look for patterns like "N " or "N." where N is the question number
        const qPatterns = [
          new RegExp(`(?:^|[^0-9])${qNum}\\s+[A-Z]`, 'g'),
          new RegExp(`\\]${qNum}\\s+[A-Z]`, 'g'),  // After bracket
          new RegExp(`\\.${qNum}\\s+[A-Z]`, 'g'),  // After period
        ];
        
        for (const qPattern of qPatterns) {
          let qMatch;
          while ((qMatch = qPattern.exec(text)) !== null) {
            const pos = qMatch.index + qMatch[0].indexOf(qNum.toString());
            // Check if there's a [MARKS:X] within reasonable distance after this
            const hasMarksAfter = marksPositions.some(mp => mp > pos && mp < pos + 1000);
            if (hasMarksAfter && addQuestion(qNum, pos)) {
              console.log(`[Step1] Found Q${qNum} via marks inference at pos ${pos}`);
              break;
            }
          }
          if (seen.has(qNum)) break;
        }
      }
    }
  }
  
  // Sort by position
  questions.sort((a, b) => a.position - b.position);
  console.log(`[Step1] Found ${questions.length} questions:`, Array.from(seen.keys()).sort((a, b) => a - b));
  
  // STRATEGY 7: If we found some questions but have gaps, fill them
  // Cambridge ICT papers have Q1-Q17, so if we found Q2-Q17 but not Q1, infer Q1
  const numbers = Array.from(seen.keys()).sort((a, b) => a - b);
  if (numbers.length >= 5) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    // Fill gaps
    for (let i = 1; i <= max; i++) {
      if (!seen.has(i)) {
        // Estimate position
        const before = questions.filter(q => q.number < i);
        const after = questions.filter(q => q.number > i);
        
        let estimatedPos = 0;
        if (before.length > 0 && after.length > 0) {
          estimatedPos = Math.floor((before[before.length - 1].position + after[0].position) / 2);
        } else if (after.length > 0) {
          estimatedPos = Math.max(0, after[0].position - 200);
        } else if (before.length > 0) {
          estimatedPos = before[before.length - 1].position + 200;
        }
        
        addQuestion(i, estimatedPos, i === 1); // Q1 is usually MCQ
        console.log(`[Step1] Inferred Q${i} at position ${estimatedPos}`);
      }
    }
    questions.sort((a, b) => a.position - b.position);
  }
  
  console.log(`[Step1] Final: ${questions.length} questions`);
  return questions;
}

/**
 * STEP 2: Find all sub-parts and associate with parent questions
 * Returns parts like (a), (b), (c), (i), (ii) with their parent question numbers
 * 
 * IMPORTANT: Must handle:
 * - Level 2 parts: (a), (b), (c), (d)
 * - Level 3 sub-parts: (i), (ii), (iii), (iv)
 * - Proper parent-child relationships
 */
export function extractSubParts(
  text: string, 
  questionPositions: Array<{ number: number; position: number; isMCQ?: boolean; isContext?: boolean }>
): Array<{
  questionNumber: number;
  partLabel: string;
  subPartLabel: string | null;
  position: number;
  context: string;
  isSubPart: boolean;
}> {
  const parts: Array<{
    questionNumber: number;
    partLabel: string;
    subPartLabel: string | null;
    position: number;
    context: string;
    isSubPart: boolean;
  }> = [];
  
  console.log('[Step2] Starting sub-part extraction...');
  console.log('[Step2] Question positions:', questionPositions.map(q => `Q${q.number}@${q.position}`));
  
  // STEP 2a: Find all Level 2 part labels (a), (b), (c), (d)
  // These are single letters in parentheses
  const partPattern = /\(([a-z])\)/gi;
  let partMatch;
  
  // Track parts per question to detect proper sequences
  const partsPerQuestion = new Map<number, string[]>();
  
  while ((partMatch = partPattern.exec(text)) !== null) {
    const partLabel = partMatch[1].toLowerCase();
    const partPosition = partMatch.index;
    
    // Skip if this looks like a roman numeral (i, v, x combinations)
    if (/^[ivx]+$/.test(partLabel) && partLabel.length > 1) {
      continue;
    }
    
    // Find which question this part belongs to
    let parentQuestion = 1;
    for (let i = questionPositions.length - 1; i >= 0; i--) {
      if (questionPositions[i].position < partPosition) {
        parentQuestion = questionPositions[i].number;
        break;
      }
    }
    
    // Track parts for this question
    if (!partsPerQuestion.has(parentQuestion)) {
      partsPerQuestion.set(parentQuestion, []);
    }
    partsPerQuestion.get(parentQuestion)!.push(partLabel);
    
    parts.push({
      questionNumber: parentQuestion,
      partLabel: partLabel,
      subPartLabel: null,
      position: partPosition,
      context: text.substring(partPosition, Math.min(partPosition + 120, text.length)),
      isSubPart: false
    });
  }
  
  console.log('[Step2] Parts per question:', Object.fromEntries(partsPerQuestion));
  
  // STEP 2b: Find Level 3 sub-parts (i), (ii), (iii), (iv)
  // These are roman numerals in parentheses
  const subPartPattern = /\(([ivx]+)\)/gi;
  let subPartMatch;
  
  while ((subPartMatch = subPartPattern.exec(text)) !== null) {
    const subPartLabel = subPartMatch[1].toLowerCase();
    const subPartPosition = subPartMatch.index;
    
    // Validate it's a proper roman numeral (i, ii, iii, iv, v, vi, etc.)
    const validRomans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    if (!validRomans.includes(subPartLabel)) {
      continue;
    }
    
    // Find which question this sub-part belongs to
    let parentQuestion = 1;
    for (let i = questionPositions.length - 1; i >= 0; i--) {
      if (questionPositions[i].position < subPartPosition) {
        parentQuestion = questionPositions[i].number;
        break;
      }
    }
    
    // Find the parent part (most recent (a), (b), etc. before this position)
    let parentPart = 'a';
    const questionParts = parts.filter(p => 
      p.questionNumber === parentQuestion && 
      !p.isSubPart && 
      p.position < subPartPosition
    );
    
    if (questionParts.length > 0) {
      // Get the most recent part
      parentPart = questionParts[questionParts.length - 1].partLabel;
    }
    
    parts.push({
      questionNumber: parentQuestion,
      partLabel: parentPart,
      subPartLabel: subPartLabel,
      position: subPartPosition,
      context: text.substring(subPartPosition, Math.min(subPartPosition + 120, text.length)),
      isSubPart: true
    });
    
    console.log(`[Step2] Found sub-part Q${parentQuestion}${parentPart}(${subPartLabel}) at position ${subPartPosition}`);
  }
  
  // Sort by position to maintain document order
  parts.sort((a, b) => a.position - b.position);
  
  // Log summary
  const level2Count = parts.filter(p => !p.isSubPart).length;
  const level3Count = parts.filter(p => p.isSubPart).length;
  console.log(`[Step2] Found ${parts.length} total parts: ${level2Count} level-2 (a,b,c), ${level3Count} level-3 (i,ii,iii)`);
  
  return parts;
}

/**
 * STEP 3: Extract question text for each question/part
 * Uses positions to determine text boundaries
 * 
 * IMPORTANT: Must handle:
 * - Context questions (intro text with 0 marks before parts)
 * - MCQ questions (full question with options)
 * - Standard questions with parts
 * - Sub-parts (i), (ii) under parts (a), (b)
 */
export function extractQuestionText(
  text: string,
  questionPositions: Array<{ number: number; position: number; isMCQ?: boolean; isContext?: boolean }>,
  partPositions: Array<{ questionNumber: number; partLabel: string; subPartLabel: string | null; position: number; isSubPart?: boolean }>
): Array<{
  questionNumber: number;
  partLabel: string | null;
  subPartLabel: string | null;
  text: string;
  startPos: number;
  endPos: number;
  isContext: boolean;
  isMCQ: boolean;
}> {
  const results: Array<{
    questionNumber: number;
    partLabel: string | null;
    subPartLabel: string | null;
    text: string;
    startPos: number;
    endPos: number;
    isContext: boolean;
    isMCQ: boolean;
  }> = [];
  
  console.log('[Step3] Starting text extraction...');
  
  // Combine all positions and sort
  const allPositions: Array<{
    questionNumber: number;
    partLabel: string | null;
    subPartLabel: string | null;
    position: number;
    isContext: boolean;
    isMCQ: boolean;
  }> = [
    ...questionPositions.map(q => ({
      questionNumber: q.number,
      partLabel: null,
      subPartLabel: null,
      position: q.position,
      isContext: q.isContext || false,
      isMCQ: q.isMCQ || false
    })),
    ...partPositions.map(p => ({
      questionNumber: p.questionNumber,
      partLabel: p.partLabel,
      subPartLabel: p.subPartLabel,
      position: p.position,
      isContext: false,
      isMCQ: false
    }))
  ].sort((a, b) => a.position - b.position);
  
  console.log('[Step3] All positions:', allPositions.map(p => 
    `Q${p.questionNumber}${p.partLabel ? p.partLabel : ''}${p.subPartLabel ? `(${p.subPartLabel})` : ''}@${p.position}`
  ));
  
  // Extract text between each position
  for (let i = 0; i < allPositions.length; i++) {
    const current = allPositions[i];
    const next = allPositions[i + 1];
    
    const startPos = current.position;
    let endPos = next ? next.position : text.length;
    
    // Limit text length to avoid getting too much
    const maxLength = 800;
    if (endPos - startPos > maxLength) {
      endPos = startPos + maxLength;
    }
    
    let extractedText = text.substring(startPos, endPos);
    
    // Clean up the text
    extractedText = cleanQuestionText(extractedText, current.isMCQ);
    
    // Skip if text is too short (likely just a marker)
    if (extractedText.length < 3) {
      console.log(`[Step3] Skipping Q${current.questionNumber}${current.partLabel || ''} - text too short`);
      continue;
    }
    
    // Check if this is a context-only question (no actual question, just intro)
    // Context questions typically don't have action words and end before a part label
    const isContextOnly = current.partLabel === null && 
                          next && 
                          next.questionNumber === current.questionNumber &&
                          next.partLabel !== null &&
                          !hasActionWord(extractedText);
    
    results.push({
      questionNumber: current.questionNumber,
      partLabel: current.partLabel,
      subPartLabel: current.subPartLabel,
      text: extractedText,
      startPos,
      endPos,
      isContext: current.isContext || isContextOnly,
      isMCQ: current.isMCQ
    });
    
    if (isContextOnly) {
      console.log(`[Step3] Q${current.questionNumber} detected as context-only (intro before parts)`);
    }
  }
  
  console.log(`[Step3] Extracted text for ${results.length} items`);
  
  // Log context questions
  const contextQuestions = results.filter(r => r.isContext);
  if (contextQuestions.length > 0) {
    console.log(`[Step3] Context questions: ${contextQuestions.map(c => `Q${c.questionNumber}`).join(', ')}`);
  }
  
  return results;
}

/**
 * Check if text contains an action word (indicating it's a real question, not just context)
 */
function hasActionWord(text: string): boolean {
  const actionWords = [
    'explain', 'state', 'describe', 'give', 'identify', 'name', 'define',
    'compare', 'discuss', 'calculate', 'draw', 'complete', 'write', 'list',
    'show', 'outline', 'suggest', 'tick', 'circle', 'what', 'why', 'how',
    'which', 'when', 'where', 'who'
  ];
  const lowerText = text.toLowerCase();
  return actionWords.some(word => lowerText.includes(word));
}

/**
 * STEP 4: Extract marks for each question/part
 * Looks for [X] patterns near each question
 */
export function extractMarks(
  text: string,
  questions: Array<{ questionNumber: number; partLabel: string | null; startPos: number; endPos: number }>
): Map<string, number> {
  const marksMap = new Map<string, number>();
  
  // Multiple patterns for marks
  const marksPatterns = [
    /\[(\d{1,2})\]/g,              // [2]
    /\[(\d{1,2})\s*marks?\]/gi,    // [2 marks]
    /\((\d{1,2})\s*marks?\)/gi,    // (2 marks)
  ];
  
  for (const q of questions) {
    const key = `${q.questionNumber}${q.partLabel ? q.partLabel : ''}`;
    
    // Look in a wider range: from start to well past end
    const searchStart = Math.max(0, q.startPos - 50);
    const searchEnd = Math.min(text.length, q.endPos + 200);
    const questionText = text.substring(searchStart, searchEnd);
    
    let found = false;
    for (const pattern of marksPatterns) {
      let match;
      const localPattern = new RegExp(pattern.source, pattern.flags);
      while ((match = localPattern.exec(questionText)) !== null) {
        const marks = parseInt(match[1]);
        if (marks >= 1 && marks <= 20) {
          marksMap.set(key, marks);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
  
  console.log(`[Step4] Found marks for ${marksMap.size}/${questions.length} items`);
  
  // If we found very few marks, try a global search and assign based on proximity
  if (marksMap.size < questions.length * 0.3) {
    console.log('[Step4] Using global marks search...');
    
    // Find all marks in the entire text
    const allMarks: Array<{ marks: number; position: number }> = [];
    for (const pattern of marksPatterns) {
      let match;
      const globalPattern = new RegExp(pattern.source, pattern.flags);
      while ((match = globalPattern.exec(text)) !== null) {
        const marks = parseInt(match[1]);
        if (marks >= 1 && marks <= 20) {
          allMarks.push({ marks, position: match.index });
        }
      }
      if (allMarks.length > 0) break; // Use first pattern that works
    }
    
    console.log(`[Step4] Found ${allMarks.length} marks globally`);
    
    // Assign marks to nearest question
    for (const markInfo of allMarks) {
      let closestQuestion = questions[0];
      let minDistance = Math.abs(markInfo.position - questions[0].startPos);
      
      for (const q of questions) {
        const distance = Math.abs(markInfo.position - q.startPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestQuestion = q;
        }
      }
      
      // Only assign if reasonably close (within 500 chars)
      if (minDistance < 500) {
        const key = `${closestQuestion.questionNumber}${closestQuestion.partLabel ? closestQuestion.partLabel : ''}`;
        if (!marksMap.has(key)) {
          marksMap.set(key, markInfo.marks);
        }
      }
    }
    
    console.log(`[Step4] After global search: ${marksMap.size}/${questions.length} items have marks`);
  }
  
  return marksMap;
}

/**
 * STEP 5: Determine question types
 */
export function determineQuestionTypes(
  questions: Array<{ text: string; questionNumber: number; partLabel: string | null }>
): Map<string, string> {
  const typeMap = new Map<string, string>();
  
  for (const q of questions) {
    const key = `${q.questionNumber}${q.partLabel ? q.partLabel : ''}`;
    const text = q.text.toLowerCase();
    
    let type = 'short_answer';
    
    // Check for MCQ patterns
    if (text.includes('tick') || text.includes('circle') || 
        /\b[A-D]\s+[A-Z]/.test(q.text) ||
        text.includes('which one') || text.includes('select')) {
      type = 'multiple_choice';
    }
    // Check for extended response patterns
    else if (text.includes('describe') || text.includes('explain') || 
             text.includes('discuss') || text.includes('compare') ||
             text.includes('evaluate') || text.includes('analyse')) {
      type = 'essay_extended_response';
    }
    // Check for fill-in-blank
    else if (text.includes('complete') || text.includes('fill in') || 
             text.includes('_____')) {
      type = 'fill_in_blank';
    }
    
    typeMap.set(key, type);
  }
  
  console.log(`[Step5] Determined types for ${typeMap.size} items`);
  return typeMap;
}

/**
 * Clean question text - remove markers, normalize whitespace
 * Remove [ANSWER_LINE], [MARKS:X], numbered lists like "1 [ANSWER_LINE] 2 [ANSWER_LINE]"
 */
function cleanQuestionText(text: string, isMCQ: boolean = false): string {
  let cleaned = text
    // Remove [ANSWER_LINE] markers (with optional numbers before)
    .replace(/\d+\s*\[ANSWER_LINE\]/g, '')
    .replace(/\[ANSWER_LINE\]/g, '')
    // Remove [MARKS:X] patterns
    .replace(/\[MARKS:\d+\]/g, '')
    // Remove leading question number pattern
    .replace(/^\s*\d{1,2}\s+/, '')
    // Remove leading part label
    .replace(/^\s*\([a-z]\)\s*/i, '')
    // Remove leading sub-part label
    .replace(/^\s*\([ivx]+\)\s*/i, '')
    // Remove marks indicator at end like [2]
    .replace(/\[\d{1,2}\]\s*$/, '')
    // Remove dots/underscores used for answer lines
    .replace(/\.{3,}/g, '')
    .replace(/_{3,}/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // For MCQ questions, try to preserve the options structure
  if (isMCQ) {
    cleaned = text
      .replace(/\[ANSWER_LINE\]/g, '')
      .replace(/\[MARKS:\d+\]/g, '')
      .replace(/^\s*\d{1,2}\s+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  return cleaned;
}

/**
 * Extract marks from [MARKS:X] pattern in question text
 */
function extractMarksFromText(text: string): number {
  const match = text.match(/\[MARKS:(\d+)\]/);
  if (match) {
    return parseInt(match[1]);
  }
  // Also try [X] pattern at end
  const endMatch = text.match(/\[(\d{1,2})\]\s*$/);
  if (endMatch) {
    return parseInt(endMatch[1]);
  }
  return 0;
}

/**
 * Calculate display order for sorting
 */
function calculateDisplayOrder(questionNumber: number, partLabel: string | null, subPartLabel: string | null): number {
  let order = questionNumber * 10000;
  
  if (partLabel) {
    const partValue = partLabel.charCodeAt(0) - 96; // a=1, b=2, etc.
    order += partValue * 100;
  }
  
  if (subPartLabel) {
    const romanValues: Record<string, number> = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5 };
    order += romanValues[subPartLabel] || 0;
  }
  
  return order;
}

/**
 * Main function: Run the step-by-step extraction
 */
export function runStepByStepExtraction(text: string): StepByStepResult {
  const steps: ExtractionStep[] = [];
  let questions: ExtractedQuestionItem[] = [];
  
  console.log('[StepByStep] Starting extraction...');
  console.log('[StepByStep] Text length:', text.length);
  
  // STEP 1: Extract question numbers
  const step1Start = Date.now();
  const questionNumbers = extractQuestionNumbers(text);
  steps.push({
    step: 1,
    name: 'Extract Question Numbers',
    input: { textLength: text.length },
    output: { count: questionNumbers.length, numbers: questionNumbers.map(q => q.number) },
    success: questionNumbers.length > 0,
    errors: questionNumbers.length === 0 ? ['No question numbers found'] : []
  });
  
  if (questionNumbers.length === 0) {
    console.log('[StepByStep] Step 1 failed - no question numbers found');
    return {
      questions: [],
      steps,
      totalMarks: 0,
      maxQuestionNumber: 0,
      confidence: 0
    };
  }
  
  // STEP 2: Extract sub-parts
  const subParts = extractSubParts(text, questionNumbers);
  steps.push({
    step: 2,
    name: 'Extract Sub-Parts',
    input: { questionCount: questionNumbers.length },
    output: { partCount: subParts.length },
    success: true,
    errors: []
  });
  
  // STEP 3: Extract question text
  const questionTexts = extractQuestionText(text, questionNumbers, subParts);
  steps.push({
    step: 3,
    name: 'Extract Question Text',
    input: { itemCount: questionNumbers.length + subParts.length },
    output: { textCount: questionTexts.length },
    success: questionTexts.length > 0,
    errors: questionTexts.length === 0 ? ['No question text extracted'] : []
  });
  
  // STEP 4: Extract marks
  const marksMap = extractMarks(text, questionTexts.map(q => ({
    questionNumber: q.questionNumber,
    partLabel: q.partLabel,
    startPos: q.startPos,
    endPos: q.endPos
  })));
  
  const totalMarks = Array.from(marksMap.values()).reduce((sum, m) => sum + m, 0);
  steps.push({
    step: 4,
    name: 'Extract Marks',
    input: { questionCount: questionTexts.length },
    output: { marksFound: marksMap.size, totalMarks },
    success: marksMap.size > 0,
    errors: marksMap.size === 0 ? ['No marks found'] : []
  });
  
  // STEP 5: Determine question types
  const typeMap = determineQuestionTypes(questionTexts);
  steps.push({
    step: 5,
    name: 'Determine Question Types',
    input: { questionCount: questionTexts.length },
    output: { typesFound: typeMap.size },
    success: true,
    errors: []
  });
  
  // Combine all data into final questions
  for (const qt of questionTexts) {
    const key = `${qt.questionNumber}${qt.partLabel ? qt.partLabel : ''}`;
    const subKey = qt.subPartLabel 
      ? `${qt.questionNumber}${qt.partLabel}(${qt.subPartLabel})`
      : key;
    
    const fullLabel = qt.subPartLabel 
      ? `${qt.questionNumber}${qt.partLabel}(${qt.subPartLabel})`
      : qt.partLabel 
        ? `${qt.questionNumber}${qt.partLabel}`
        : `${qt.questionNumber}`;
    
    // Extract marks from [MARKS:X] in the raw text first
    let marks = extractMarksFromText(qt.text);
    
    // If no marks in text, try the marksMap
    if (marks === 0 && !qt.isContext) {
      marks = marksMap.get(subKey) || marksMap.get(key) || 0;
    }
    
    // Clean the question text (removes [ANSWER_LINE], [MARKS:X], etc.)
    const cleanedText = cleanQuestionText(qt.text, qt.isMCQ || false);
    
    // Determine question type
    let questionType = typeMap.get(key) || 'short_answer';
    if (qt.isMCQ) {
      questionType = 'mcq';
    } else if (qt.isContext) {
      questionType = 'context';
    }
    
    questions.push({
      questionNumber: qt.questionNumber,
      partLabel: qt.partLabel,
      subPartLabel: qt.subPartLabel,
      fullLabel,
      questionText: cleanedText,
      marks,
      questionType,
      startPosition: qt.startPos,
      endPosition: qt.endPos,
      displayOrder: calculateDisplayOrder(qt.questionNumber, qt.partLabel, qt.subPartLabel)
    });
  }
  
  // Sort by display order
  questions.sort((a, b) => a.displayOrder - b.displayOrder);
  
  // Calculate confidence
  const maxQuestion = Math.max(...questions.map(q => q.questionNumber), 0);
  const confidence = calculateConfidence(questions, totalMarks, maxQuestion);
  
  console.log(`[StepByStep] Extraction complete: ${questions.length} questions, ${totalMarks} marks, ${(confidence * 100).toFixed(1)}% confidence`);
  
  return {
    questions,
    steps,
    totalMarks,
    maxQuestionNumber: maxQuestion,
    confidence
  };
}

/**
 * Calculate confidence score based on extraction results
 */
function calculateConfidence(
  questions: ExtractedQuestionItem[],
  totalMarks: number,
  maxQuestion: number
): number {
  let confidence = 1.0;
  
  // Check 1: Did we find enough questions?
  if (questions.length < 10) {
    confidence -= 0.2;
  }
  
  // Check 2: Are there gaps in question numbers?
  const numbers = new Set(questions.map(q => q.questionNumber));
  for (let i = 1; i <= maxQuestion; i++) {
    if (!numbers.has(i)) {
      confidence -= 0.05;
    }
  }
  
  // Check 3: Do we have marks for most questions?
  const withMarks = questions.filter(q => q.marks > 0).length;
  if (withMarks < questions.length * 0.5) {
    confidence -= 0.1;
  }
  
  // Check 4: Is total marks reasonable? (Cambridge ICT is usually 80)
  if (totalMarks < 60 || totalMarks > 100) {
    confidence -= 0.1;
  }
  
  // Check 5: Do we have text for all questions?
  const withText = questions.filter(q => q.questionText.length > 10).length;
  if (withText < questions.length * 0.8) {
    confidence -= 0.1;
  }
  
  return Math.max(0, Math.min(1, confidence));
}
