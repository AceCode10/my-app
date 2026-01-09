import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// TEXT SANITIZATION
// ============================================

function sanitizeInputText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/ {3,}/g, '  ')
    .trim();
}

// ============================================
// MARK SCHEME PREPROCESSING
// ============================================

function preprocessMarkScheme(text: string): string {
  let processed = text;
  
  // Remove common header/footer patterns
  processed = processed
    .replace(/Cambridge International.*?Mark Scheme/gi, '')
    .replace(/PUBLISHED/gi, '')
    .replace(/May\/June \d{4}/gi, '')
    .replace(/© Cambridge University Press.*?\d{4}/gi, '')
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/\[Turn over\]/gi, '');
  
  // Remove entire Generic Marking Principles section (before actual questions start)
  // This section typically ends when we see "Question" followed by a number or "Answer"
  processed = processed.replace(
    /Generic Marking Principle[\s\S]*?(?=Question\s+Answer|Question\s+\d+|\d+\s+One mark)/i,
    ''
  );
  
  // Remove Annotations guidance section
  processed = processed.replace(
    /Annotations guidance[\s\S]*?(?=Question\s+Answer|Question\s+\d+|\d+\s+One mark)/i,
    ''
  );
  
  // Normalize question number patterns
  processed = processed
    .replace(/Question\s+Answer\s+Marks/gi, '[TABLE_HEADER]')
    .replace(/(\d+)\s*\(([a-z])\)/gi, '$1($2)') // Normalize 7 (a) to 7(a)
    .replace(/(\d+)\s*\(([ivx]+)\)/gi, '$1($2)'); // Normalize 7 (i) to 7(i)
  
  // Mark answer points
  processed = processed
    .replace(/•\s*/g, '[POINT] ')
    .replace(/–\s*/g, '[SUBPOINT] ')
    .replace(/\(1st\)/g, '[MARK:1:PRIMARY]')
    .replace(/\(1\)/g, '[MARK:1]')
    .replace(/\(2\)/g, '[MARK:2]')
    .replace(/\(3\)/g, '[MARK:3]')
    .replace(/\(4\)/g, '[MARK:4]')
    .replace(/\(5\)/g, '[MARK:5]')
    .replace(/\(6\)/g, '[MARK:6]');
  
  return processed.trim();
}

// ============================================
// AI PROMPT FOR MARK SCHEME EXTRACTION
// ============================================

