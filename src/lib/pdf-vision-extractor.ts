/**
 * PDF Vision Extractor
 * Extracts STRUCTURED question data from PDFs using GPT-4 Vision
 * 
 * NOTE: This extracts TEXT and STRUCTURE only.
 * Images/diagrams should be uploaded manually by admins for best results.
 * AI-based image cropping was removed due to unreliable bounding box detection.
 */

import OpenAI from 'openai';

export interface QuestionImage {
  page_number: number;
  base64_data: string;
  width: number;
  height: number;
  format: string;
}

export interface ExtractedVisualQuestion {
  question_number: number;
  part_label: string | null;
  question_text: string;
  question_type: string;
  marks: number;
  has_image: boolean; // Flag indicating if admin should upload an image
  needs_answer: boolean;
  options?: any[];
  table_data?: {
    headers: string[];
    rows: string[][];
  };
}

/**
 * Build GPT-4 Vision prompt for extracting STRUCTURED question data
 * Focus on clean text extraction with separate diagram detection for native HTML rendering
 */
export function buildVisionExtractionPrompt(): string {
  return `You are an expert at extracting IGCSE exam questions from PDF images. Extract STRUCTURED DATA that can be rendered as clean HTML - NOT screenshots.

## YOUR TASK
Extract each question as structured data with:
1. **Question text** - The actual question wording (clean text)
2. **MCQ options** - If multiple choice, extract A, B, C, D options separately
3. **Tables** - Extract as structured data (rows/columns)
4. **Diagram description** - Describe what the diagram shows (we'll extract the image separately)
5. **Marks** - Number of marks for the question

## OUTPUT FORMAT
{
  "questions": [
    {
      "question_number": 1,
      "part_label": null,
      "question_text": "The clean question text without the question number",
      "question_type": "mcq",
      "marks": 1,
      "has_diagram": true,
      "diagram_description": "A diagram showing a mouse/rodent illustration",
      "diagram_bounding_box": {
        "top_percent": 15,
        "bottom_percent": 45,
        "left_percent": 20,
        "right_percent": 80
      },
      "options": [
        { "label": "A", "text": "Mammal" },
        { "label": "B", "text": "musculus" },
        { "label": "C", "text": "Mus" },
        { "label": "D", "text": "Vertebrate" }
      ],
      "table_data": null
    },
    {
      "question_number": 7,
      "part_label": null,
      "question_text": "The table shows the concentration of gases in a blood vessel and in an alveolus. Which row shows the conditions that cause a substance produced in respiration in humans to diffuse from the blood vessel into the alveolus?",
      "question_type": "mcq",
      "marks": 1,
      "has_diagram": false,
      "diagram_description": null,
      "diagram_bounding_box": null,
      "options": [
        { "label": "A", "text": "carbon dioxide, low, high" },
        { "label": "B", "text": "carbon dioxide, high, low" },
        { "label": "C", "text": "oxygen, low, high" },
        { "label": "D", "text": "oxygen, high, low" }
      ],
      "table_data": {
        "headers": ["", "substance produced in respiration", "concentration in the blood vessel", "concentration in the alveolus"],
        "rows": [
          ["A", "carbon dioxide", "low", "high"],
          ["B", "carbon dioxide", "high", "low"],
          ["C", "oxygen", "low", "high"],
          ["D", "oxygen", "high", "low"]
        ]
      }
    }
  ]
}

## EXTRACTION RULES

### Question Text
- Extract the EXACT question wording
- Remove the question number prefix (e.g., "7" or "Q7")
- Keep scientific terms, formatting cues like **bold**
- For questions with context, include the full context

### MCQ Options
- Extract each option (A, B, C, D) separately
- Include the full text of each option
- For table-based MCQs, the option text can reference the table row

### Tables
- Extract tables as structured data with headers and rows
- This allows clean HTML table rendering
- Include ALL rows and columns

### Diagrams/Images
- Set has_diagram: true if there's a visual element
- Provide diagram_bounding_box as percentages (0-100) for cropping JUST the diagram
- The bounding box should ONLY include the diagram/image, NOT the question text
- Describe what the diagram shows

### Marks
- Look for [1], [2 marks], (1 mark), etc.
- Default to 1 if not specified for MCQ

## QUESTION TYPES
- "mcq" - Multiple choice with A, B, C, D options
- "short_answer" - Requires written answer (1-2 words/numbers)
- "structured" - Multi-part question with sub-questions
- "matching" - Match items from two columns
- "calculation" - Requires numerical calculation

Return ONLY valid JSON with the "questions" array.`;
}

