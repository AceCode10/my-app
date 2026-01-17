import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { 
  extractQuestionsFromImages, 
  shouldUseVisionExtraction,
  type QuestionImage,
  type ExtractedVisualQuestion
} from '@/lib/pdf-vision-extractor';
import {
  selfAnnealingValidateAndFix,
  calculateDisplayOrder as calcDisplayOrder,
  detectExamBoard,
  analyzeSourceText,
  validateAgainstSource,
  type ExtractedQuestion,
  type ValidationResult,
  type SourceAnalysis
} from '@/lib/extraction-workflow/execution/question-validator';
import {
  extractQuestions as multiLayerExtract,
  extractSourceMarkers,
  parseQuestionBlocks,
  validateExtraction,
  applyConfidenceGate,
  type ExtractionReport
} from '@/lib/extraction-workflow/extraction-engine';
import { buildAccurateExtractionPrompt } from '@/lib/extraction-workflow/prompts/question-extraction-prompt';
import { runStepByStepExtraction, type StepByStepResult } from '@/lib/extraction-workflow/step-by-step-extractor';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// TEXT SANITIZATION & VALIDATION
// ============================================

/**
 * Sanitize and clean input text from PDF
 * - Removes excessive whitespace
 * - Normalizes line breaks
 * - Removes control characters
 * - Preserves mathematical notation
 */
