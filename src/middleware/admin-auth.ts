/**
 * Admin Authentication Middleware
 * Protects admin routes and enforces role-based access
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function adminAuthMiddleware(request: NextRequest) {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    // Not authenticated - redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    // Profile not found - redirect to unauthorized
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  const userRole = profile.role;
  const pathname = request.nextUrl.pathname;
  
  // Check if user has admin access
  const isAdmin = userRole === 'super_admin' || userRole === 'content_moderator';
  
  if (!isAdmin) {
    // Not an admin - redirect to unauthorized
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  // Role-specific route protection
  if (pathname.startsWith('/admin/users') || 
      pathname.startsWith('/admin/analytics') ||
      pathname.startsWith('/admin/settings') ||
      pathname.startsWith('/admin/audit-logs')) {
    // These routes are super admin only
    if (userRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
    }
  }
  
  // Allow access
  return NextResponse.next();
}

/**
 * Check if user has specific admin role
 */
export async function checkAdminRole(requiredRole: 'super_admin' | 'content_moderator'): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile) return false;
  
  if (requiredRole === 'content_moderator') {
    // Content moderator or super admin can access
    return profile.role === 'super_admin' || profile.role === 'content_moderator';
  }
  
  // Super admin only
  return profile.role === 'super_admin';
}
