import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    
    // Create Supabase client with proper cookie handling for the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    // Exchange the code for a session - this sets the cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
    }
    
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
        return NextResponse.redirect(new URL('/admin', origin));
      } else if (userRecord?.role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', origin));
      } else {
        return NextResponse.redirect(new URL('/student', origin));
      }
    }
  }

  // Fallback redirect to login with error
  return NextResponse.redirect(new URL('/login?error=no_code', origin));
}
