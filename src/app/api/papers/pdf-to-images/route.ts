import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * PDF to Images Conversion API
 * Converts PDF pages to base64-encoded images for GPT-4 Vision processing
 * 
 * This endpoint uses a Python service (pdf2image) for conversion
 * Falls back to client-side conversion if Python service unavailable
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File | null;
    const startPage = parseInt(formData.get('startPage') as string) || 1;
    const endPage = parseInt(formData.get('endPage') as string) || 0; // 0 = all pages
    const dpi = parseInt(formData.get('dpi') as string) || 150; // 150 DPI for good quality
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }
    
    // Try Python service first (best quality)
    const pythonUrl = process.env.PYTHON_PARSER_URL || 'http://localhost:5001';
    
    try {
      console.log('Attempting PDF to images conversion via Python service...');
      
      const pythonFormData = new FormData();
      pythonFormData.append('file', pdfFile);
      pythonFormData.append('start_page', startPage.toString());
      if (endPage > 0) pythonFormData.append('end_page', endPage.toString());
      pythonFormData.append('dpi', dpi.toString());
      
      const pythonResponse = await fetch(`${pythonUrl}/pdf-to-images`, {
        method: 'POST',
        body: pythonFormData,
        signal: AbortSignal.timeout(60000), // 60 second timeout for large PDFs
      });
      
      if (pythonResponse.ok) {
        const result = await pythonResponse.json();
        
        if (result.success && result.images) {
          console.log(`Successfully converted ${result.images.length} pages to images`);
          return NextResponse.json({
            success: true,
            images: result.images, // Array of {page_number, base64_data, width, height, format}
            method: 'python',
            total_pages: result.total_pages
          });
        }
      } else {
        console.warn('Python service returned error:', await pythonResponse.text());
      }
    } catch (pythonError) {
      console.warn('Python service unavailable:', pythonError);
    }
    
    // Fallback: Return error and ask client to handle conversion
    return NextResponse.json(
      { 
        error: 'PDF to image conversion service unavailable. Please use client-side conversion.',
        fallback_required: true
      },
      { status: 503 }
    );
    
  } catch (error: any) {
    console.error('PDF to images conversion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert PDF to images' },
      { status: 500 }
    );
  }
}