function sanitizeInputText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove null bytes and control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize different types of line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (more than 2 consecutive)
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove excessive spaces (more than 2 consecutive)
    .replace(/ {3,}/g, '  ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Clean and format question text for display
 * - Preserves mathematical notation
 * - Normalizes spacing
 * - Removes PDF artifacts
 */
function cleanQuestionText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove common PDF extraction artifacts
    .replace(/\[?\d+\s*marks?\]?$/gi, '') // Remove trailing marks notation
    .replace(/^\s*\(?[a-z]\)\s*/i, '') // Remove leading part labels like (a)
    .replace(/^\s*\d+\.\s*/, '') // Remove leading question numbers
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Normalize dashes
    .replace(/[–—]/g, '-')
    // Clean up spacing
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate question data before insertion
 */
function validateQuestion(q: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!q.question_text || typeof q.question_text !== 'string') {
    errors.push('Missing or invalid question_text');
  } else if (q.question_text.trim().length < 5) {
    errors.push('Question text too short (minimum 5 characters)');
  } else if (q.question_text.length > 10000) {
    errors.push('Question text too long (maximum 10000 characters)');
  }
  
  if (q.marks !== undefined && q.marks !== null) {
    const marks = parseInt(q.marks);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      errors.push('Invalid marks value (must be 0-100)');
    }
  }
  
  if (q.question_type === 'mcq') {
    if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
      errors.push('MCQ must have at least 2 options');
    } else {
      const hasCorrect = q.options.some((opt: any) => opt.is_correct);
      if (!hasCorrect) {
        // Don't error, just note - correct answer may not be in question paper
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Question type normalization
function normalizeQuestionType(qtype: string): string {
  const typeMap: Record<string, string> = {
    'multiple_choice': 'mcq',
    'multiplechoice': 'mcq',
    'multiple-choice': 'mcq',
    'mc': 'mcq',
    'numeric': 'calculation',
    'number': 'calculation',
    'calc': 'calculation',
    'math': 'calculation',
    'long_answer': 'essay',
    'extended': 'essay',
    'extended_response': 'essay',
    'free_response': 'essay',
    'tf': 'true_false',
    'truefalse': 'true_false',
    'true-false': 'true_false',
    'struct': 'structured',
    'text': 'short_answer',
  };

  const normalized = (qtype || '').toLowerCase().trim();
  if (typeMap[normalized]) return typeMap[normalized];

  const validTypes = ['mcq', 'short_answer', 'essay', 'calculation', 'true_false', 'structured'];
  return validTypes.includes(normalized) ? normalized : 'short_answer';
}

/**
 * Calculate display order from part label for consistent sorting
 * Returns integers only for database compatibility
 * Examples: "a" -> 100, "b" -> 200, "a(i)" -> 110, "a(ii)" -> 120, "b(i)" -> 210
 */
function calculateDisplayOrder(partLabel: string): number {
  if (!partLabel) return 0;
  
  const parts = partLabel.toLowerCase().replace(/[()]/g, ' ').trim().split(/\s+/);
  let order = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    let value = 0;
    
    // Convert letter to number: a=1, b=2, etc.
    if (/^[a-z]$/.test(part)) {
      value = part.charCodeAt(0) - 96; // 'a' = 97, so 'a' -> 1
    }
    // Convert roman numerals: i=1, ii=2, iii=3, iv=4, v=5
    else if (/^i+v?$/.test(part)) {
      const romanMap: Record<string, number> = {
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
        'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10
      };
      value = romanMap[part] || 0;
    }
    // Already a number
    else if (!isNaN(parseInt(part))) {
      value = parseInt(part);
    }
    
    // Build hierarchical order using integer math: 
    // First level: a=100, b=200, c=300
    // Second level: a(i)=110, a(ii)=120, b(i)=210
    // Third level: a(i)(A)=111, a(i)(B)=112
    if (i === 0) {
      order = value * 100; // Base level (hundreds)
    } else if (i === 1) {
      order += value * 10; // Second level (tens)
    } else {
      order += value; // Third level (ones)
    }
  }
  
  return order;
}

// ============================================
// OPTIMIZED AI EXTRACTION FOR GPT-3.5 TURBO
// ============================================

/**
 * Pre-process text - minimal cleanup, let GPT handle structure detection
 * Python parser already adds [ANSWER_LINE] and [MARKS:X] markers
 */
function preprocessExamText(text: string): string {
  return text
    // Handle any remaining dotted lines not caught by Python parser
    .replace(/\.{6,}/g, '[ANSWER_LINE]')
    .replace(/_{6,}/g, '[ANSWER_LINE]')
    
    // Clean up multiple consecutive answer line markers
    .replace(/(\[ANSWER_LINE\]\s*)+/g, '[ANSWER_LINE] ')
    
    // Remove common PDF artifacts
    .replace(/DO NOT WRITE IN THIS MARGIN/gi, '')
    .replace(/\[Turn over\]/gi, '')
    .replace(/Turn over/gi, '')
    
    // Remove barcode/encoding artifacts
    .replace(/[ĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ]{3,}/g, '')
    .replace(/[Ġ´íÈõÏĪÅĊÝú¸þ×ĥąåÕµõąõĕµåąąµÅÕµÕ]{3,}/g, '')
    
    // Clean up excessive whitespace
    .replace(/\n{4,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Build optimized prompt for GPT - uses the accurate extraction prompt
 * Focus: Extract questions EXACTLY as they appear in the source
 */
function buildExtractionPrompt(): string {
  return buildAccurateExtractionPrompt();
}

/**
 * Post-process AI output to fix common errors
 */
function postProcessQuestions(questions: any[]): any[] {
  return questions.map((q, idx) => {
    // Ensure question_number is integer
    let qNum = parseInt(q.question_number);
    if (isNaN(qNum) || qNum < 1) qNum = idx + 1;

    // Clean part_label
    let partLabel = q.part_label;
    if (partLabel) {
      partLabel = String(partLabel).toLowerCase().trim();
      // Remove parentheses if present
      partLabel = partLabel.replace(/^\(|\)$/g, '');
      if (partLabel === '' || partLabel === 'null') partLabel = null;
    } else {
      partLabel = null;
    }

    // Determine needs_answer based on marks if not provided
    let needsAnswer = q.needs_answer;
    const marks = parseInt(q.marks) || 0;
    if (needsAnswer === undefined || needsAnswer === null) {
      // If marks > 0, likely needs answer
      needsAnswer = marks > 0;
    }
    // Context parts (no part_label, marks=0) don't need answers
    if (!partLabel && marks === 0) {
      needsAnswer = false;
    }

    // Clean question text
    let questionText = String(q.question_text || '').trim();
    
    // Remove Q prefix if present (e.g., "Q2: Text" -> "Text")
    questionText = questionText.replace(/^Q\d+:\s*/i, '');
    
    // Remove [ANSWER_LINE] and [MARKS:X] markers
    questionText = questionText.replace(/\[ANSWER_LINE\]/g, '').replace(/\[MARKS:\d+\]/g, '').trim();
    
    // Remove leading part labels ONLY if they are clearly part labels (letter in parentheses with space)
    // e.g., "(a) Explain..." -> "Explain...", but "Explain..." stays as "Explain..."
    questionText = questionText.replace(/^\([a-z]\)\s+/i, '');
    // Remove roman numeral labels in parentheses: "(i) ", "(ii) ", etc.
    questionText = questionText.replace(/^\((i{1,3}|iv|v|vi{0,3}|ix|x)\)\s+/i, '');

    // Determine question type
    let qType = normalizeQuestionType(q.question_type || 'short_answer');
    
    // Auto-correct question type based on content
    const textLower = questionText.toLowerCase();
    if (textLower.includes('circle') || textLower.includes('select') || textLower.includes('tick')) {
      if (q.options && Array.isArray(q.options) && q.options.length >= 2) {
        qType = 'mcq';
      }
    }
    
    // If has marks but wrong type, fix it
    if (marks > 0 && needsAnswer && qType === 'structured') {
      qType = marks <= 2 ? 'short_answer' : 'essay';
    }

    // Process MCQ options
    let options = null;
    if (qType === 'mcq' && q.options && Array.isArray(q.options)) {
      options = q.options
        .filter((opt: any) => opt && (opt.text || opt.label))
        .map((opt: any, i: number) => ({
          label: String(opt.label || String.fromCharCode(65 + i)).toUpperCase(),
          text: String(opt.text || opt.option || opt.label || '').trim(),
          is_correct: false
        }));
      if (options.length < 2) {
        options = null;
        qType = 'short_answer';
      }
    }

    return {
      question_number: qNum,
      part_label: partLabel,
      question_text: questionText,
      question_type: qType,
      marks: needsAnswer ? (marks || 1) : 0,
      needs_answer: Boolean(needsAnswer),
      options: options,
      // Preserve other fields
      correct_answer: q.correct_answer || null,
      mark_scheme: q.mark_scheme || null,
      difficulty: q.difficulty || null
    };
  }).filter(q => q.question_text && q.question_text.length >= 3);
}

/**
 * Validate extracted questions for completeness and structure
 */
function validateQuestions(questions: any[]): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const questionNumbers = new Set<number>();
  
  // Group by question number
  const grouped = new Map<number, any[]>();
  questions.forEach(q => {
    questionNumbers.add(q.question_number);
    if (!grouped.has(q.question_number)) {
      grouped.set(q.question_number, []);
    }
    grouped.get(q.question_number)!.push(q);
  });
  
  // Check each question group
  grouped.forEach((parts, qNum) => {
    const answerableParts = parts.filter(p => p.needs_answer);
    const contextParts = parts.filter(p => !p.needs_answer);
    
    // Warn if question has no answerable parts
    if (answerableParts.length === 0) {
      warnings.push(`Q${qNum}: No answerable parts found (all context)`);
    }
    
    // Warn if answerable parts have no marks
    answerableParts.forEach(p => {
      if (p.marks === 0) {
        warnings.push(`Q${qNum}${p.part_label ? `(${p.part_label})` : ''}: Answerable part has 0 marks`);
      }
    });
    
    // Check for missing part sequences (e.g., has (a) and (c) but no (b))
    const partLabels = parts.filter(p => p.part_label).map(p => p.part_label);
    if (partLabels.length > 1) {
      const letters = partLabels.filter(l => /^[a-z]$/.test(l)).sort();
      for (let i = 1; i < letters.length; i++) {
        const expected = String.fromCharCode(letters[0].charCodeAt(0) + i);
        if (letters[i] !== expected) {
          warnings.push(`Q${qNum}: Part sequence gap - has (${letters[i-1]}) and (${letters[i]}), missing (${expected})?`);
        }
      }
    }
  });
  
  return {
    valid: questions.length > 0,
    warnings
  };
}

/**
 * Extract questions using OpenAI GPT-3.5 Turbo
 */
async function extractQuestionsWithAI(text: string): Promise<any[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set. Please add it to your .env file.');
  }

  const openai = new OpenAI({ apiKey });

  // Pre-process text to help AI
  const processedText = preprocessExamText(sanitizeInputText(text));
  const systemPrompt = buildExtractionPrompt();

  console.log('Pre-processed text sample:', processedText.slice(0, 500));

  // Determine which model to use based on text length
  const MAX_GPT35_LENGTH = 30000; // ~7500 tokens
  const MAX_GPT4_LENGTH = 100000; // ~25000 tokens
  
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

  // Use appropriate model for better JSON handling
  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Extract questions from this exam paper:\n\n${textToProcess}` 
      }
    ],
    temperature: 0.05, // Lower temperature for more consistent output
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  });

  const responseText = response.choices[0].message.content?.trim() || '{}';
  
  try {
    const data = JSON.parse(responseText);
    const rawQuestions = data.questions || data.data || [];
    
    // Post-process to fix common AI errors
    const processedQuestions = postProcessQuestions(rawQuestions);
    
    // Validate structure
    const validation = validateQuestions(processedQuestions);
    if (validation.warnings.length > 0) {
      console.warn('Question extraction warnings:', validation.warnings);
    }
    
    return processedQuestions;
  } catch (parseError) {
    console.error('Failed to parse AI response:', responseText.slice(0, 500));
    throw new Error('AI returned invalid JSON. Please try again.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paperId } = await params;
    const formData = await request.formData();
    
    // Get the PDF file or text content
    const pdfFile = formData.get('pdf') as File | null;
    const textContent = formData.get('text') as string | null;
    const replaceExisting = formData.get('replace') === 'true';
    const usePythonParser = formData.get('usePython') === 'true';
    const useVisionExtraction = formData.get('useVision') === 'true'; // Explicit vision mode
    const clientPageImages = formData.get('pageImages') as string | null; // Client-side converted images
    
    let extractedText = '';
    let extractionMetadata: any = {};
    let shouldUseVision = useVisionExtraction;
    let clientImages: any[] = [];
    
    // Parse client-side converted images if provided
    if (clientPageImages) {
      try {
        clientImages = JSON.parse(clientPageImages);
        console.log(`Received ${clientImages.length} client-side converted page images`);
      } catch (e) {
        console.warn('Failed to parse client page images:', e);
      }
    }
    
    // Try Python parser if available and requested
    if (pdfFile && usePythonParser) {
      try {
        const pythonUrl = process.env.PYTHON_PARSER_URL || 'http://localhost:5001';
        console.log('Attempting Python parser at:', pythonUrl);
        
        const pythonFormData = new FormData();
        pythonFormData.append('file', pdfFile);
        
        const pythonResponse = await fetch(`${pythonUrl}/parse-pdf`, {
          method: 'POST',
          body: pythonFormData,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        if (pythonResponse.ok) {
          const pythonResult = await pythonResponse.json();
          console.log('Python parser response:', {
            success: pythonResult.success,
            hasData: !!pythonResult.data,
            hasCleanedText: !!pythonResult.data?.cleaned_text,
            textLength: pythonResult.data?.cleaned_text?.length || 0
          });
          
          if (pythonResult.success && pythonResult.data && pythonResult.data.cleaned_text) {
            extractedText = pythonResult.data.cleaned_text;
            extractionMetadata = {
              method: 'python',
              answerLineCount: pythonResult.data.metadata?.answer_line_count || 0,
              mcqTableCount: pythonResult.data.metadata?.mcq_table_count || 0,
              pageCount: pythonResult.data.page_count || 0,
              textLength: extractedText.length,
            };
            console.log('Python parser succeeded:', extractionMetadata);
          } else {
            console.warn('Python parser returned success but no text:', JSON.stringify(pythonResult).substring(0, 500));
          }
        } else {
          const errorText = await pythonResponse.text();
          console.warn('Python parser HTTP error:', pythonResponse.status, errorText.substring(0, 500));
        }
      } catch (pythonError) {
        console.warn('Python parser failed, falling back to text content:', pythonError);
      }
    }
    
    // Fallback to text content if Python parser didn't work
    if (!extractedText && textContent) {
      extractedText = textContent;
      extractionMetadata.method = 'client';
    }
    
    // Auto-detect if vision extraction should be used
    if (!shouldUseVision && extractedText && shouldUseVisionExtraction(extractedText)) {
      console.log('Auto-detected need for vision extraction based on text analysis');
      shouldUseVision = true;
    }
    
    let rawQuestions: any[] = [];
    
    // VISION EXTRACTION PATH - for papers with images/diagrams
    if (shouldUseVision && (pdfFile || clientImages.length > 0)) {
      console.log('Using GPT-4 Vision extraction for image-heavy paper...');
      
      try {
        let pageImages: any[] = [];
        
        // Use client-side converted images if available (preferred - no server dependencies)
        if (clientImages.length > 0) {
          console.log(`Using ${clientImages.length} client-side converted images`);
          pageImages = clientImages;
        } else if (pdfFile) {
          // Try Python service as fallback
          const pythonUrl = process.env.PYTHON_PARSER_URL || 'http://localhost:5001';
          const imageFormData = new FormData();
          imageFormData.append('file', pdfFile);
          imageFormData.append('dpi', '150'); // Good quality for vision
          
          const imageResponse = await fetch(`${pythonUrl}/pdf-to-images`, {
            method: 'POST',
            body: imageFormData,
            signal: AbortSignal.timeout(90000), // 90 second timeout for image conversion
          });
          
          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            if (imageResult.success && imageResult.images && imageResult.images.length > 0) {
              pageImages = imageResult.images;
              console.log(`Python service converted ${pageImages.length} pages`);
            }
          }
        }
        
        if (pageImages.length === 0) {
          throw new Error('No images available for vision extraction. Client-side conversion may have failed.');
        }
        
        console.log(`Processing ${pageImages.length} page images with GPT-4 Vision`);
        
        // Extract questions using GPT-4 Vision
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not configured');
        }
        
        const visionQuestions = await extractQuestionsFromImages(pageImages, apiKey);
        rawQuestions = visionQuestions;
        extractionMetadata.method = 'gpt4-vision';
        extractionMetadata.pageCount = pageImages.length;
        
        console.log(`Vision extraction completed: ${rawQuestions.length} questions`);
        
      } catch (visionError: any) {
        console.error('Vision extraction failed:', visionError);
        
        // Fall back to text extraction if we have text
        if (extractedText && extractedText.trim()) {
          console.log('Falling back to text-based extraction...');
          shouldUseVision = false;
        } else {
          return NextResponse.json(
            { 
              error: `Vision extraction failed: ${visionError.message}. Please ensure the PDF is valid and try again.`,
              details: visionError.message
            },
            { status: 500 }
          );
        }
      }
    }
    
    // TEXT EXTRACTION PATH - for text-only papers or fallback
    if (!shouldUseVision) {
      if (!extractedText || !extractedText.trim()) {
        // If we have a PDF but no text, the PDF might be image-based
        // Suggest using vision extraction
        if (pdfFile) {
          return NextResponse.json(
            { 
              error: 'No text could be extracted from this PDF. This appears to be an image-based or scanned PDF. Please enable "Use GPT-4 Vision" option to extract questions from image-based papers.',
              suggestion: 'vision'
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'No text content provided. Please upload a PDF file or paste text content.' },
          { status: 400 }
        );
      }
      
      // Check if extracted text is meaningful (not just artifacts)
      const cleanedText = extractedText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      if (cleanedText.length < 50) {
        // Text is too short to be meaningful, likely image-based
        if (pdfFile) {
          return NextResponse.json(
            { 
              error: 'Extracted text appears to be only artifacts or headers (less than 50 characters). This PDF may be image-based or scanned. Please enable "Use GPT-4 Vision" option to extract questions from image-based papers.',
              suggestion: 'vision',
              details: `Extracted: ${cleanedText.substring(0, 100)}${cleanedText.length > 100 ? '...' : ''}`
            },
            { status: 400 }
          );
        }
      }

      // ============================================
      // STEP-BY-STEP EXTRACTION SYSTEM
      // ============================================
      // Step 1: Extract question numbers first
      // Step 2: Find sub-parts and attach to questions
      // Step 3: Extract question text for each
      // Step 4: Extract marks
      // Step 5: Determine question types
      // Fallback: AI extraction if step-by-step fails
      
      console.log('[StepByStep] Starting step-by-step extraction...');
      
      // Try step-by-step extraction first
      const stepByStepResult = runStepByStepExtraction(extractedText);
      
      console.log(`[StepByStep] Result: ${stepByStepResult.questions.length} questions, ${stepByStepResult.totalMarks} marks, ${(stepByStepResult.confidence * 100).toFixed(1)}% confidence`);
      
      // Log each step's result
      for (const step of stepByStepResult.steps) {
        console.log(`[StepByStep] Step ${step.step} (${step.name}): ${step.success ? 'SUCCESS' : 'FAILED'}`, step.output);
      }
      
      // Check for question number diversity - if all questions have same number, extraction failed
      const uniqueQuestionNumbers = new Set(stepByStepResult.questions.map(q => q.questionNumber));
      const hasQuestionDiversity = uniqueQuestionNumbers.size >= 3; // At least 3 different question numbers
      
      console.log(`[StepByStep] Question number diversity: ${uniqueQuestionNumbers.size} unique numbers (need >= 3)`);
      
      // Use step-by-step results if confidence is good AND we have diverse question numbers
      if (stepByStepResult.questions.length >= 10 && stepByStepResult.confidence >= 0.5 && hasQuestionDiversity) {
        rawQuestions = stepByStepResult.questions.map(q => ({
          question_number: q.questionNumber,
          part_label: q.partLabel ? (q.subPartLabel ? `${q.partLabel}(${q.subPartLabel})` : q.partLabel) : null,
          question_text: q.questionText,
          question_type: q.questionType,
          marks: q.marks,
          needs_answer: true,
          options: null,
          display_order: q.displayOrder,
          confidence: stepByStepResult.confidence
        }));
        extractionMetadata.extractionMethod = 'step-by-step';
        console.log(`[StepByStep] Using step-by-step extraction results`);
      } else {
        // Fallback to AI extraction
        console.log('[StepByStep] Step-by-step confidence too low, falling back to AI...');
        console.log('[AI] Using AI-based extraction...');
        rawQuestions = await extractQuestionsWithAI(extractedText);
        extractionMetadata.extractionMethod = 'ai-gpt';
      }
    }
    
    if (!rawQuestions || rawQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No questions extracted from the provided content' },
        { status: 400 }
      );
    }

    console.log(`[Extraction] Total questions extracted: ${rawQuestions.length}`);

    // ============================================
    // LAYER 3: SOURCE TEXT ANALYSIS (v3 - Cambridge ICT detection)
    // ============================================
    // Analyze the source text to determine what questions SHOULD exist
    console.log('[Layer 3] Analyzing source text for ground truth... (v3)');
    console.log('[Layer 3] Text sample:', extractedText.substring(0, 100));
    const sourceAnalysis = analyzeSourceText(extractedText);
    console.log(`[Layer 3] Source analysis: ${sourceAnalysis.expectedQuestionNumbers.length} questions expected (1-${sourceAnalysis.expectedMaxQuestion}), ${sourceAnalysis.expectedTotalMarks} total marks`);

    // ============================================
    // LAYER 4: VALIDATION & AUTO-FIX
    // ============================================
    // Apply multi-layered validation to detect and fix errors
    console.log('[Layer 4] Running validation on extracted questions...');
    
    const mappedQuestions = rawQuestions.map((q: any) => ({
      question_number: parseInt(q.question_number) || 1,
      part_label: q.part_label || null,
      question_text: q.question_text || q.question || q.stem || '',
      question_type: q.question_type || 'short_answer',
      marks: parseInt(q.marks) || 0,
      needs_answer: q.needs_answer !== false,
      options: q.options || null,
      correct_answer: q.correct_answer || null,
      mark_scheme: q.mark_scheme || null,
      difficulty: q.difficulty || null,
    }));
    
    // Validate against source text first
    const sourceValidation = validateAgainstSource(mappedQuestions, sourceAnalysis);
    console.log(`[Layer 4] Source validation: ${sourceValidation.valid ? 'PASSED' : 'FAILED'} (${(sourceValidation.confidence * 100).toFixed(1)}% confidence)`);
    
    if (sourceValidation.errors.length > 0) {
      console.log('[Layer 4] Source validation errors:', sourceValidation.errors.map(e => e.message));
    }
    if (sourceValidation.warnings.length > 0) {
      console.log('[Layer 4] Source validation warnings:', sourceValidation.warnings);
    }
    
    const selfAnnealingResult = selfAnnealingValidateAndFix(mappedQuestions);

    // Use the fixed questions from self-annealing
    if (selfAnnealingResult.wasFixed) {
      console.log(`[Self-Annealing] Applied ${selfAnnealingResult.validation.fixes_applied.length} fixes`);
      // Merge the fixed data back into rawQuestions
      rawQuestions = rawQuestions.map((q: any, idx: number) => {
        const fixed = selfAnnealingResult.questions[idx];
        if (fixed) {
          return {
            ...q,
            question_number: fixed.question_number,
            part_label: fixed.part_label,
            display_order: fixed.display_order,
          };
        }
        return q;
      });
    }
    
    // Combine confidence from both validations
    const combinedConfidence = Math.min(
      selfAnnealingResult.validation.confidence,
      sourceValidation.confidence
    );
    
    // Log validation summary
    const allWarnings = [
      ...selfAnnealingResult.validation.warnings,
      ...sourceValidation.warnings
    ];
    if (allWarnings.length > 0) {
      console.log('[Validation] All warnings:', allWarnings);
    }
    console.log(`[Validation] Combined confidence: ${(combinedConfidence * 100).toFixed(1)}%`);

    // If replace is requested, delete existing questions
    if (replaceExisting) {
      await supabase
        .from('paper_questions')
        .delete()
        .eq('paper_id', paperId);
    }

    // Get the starting question number
    const { data: existingQuestions } = await supabase
      .from('paper_questions')
      .select('question_number')
      .eq('paper_id', paperId)
      .order('question_number', { ascending: false })
      .limit(1);

    const startingNumber = existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].question_number + 1
      : 1;

    // Transform, validate, and clean questions
    const validationErrors: string[] = [];
    const questionsToInsert = rawQuestions.map((q: any, index: number) => {
      // Extract question text from various possible field names
      let questionText = q.question_text || q.question || q.stem || q.text || '';
      
      // Clean and sanitize the question text
      questionText = cleanQuestionText(questionText);
      
      if (!questionText.trim()) {
        validationErrors.push(`Question ${index + 1}: Empty question text`);
        return null;
      }
      
      if (questionText.length < 5) {
        validationErrors.push(`Question ${index + 1}: Question text too short`);
        return null;
      }

      // Normalize question type
      let questionType = normalizeQuestionType(q.question_type || q.type || 'short_answer');
      
      // Determine if this part needs an answer (has answer lines in paper)
      // Default to true for backward compatibility, but AI should provide this
      const needsAnswer = q.needs_answer !== false;
      
      // Parse and validate marks - only answerable parts should have marks > 0
      let marks = needsAnswer ? (parseInt(q.marks) || 0) : 0;
      
      // If no explicit marks but has answer_line_count, estimate marks
      if (marks === 0 && needsAnswer && q.answer_line_count) {
        const lineCount = parseInt(q.answer_line_count);
        if (lineCount > 0) {
          marks = lineCount; // 1 mark per answer line as default estimate
        }
      }
      
      if (marks < 0) marks = 0;
      if (marks > 100) marks = 100;

      // Validate difficulty
      let difficulty = q.difficulty || null;
      if (difficulty) {
        difficulty = difficulty.toLowerCase().trim();
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
          // Auto-assign based on marks
          difficulty = marks <= 2 ? 'easy' : marks <= 5 ? 'medium' : 'hard';
        }
      }

      // Process MCQ options with validation
      let options = null;
      if (questionType === 'mcq' && q.options && Array.isArray(q.options)) {
        options = q.options
          .filter((opt: any) => opt && (opt.text || opt.option)) // Filter empty options
          .map((opt: any, optIdx: number) => ({
            label: (opt.label || String.fromCharCode(65 + optIdx)).toUpperCase().trim(),
            text: (opt.text || opt.option || '').trim(),
            is_correct: Boolean(opt.is_correct || opt.correct || false)
          }));
        
        // Ensure we have at least 2 options for MCQ
        if (options.length < 2) {
          validationErrors.push(`Question ${index + 1}: MCQ has fewer than 2 options`);
          options = null;
          questionType = 'short_answer'; // Fallback to short answer
        }
      }

      // Clean section name
      let sectionName = q.section_name || q.section || null;
      if (sectionName) {
        sectionName = sectionName.trim();
      }

      // Clean part label
      let partLabel = q.part_label || q.part || null;
      if (partLabel) {
        partLabel = partLabel.toLowerCase().trim();
      }

      // Clean correct answer
      let correctAnswer = q.correct_answer || q.answer || q.model_answer || null;
      if (correctAnswer && typeof correctAnswer === 'string') {
        correctAnswer = correctAnswer.trim();
      }

      // Clean mark scheme
      let markScheme = q.mark_scheme || q.marking_scheme || null;
      if (markScheme && typeof markScheme === 'string') {
        markScheme = markScheme.trim();
      }

      // Process sub_inputs for multiple answer fields
      let subInputs = null;
      if (q.sub_inputs && Array.isArray(q.sub_inputs) && q.sub_inputs.length > 0) {
        subInputs = q.sub_inputs.map((label: string) => String(label).trim()).filter(Boolean);
      }

      // Calculate display order based on question number and part label
      // Format: question_number * 10000 + part_order
      // Examples: Q1 = 10000, Q1(a) = 10100, Q1(a)(i) = 10110, Q2 = 20000
      const questionNumber = parseInt(q.question_number) || (index + 1);
      let displayOrder = questionNumber * 10000;
      
      if (partLabel) {
        // Add part label ordering
        displayOrder += calculateDisplayOrder(partLabel);
      }

      return {
        paper_id: paperId,
        question_number: parseInt(q.question_number) || startingNumber + index,
        section_name: sectionName,
        part_label: partLabel,
        question_text: questionText,
        question_type: questionType,
        marks: marks,
        needs_answer: needsAnswer,
        correct_answer: correctAnswer,
        mark_scheme: markScheme,
        examiner_tips: q.examiner_tips || q.examiner_comment || null,
        options: options,
        sub_inputs: subInputs,
        difficulty: difficulty,
        image_url: q.image_url || null,
        display_order: displayOrder,
        // Vision extraction fields
        has_image: q.has_image || false,
        question_image_data: q.question_image_data || null,
        image_metadata: q.image_metadata || null,
        table_data: q.table_data || null,
        // parent_question_id will be set in a second pass after insertion
      };
    }).filter(Boolean);
    
    // Log validation warnings (non-blocking)
    if (validationErrors.length > 0) {
      console.warn('Validation warnings:', validationErrors);
    }

    if (questionsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions to insert' },
        { status: 400 }
      );
    }

    // Insert questions
    const { data: insertedData, error: insertError } = await supabase
      .from('paper_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to insert questions: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const questionTypes = questionsToInsert.reduce((acc: Record<string, number>, q: any) => {
      acc[q.question_type] = (acc[q.question_type] || 0) + 1;
      return acc;
    }, {});
    
    const totalMarks = questionsToInsert.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Successfully extracted and imported ${insertedData?.length || 0} questions`,
      count: insertedData?.length || 0,
      totalMarks,
      questionTypes,
      extractionMethod: extractionMetadata.method || 'unknown',
      hasImages: questionsToInsert.some((q: any) => q.has_image),
      imageCount: questionsToInsert.filter((q: any) => q.has_image).length,
      warnings: validationErrors.length > 0 ? validationErrors : undefined,
      // Validation metadata
      validation: {
        combinedConfidence: combinedConfidence,
        sourceAnalysis: {
          expectedQuestions: sourceAnalysis.expectedQuestionNumbers,
          expectedMaxQuestion: sourceAnalysis.expectedMaxQuestion,
          expectedTotalMarks: sourceAnalysis.expectedTotalMarks,
        },
        sourceValidation: {
          valid: sourceValidation.valid,
          confidence: sourceValidation.confidence,
          errors: sourceValidation.errors.map(e => e.message),
          warnings: sourceValidation.warnings,
        },
        selfAnnealing: {
          wasFixed: selfAnnealingResult.wasFixed,
          confidence: selfAnnealingResult.validation.confidence,
          fixesApplied: selfAnnealingResult.validation.fixes_applied.length,
          errors: selfAnnealingResult.validation.errors.map(e => e.message),
          warnings: selfAnnealingResult.validation.warnings,
        },
        examBoard: detectExamBoard(selfAnnealingResult.questions),
      },
      questions: questionsToInsert.map((q: any) => ({
        question_number: q.question_number,
        part_label: q.part_label,
        question_type: q.question_type,
        marks: q.marks,
        has_image: q.has_image || false,
        preview: q.question_text.slice(0, 100) + (q.question_text.length > 100 ? '...' : '')
      }))
    });

  } catch (error: any) {
    console.error('Error in extract-questions API:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'An error occurred during extraction';
    let statusCode = 500;
    
    if (errorMessage.includes('OPENAI_API_KEY')) {
      errorMessage = 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.';
      statusCode = 503;
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorMessage = 'OpenAI rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429;
    } else if (errorMessage.includes('invalid_api_key') || errorMessage.includes('401')) {
      errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
      statusCode = 401;
    } else if (errorMessage.includes('insufficient_quota')) {
      errorMessage = 'OpenAI API quota exceeded. Please check your billing settings.';
      statusCode = 402;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
