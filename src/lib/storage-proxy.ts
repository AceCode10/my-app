/**
 * Storage Proxy Utility
 * Converts Supabase storage URLs to proxied URLs that hide the Supabase domain
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Convert a Supabase storage URL to a proxied URL
 * 
 * @param url - The original Supabase storage URL
 * @returns The proxied URL or the original URL if not a Supabase storage URL
 * 
 * @example
 * // Input: https://xxx.supabase.co/storage/v1/object/public/topical-pdfs/file.pdf
 * // Output: /api/storage/topical-pdfs/file.pdf
 */
export function getProxiedStorageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Check if it's a Supabase storage URL
  const supabaseStoragePattern = /https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//;
  
  if (supabaseStoragePattern.test(url)) {
    // Extract the path after /storage/v1/object/public/
    const match = url.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (match && match[1]) {
      return `/api/storage/${match[1]}`;
    }
  }
  
  // Also handle URLs that use the NEXT_PUBLIC_SUPABASE_URL directly
  if (SUPABASE_URL && url.startsWith(SUPABASE_URL)) {
    const storagePath = url.replace(`${SUPABASE_URL}/storage/v1/object/public/`, '');
    if (storagePath !== url) {
      return `/api/storage/${storagePath}`;
    }
  }
  
  // Return original URL if not a Supabase storage URL
  return url;
}

/**
 * Check if a URL is a Supabase storage URL
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  const supabaseStoragePattern = /https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//;
  return supabaseStoragePattern.test(url) || 
    (SUPABASE_URL ? url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`) : false);
}

/**
 * Get the original Supabase URL from a proxied URL (for server-side use)
 */
export function getOriginalStorageUrl(proxiedUrl: string): string {
  if (proxiedUrl.startsWith('/api/storage/')) {
    const path = proxiedUrl.replace('/api/storage/', '');
    return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
  }
  return proxiedUrl;
}
