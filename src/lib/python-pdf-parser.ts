/**
 * Python PDF Parser Integration
 * Calls the Python Flask API for enhanced PDF extraction
 */

interface PythonParserResponse {
  success: boolean;
  data?: {
    raw_text: string;
    cleaned_text: string;
    answer_lines: Array<{
      page: number;
      y_position: number;
      length: number;
      preceding_text: string;
    }>;
    mcq_tables: Array<{
      page: number;
      options: Array<{ label: string; text: string }>;
      question_number: number | null;
    }>;
    page_count: number;
    metadata: {
      answer_line_count: number;
      mcq_table_count: number;
      has_structure_detection: boolean;
      extraction_method: string;
    };
  };
  error?: string;
}

/**
 * Configuration for Python parser API
 */
const PYTHON_API_URL = process.env.PYTHON_PARSER_URL || 'http://localhost:5000';
const PYTHON_API_TIMEOUT = 30000; // 30 seconds

/**
 * Check if Python parser API is available
 */
export async function isPythonParserAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${PYTHON_API_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Python parser not available:', error);
    return false;
  }
}

/**
 * Parse PDF using Python API
 */
export async function parsePdfWithPython(file: File): Promise<PythonParserResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PYTHON_API_TIMEOUT);

  try {
    const response = await fetch(`${PYTHON_API_URL}/parse-pdf`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result: PythonParserResponse = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Python parser failed');
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Python parser timeout - file may be too large');
    }
    
    throw error;
  }
}

/**
 * Clean already extracted text using Python API (fallback)
 */
export async function cleanTextWithPython(text: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${PYTHON_API_URL}/parse-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result: PythonParserResponse = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Text cleaning failed');
    }

    return result.data?.cleaned_text || text;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Python text cleaning failed, using original text:', error);
    return text; // Fallback to original text
  }
}

/**
 * Enhanced PDF extraction with Python pre-processing
 * Falls back to TypeScript-only extraction if Python unavailable
 */
export async function extractPdfText(file: File): Promise<{
  text: string;
  metadata?: {
    method: 'python' | 'typescript';
    answerLineCount?: number;
    mcqTableCount?: number;
    pageCount?: number;
  };
}> {
  // Check if Python parser is available
  const pythonAvailable = await isPythonParserAvailable();

  if (pythonAvailable) {
    try {
      console.log('Using Python parser for enhanced extraction...');
      const result = await parsePdfWithPython(file);

      if (result.success && result.data) {
        return {
          text: result.data.cleaned_text,
          metadata: {
            method: 'python',
            answerLineCount: result.data.metadata.answer_line_count,
            mcqTableCount: result.data.metadata.mcq_table_count,
            pageCount: result.data.page_count,
          },
        };
      }
    } catch (error) {
      console.warn('Python parser failed, falling back to TypeScript:', error);
    }
  }

  // Fallback: Use browser-based PDF.js extraction (existing method)
  console.log('Using TypeScript/browser extraction...');
  
  // This would call your existing client-side PDF extraction
  // For now, return empty - you'll integrate with existing extraction
  return {
    text: '',
    metadata: {
      method: 'typescript',
    },
  };
}
