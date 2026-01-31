import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy for Supabase Storage
 * This hides the actual Supabase URL from end users
 * 
 * Usage: /api/storage/bucket-name/path/to/file.pdf
 * Instead of: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.pdf
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;
    
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Reconstruct the path
    const storagePath = pathSegments.join('/');
    
    // Build the Supabase storage URL
    const supabaseStorageUrl = `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
    
    // Fetch the file from Supabase
    const response = await fetch(supabaseStorageUrl, {
      headers: {
        // Pass through any cache headers
        'Cache-Control': request.headers.get('Cache-Control') || 'public, max-age=3600',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: response.status }
      );
    }

    // Get the content type from the response
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = response.headers.get('Content-Length');
    
    // Stream the response
    const blob = await response.blob();
    
    // Create response with appropriate headers
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    };
    
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // For PDFs, set content disposition to inline for viewing
    if (contentType === 'application/pdf') {
      const filename = pathSegments[pathSegments.length - 1];
      headers['Content-Disposition'] = `inline; filename="${filename}"`;
    }

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Storage proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
