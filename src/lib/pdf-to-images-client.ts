'use client';

export interface PageImage {
  page_number: number;
  base64_data: string;
  width: number;
  height: number;
  format: string;
}

export interface PdfToImagesResult {
  success: boolean;
  images: PageImage[];
  total_pages: number;
  error?: string;
}

/**
 * Convert PDF file to array of base64-encoded images using pdf.js loaded from CDN
 * This doesn't require any server-side dependencies like Poppler
 */
export async function convertPdfToImages(
  pdfFile: File,
  options: {
    startPage?: number;
    endPage?: number;
    scale?: number;
    format?: 'png' | 'jpeg';
    quality?: number;
  } = {}
): Promise<PdfToImagesResult> {
  const {
    startPage = 1,
    endPage = 0,
    scale = 2,
    format = 'png',
    quality = 0.92
  } = options;

  try {
    // Dynamically load pdf.js from CDN to avoid Next.js bundling issues
    const pdfjsLib = await loadPdfJs();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages;
    const lastPage = endPage > 0 ? Math.min(endPage, totalPages) : totalPages;
    const firstPage = Math.max(1, startPage);
    
    const images: PageImage[] = [];
    
    // Convert each page to image
    for (let pageNum = firstPage; pageNum <= lastPage; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Get viewport at specified scale
      const viewport = page.getViewport({ scale });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to base64
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64Data = canvas.toDataURL(mimeType, quality).split(',')[1];
      
      images.push({
        page_number: pageNum,
        base64_data: base64Data,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        format: format
      });
      
      // Clean up
      canvas.remove();
    }
    
    return {
      success: true,
      images,
      total_pages: totalPages
    };
    
  } catch (error: any) {
    console.error('PDF to images conversion error:', error);
    return {
      success: false,
      images: [],
      total_pages: 0,
      error: error.message || 'Failed to convert PDF to images'
    };
  }
}

/**
 * Load pdf.js library from CDN
 */
let pdfjsLibCache: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLibCache) {
    return pdfjsLibCache;
  }
  
  // Check if already loaded globally
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    pdfjsLibCache = (window as any).pdfjsLib;
    return pdfjsLibCache;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLibCache = pdfjsLib;
        resolve(pdfjsLib);
      } else {
        reject(new Error('Failed to load pdf.js library'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load pdf.js from CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Convert a single PDF page to base64 image
 */
export async function convertPdfPageToImage(
  pdfFile: File,
  pageNumber: number,
  scale: number = 2
): Promise<{ success: boolean; image?: PageImage; error?: string }> {
  const result = await convertPdfToImages(pdfFile, {
    startPage: pageNumber,
    endPage: pageNumber,
    scale
  });
  
  if (result.success && result.images.length > 0) {
    return { success: true, image: result.images[0] };
  }
  
  return { success: false, error: result.error || 'Failed to convert page' };
}

/**
 * Extract text content from a PDF file using PDF.js
 * This is a client-side fallback when Python parser is not available
 */
export interface PdfTextResult {
  success: boolean;
  text: string;
  pageCount: number;
  error?: string;
}

export async function extractTextFromPdf(pdfFile: File): Promise<PdfTextResult> {
  try {
    // Dynamically load pdf.js from CDN
    const pdfjsLib = await loadPdfJs();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages;
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Process text items with better structure preservation
      let lastY: number | null = null;
      let pageText = '';
      
      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        
        // Check if this is a new line (Y position changed significantly)
        const currentY = item.transform ? item.transform[5] : null;
        if (lastY !== null && currentY !== null) {
          const yDiff = Math.abs(currentY - lastY);
          if (yDiff > 5) {
            // New line detected
            pageText += '\n';
          } else if (item.str.trim() && pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            // Same line, add space between items
            pageText += ' ';
          }
        }
        
        pageText += item.str;
        lastY = currentY;
      }
      
      fullText += pageText + '\n\n--- Page ' + pageNum + ' ---\n\n';
    }
    
    console.log('PDF.js extracted text preview:', fullText.slice(0, 500));
    
    return {
      success: true,
      text: fullText.trim(),
      pageCount: totalPages
    };
    
  } catch (error: any) {
    console.error('PDF text extraction error:', error);
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error.message || 'Failed to extract text from PDF'
    };
  }
}