function buildMarkSchemePrompt(): string {
  return `You are an expert at extracting model answers from Cambridge/IGCSE mark scheme PDFs.

## YOUR TASK
Extract all answers from this mark scheme and match them to question numbers.

## CRITICAL: IGNORE THESE SECTIONS
- DO NOT extract "Generic Marking Principles" - these are general guidelines, NOT answers to specific questions
- DO NOT extract "Annotations guidance" - these are examiner instructions, NOT answers
- ONLY extract content that appears AFTER the table header "Question | Answer | Marks" or after you see "Question 1"
- ONLY extract actual marking points for specific numbered questions (starting from Question 1)
- If you see text like "Marks must be awarded in line with..." or "Marks are awarded for correct/valid answers..." this is a PRINCIPLE, not an answer - SKIP IT

## MARK SCHEME STRUCTURE
Mark schemes typically have:
- Question number (e.g., 1, 2, 7(a), 7(b), 9)
- Answer points (bullet points with acceptable answers)
- Mark allocation (e.g., [MARK:1] means 1 mark per point)
- Maximum marks for the question

## EXTRACTION RULES
1. SKIP all content before the first actual question (Question 1)
2. Extract the question number exactly as shown (e.g., "7(a)" not "7a")
3. Combine all answer points into a coherent mark scheme text
4. Include mark allocation for each point where shown
5. Preserve the structure: main points and sub-points
6. For questions with multiple acceptable answers, list all options

## QUESTION NUMBER PATTERNS
Mark schemes show: 2(a), 2(b)(i), 7(a)(ii)
But you must normalize part_label to match question format:
- "2(a)" → question_number: 2, part_label: "a"
- "2(b)(i)" → question_number: 2, part_label: "b(i)" (NOT "b(i)" with extra parens)
- "7(a)(ii)" → question_number: 7, part_label: "a(ii)"

## OUTPUT FORMAT
{
  "answers": [
    {
      "question_number": <integer>,
      "part_label": <null | "a" | "b" | "b(i)" | "a(ii)" etc - NO PARENTHESES around main letter>,
      "mark_scheme": <string with all answer points and mark allocations>,
      "max_marks": <integer total marks for this question/part>
    }
  ]
}

## CRITICAL: Part Label Normalization
When you see "2(b)(i)" in mark scheme:
- Extract question_number: 2
- Extract part_label: "b(i)" (remove outer parentheses, keep inner ones)
When you see "7(a)":
- Extract question_number: 7  
- Extract part_label: "a" (remove parentheses)

## EXAMPLE
Input:
"Question 3
One mark per bullet point to a maximum of four marks.
[POINT] Blocks threats to data//potential attackers [MARK:1]
[POINT] Only allows allowed IP addresses [MARK:1]
[POINT] Checks allowed IP addresses in allowed/forbidden table/list [MARK:1]
[POINT] Blocks/allows ports for data transmission [MARK:1]
4"

Output:
{"answers":[
  {"question_number":3,"part_label":null,"mark_scheme":"One mark per bullet point (max 4 marks):\n• Blocks threats to data/potential attackers (1)\n• Only allows allowed IP addresses (1)\n• Checks allowed IP addresses in allowed/forbidden table/list (1)\n• Blocks/allows ports for data transmission (1)","max_marks":4}
]}

## EXAMPLE WITH PARTS
Input:
"Question 2(b)(i)
Two from, for example:
Word processing software
Spreadsheet
Database management system
Applets
2"

Output:
{"answers":[
  {"question_number":2,"part_label":"b(i)","mark_scheme":"Two from, for example:\n• Word processing software\n• Spreadsheet\n• Database management system\n• Applets","max_marks":2}
]}

## ANOTHER EXAMPLE
Input:
"Question 7(a)(ii)
Two from:
This is a collection of facts and rules
Created from information provided by experts
2"

Output:
{"answers":[
  {"question_number":7,"part_label":"a(ii)","mark_scheme":"Two from:\n• This is a collection of facts and rules\n• Created from information provided by experts","max_marks":2}
]}

Return ONLY valid JSON with "answers" array. Include ALL answers found.`;
}

// ============================================
// ANSWER EXTRACTION WITH AI
// ============================================