/**
 * Extract questions from PDF page images using GPT-4 Vision
 * Focus: Structured data extraction for clean HTML rendering
 * 
 * NOTE: Images/diagrams are NOT extracted automatically.
 * Questions with has_image=true should have images uploaded manually by admins.
 */
export async function extractQuestionsFromImages(
  images: QuestionImage[],
  openaiApiKey: string
): Promise<ExtractedVisualQuestion[]> {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const allQuestions: ExtractedVisualQuestion[] = [];
  
  console.log(`Processing ${images.length} page images with GPT-4 Vision...`);
  
  for (const image of images) {
    try {
      console.log(`Processing page ${image.page_number}...`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: buildVisionExtractionPrompt()
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all questions from this exam paper page (page ${image.page_number}).

For each question, provide:
1. The complete question text (clean, without question number prefix)
2. MCQ options (A, B, C, D) if applicable
3. Table data if there's a table in the question
4. Diagram bounding box if there's an image/diagram (ONLY the diagram area, not the whole question)
5. Question type and marks

Extract structured data for clean HTML rendering.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/${image.format};base64,${image.base64_data}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      });
      
      const responseText = response.choices[0].message.content?.trim() || '{}';
      console.log(`GPT-4 Vision response for page ${image.page_number}:`, responseText.slice(0, 800));
      
      try {
        const data = JSON.parse(responseText);
        const pageQuestions = data.questions || [];
        
        console.log(`Found ${pageQuestions.length} questions on page ${image.page_number}`);
        
        // Process each question - extract structured text data only
        // Images should be uploaded manually by admins for best results
        for (const q of pageQuestions) {
          allQuestions.push({
            question_number: q.question_number,
            part_label: q.part_label || null,
            question_text: q.question_text || '',
            question_type: q.question_type || 'mcq',
            marks: q.marks || 1,
            has_image: q.has_diagram || false, // Flag for admin to upload image
            needs_answer: true,
            options: q.options || undefined,
            table_data: q.table_data || undefined
          });
        }
        
        console.log(`Extracted ${pageQuestions.length} questions from page ${image.page_number}`);
        
      } catch (parseError) {
        console.error(`Failed to parse GPT-4 Vision response for page ${image.page_number}:`, responseText.slice(0, 200));
        throw new Error(`Invalid JSON response from GPT-4 Vision for page ${image.page_number}`);
      }
      
    } catch (error: any) {
      console.error(`Error processing page ${image.page_number}:`, error);
      throw new Error(`Failed to process page ${image.page_number}: ${error.message}`);
    }
  }
  
  console.log(`Total questions extracted: ${allQuestions.length}`);
  return allQuestions;
}

/**
 * Detect if a PDF likely contains many images/diagrams
 * This is a heuristic based on text extraction results
 */
export function shouldUseVisionExtraction(extractedText: string): boolean {
  // Indicators that vision extraction might be better:
  // 1. Very short text (images weren't extracted)
  // 2. Many references to diagrams/figures
  // 3. Garbled text (poor OCR)
  
  const textLength = extractedText.trim().length;
  const diagramReferences = (extractedText.match(/diagram|figure|illustration|graph|chart|table/gi) || []).length;
  const garbledRatio = (extractedText.match(/[^\x00-\x7F]/g) || []).length / Math.max(textLength, 1);
  
  // Use vision if:
  // - Text is very short (< 500 chars) - likely images weren't extracted
  // - Many diagram references (> 5)
  // - High garbled character ratio (> 0.3)
  const shouldUseVision = textLength < 500 || diagramReferences > 5 || garbledRatio > 0.3;
  
  if (shouldUseVision) {
    console.log('Vision extraction recommended:', {
      textLength,
      diagramReferences,
      garbledRatio: garbledRatio.toFixed(2)
    });
  }
  
  return shouldUseVision;
}
