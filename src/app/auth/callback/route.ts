import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Get user role to redirect to appropriate dashboard
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      // Redirect based on role
      if (userRecord?.role === 'super_admin' || userRecord?.role === 'content_moderator') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (userRecord?.role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
      } else {
        return NextResponse.redirect(new URL('/student', request.url));
      }
    }
  }

  // Fallback redirect to student dashboard
  return NextResponse.redirect(new URL('/student', request.url));
}