async function extractAnswersWithAI(text: string): Promise<any[]> {
  const processedText = preprocessMarkScheme(sanitizeInputText(text));
  const systemPrompt = buildMarkSchemePrompt();

  console.log('Pre-processed mark scheme sample:', processedText.slice(0, 500));

  // Determine which model to use based on text length
  const MAX_GPT35_LENGTH = 30000;
  const MAX_GPT4_LENGTH = 100000;
  
  let model = 'gpt-3.5-turbo-0125';
  let textToProcess = processedText;
  
  if (processedText.length > MAX_GPT35_LENGTH) {
    console.log(`Text length ${processedText.length} exceeds GPT-3.5 limit, using GPT-4`);
    model = 'gpt-4-turbo-preview';
    
    if (processedText.length > MAX_GPT4_LENGTH) {
      console.warn(`Text length ${processedText.length} exceeds GPT-4 limit, truncating`);
      textToProcess = processedText.slice(0, MAX_GPT4_LENGTH);
    }
  }

  console.log(`Processing ${textToProcess.length} characters with ${model}`);

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Extract answers from this mark scheme:\n\n${textToProcess}` 
      }
    ],
    temperature: 0.05,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  });

  const responseText = response.choices[0].message.content?.trim() || '{}';
  
  try {
    const data = JSON.parse(responseText);
    const answers = data.answers || data.data || [];
    
    // Post-process to normalize part labels
    const normalizedAnswers = answers.map((answer: any) => {
      let partLabel = answer.part_label;
      
      if (partLabel && typeof partLabel === 'string') {
        console.log(`Original part_label: "${partLabel}"`);
        
        // Remove outer parentheses: "(a)" -> "a", "(b)(i)" -> "b(i)"
        partLabel = partLabel.replace(/^\(([a-z])\)$/i, '$1'); // (a) -> a
        partLabel = partLabel.replace(/^\(([a-z])\)\(([ivx]+)\)$/i, '$1($2)'); // (a)(i) -> a(i)
        
        console.log(`Normalized part_label: "${partLabel}"`);
      }
      
      return {
        ...answer,
        part_label: partLabel
      };
    });
    
    console.log('Normalized answers:', normalizedAnswers);
    return normalizedAnswers;
  } catch (parseError) {
    console.error('Failed to parse AI response:', responseText.slice(0, 500));
    throw new Error('AI returned invalid JSON. Please try again.');
  }
}

// ============================================
// MATCHING ANSWERS TO QUESTIONS
// ============================================

interface QuestionMatch {
  question_id: string;
  question_number: number;
  part_label: string | null;
  current_mark_scheme: string | null;
  new_mark_scheme: string;
  max_marks: number;
  matched: boolean;
}

function normalizePartLabel(label: string | null): string | null {
  if (!label) return null;
  // Normalize: remove spaces, lowercase, handle different formats
  return label.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\(([a-z])\)\(([ivx]+)\)/g, '$1($2)') // (a)(i) -> a(i)
    .replace(/^\(([a-z])\)$/g, '$1'); // (a) -> a
}

function matchAnswersToQuestions(
  answers: any[],
  questions: any[]
): { matched: QuestionMatch[], unmatched: any[] } {
  const matched: QuestionMatch[] = [];
  const unmatched: any[] = [];
  
  // Create multiple maps for flexible matching
  const exactMap = new Map<string, any>(); // Exact match: "6:a"
  const numberOnlyMap = new Map<number, any[]>(); // By number only for fallback
  
  for (const q of questions) {
    const normalizedPart = normalizePartLabel(q.part_label) || '';
    const exactKey = `${q.question_number}:${normalizedPart}`;
    exactMap.set(exactKey, q);
    
    // Also group by question number for flexible matching
    if (!numberOnlyMap.has(q.question_number)) {
      numberOnlyMap.set(q.question_number, []);
    }
    numberOnlyMap.get(q.question_number)!.push(q);
  }
  
  for (const answer of answers) {
    const answerPart = normalizePartLabel(answer.part_label) || '';
    const exactKey = `${answer.question_number}:${answerPart}`;
    
    // Try exact match first
    let question = exactMap.get(exactKey);
    
    // If no exact match, try flexible matching strategies
    if (!question) {
      const questionsForNumber = numberOnlyMap.get(answer.question_number) || [];
      
      if (questionsForNumber.length > 0) {
        // Strategy 1: If answer has no part but questions have parts, try to match first answerable part
        if (!answerPart) {
          // Find first question with this number that needs an answer and has marks
          question = questionsForNumber.find(q => q.marks > 0 && !q.mark_scheme);
          if (!question) {
            // Or just the first one with marks
            question = questionsForNumber.find(q => q.marks > 0);
          }
        }
        
        // Strategy 2: If answer has part like "a" but questions have "a(i)", "a(ii)", match to parent "a"
        if (!question && answerPart && !answerPart.includes('(')) {
          question = questionsForNumber.find(q => {
            const qPart = normalizePartLabel(q.part_label) || '';
            return qPart === answerPart || qPart.startsWith(answerPart + '(');
          });
        }
        
        // Strategy 3: Match by part label similarity (e.g., "a(i)" to "a(i)")
        if (!question && answerPart) {
          question = questionsForNumber.find(q => {
            const qPart = normalizePartLabel(q.part_label) || '';
            // Try various normalizations
            return qPart === answerPart || 
                   qPart === answerPart.replace(/\(/g, '').replace(/\)/g, '') ||
                   qPart.replace(/\(/g, '').replace(/\)/g, '') === answerPart;
          });
        }
      }
    }
    
    if (question) {
      matched.push({
        question_id: question.id,
        question_number: question.question_number,
        part_label: question.part_label,
        current_mark_scheme: question.mark_scheme,
        new_mark_scheme: answer.mark_scheme,
        max_marks: answer.max_marks,
        matched: true
      });
      
      // Mark this question as matched to avoid double-matching
      exactMap.delete(exactKey);
    } else {
      unmatched.push({
        ...answer,
        matched: false,
        reason: `No question found for Q${answer.question_number}${answer.part_label ? `(${answer.part_label})` : ''}`
      });
    }
  }
  
  return { matched, unmatched };
}

// ============================================
// API ENDPOINT
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paperId } = await params;
    const formData = await request.formData();
    
    const pdfFile = formData.get('pdf') as File | null;
    const textContent = formData.get('text') as string | null;
    const autoApply = formData.get('autoApply') === 'true';
    const usePythonParser = formData.get('usePython') === 'true';
    
    let extractedText = '';
    
    // Try Python parser if available
    if (pdfFile && usePythonParser) {
      try {
        const pythonUrl = process.env.PYTHON_PARSER_URL || 'http://localhost:5001';
        console.log('Attempting Python parser for mark scheme at:', pythonUrl);
        
        const pythonFormData = new FormData();
        pythonFormData.append('file', pdfFile);
        
        const pythonResponse = await fetch(`${pythonUrl}/parse-pdf`, {
          method: 'POST',
          body: pythonFormData,
          signal: AbortSignal.timeout(30000),
        });
        
        if (pythonResponse.ok) {
          const pythonResult = await pythonResponse.json();
          
          if (pythonResult.success && pythonResult.data) {
            extractedText = pythonResult.data.cleaned_text;
            console.log('Python parser extracted', extractedText.length, 'characters from mark scheme');
          }
        }
      } catch (pythonError) {
        console.warn('Python parser failed, will use text content:', pythonError);
      }
    }
    
    // Use provided text content if Python parser didn't work
    if (!extractedText && textContent) {
      extractedText = textContent;
    }
    
    if (!extractedText) {
      // If we have a PDF but no text, suggest using text input instead
      if (pdfFile) {
        return NextResponse.json(
          { 
            error: 'Could not extract text from the PDF. The mark scheme may be image-based or scanned. Please copy and paste the mark scheme text directly into the text field.',
            suggestion: 'paste_text'
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'No text content provided. Please upload a PDF or paste mark scheme text.' },
        { status: 400 }
      );
    }
    
    // Fetch existing questions for this paper
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('paper_questions')
      .select('id, question_number, part_label, mark_scheme, marks')
      .eq('paper_id', paperId)
      .order('display_order');
    
    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing questions' },
        { status: 500 }
      );
    }
    
    if (!existingQuestions || existingQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for this paper. Please extract questions first.' },
        { status: 400 }
      );
    }
    
    console.log(`Found ${existingQuestions.length} existing questions for paper ${paperId}`);
    
    // Extract answers from mark scheme
    const extractedAnswers = await extractAnswersWithAI(extractedText);
    console.log(`Extracted ${extractedAnswers.length} answers from mark scheme`);
    
    // Match answers to questions
    const { matched, unmatched } = matchAnswersToQuestions(extractedAnswers, existingQuestions);
    console.log(`Matched ${matched.length} answers, ${unmatched.length} unmatched`);
    
    // Auto-apply if requested
    let appliedCount = 0;
    if (autoApply && matched.length > 0) {
      for (const match of matched) {
        const { error: updateError } = await supabase
          .from('paper_questions')
          .update({ mark_scheme: match.new_mark_scheme })
          .eq('id', match.question_id);
        
        if (updateError) {
          console.error(`Failed to update question ${match.question_id}:`, updateError);
        } else {
          appliedCount++;
        }
      }
      console.log(`Applied ${appliedCount} mark schemes to questions`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total_extracted: extractedAnswers.length,
        matched_count: matched.length,
        unmatched_count: unmatched.length,
        applied_count: appliedCount,
        matched: matched,
        unmatched: unmatched
      }
    });
    
  } catch (error: any) {
    console.error('Mark scheme extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract mark scheme' },
      { status: 500 }
    );
  }
}

// GET endpoint to check extraction status or fetch mark scheme URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paperId } = await params;
    
    // Fetch paper with mark scheme URL
    const { data: paper, error: paperError } = await supabase
      .from('past_papers')
      .select('id, title, mark_scheme_url')
      .eq('id', paperId)
      .single();
    
    if (paperError || !paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }
    
    // Fetch questions with mark scheme status
    const { data: questions, error: questionsError } = await supabase
      .from('paper_questions')
      .select('id, question_number, part_label, mark_scheme')
      .eq('paper_id', paperId)
      .order('display_order');
    
    if (questionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }
    
    const withMarkScheme = questions?.filter(q => q.mark_scheme) || [];
    const withoutMarkScheme = questions?.filter(q => !q.mark_scheme) || [];
    
    return NextResponse.json({
      paper_id: paperId,
      paper_title: paper.title,
      mark_scheme_url: paper.mark_scheme_url,
      total_questions: questions?.length || 0,
      with_mark_scheme: withMarkScheme.length,
      without_mark_scheme: withoutMarkScheme.length,
      questions_needing_answers: withoutMarkScheme.map(q => ({
        id: q.id,
        question_number: q.question_number,
        part_label: q.part_label
      }))
    });
    
  } catch (error: any) {
    console.error('Error fetching mark scheme status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
