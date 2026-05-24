import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleOAuthUser } from '../actions';

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
      // Handle OAuth user profile creation/sync. Don't block redirect on
      // upsert errors — `useUser` has a create-if-missing fallback.
      await handleOAuthUser(user);

      const metaRole = typeof user.user_metadata?.role === 'string'
        ? user.user_metadata.role
        : undefined;
      const metaOnboarded = user.user_metadata?.onboarding_completed === true;

      // If we have both role and onboarding state in metadata, skip the DB query.
      let role: string | undefined = metaRole;
      let onboardingCompleted: boolean | undefined = metaOnboarded ? true : undefined;

      if (!role || onboardingCompleted === undefined) {
        // Race DB lookup against a 1.5s timeout. On timeout, fall back to
        // metadata role (or default student) and let the dashboard role guard
        // correct routing once the real profile loads client-side.
        const lookup = supabase
          .from('users')
          .select('role, onboarding_completed')
          .eq('id', user.id)
          .single()
          .then((r: { data: { role?: string; onboarding_completed?: boolean } | null }) => r.data);
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        const userRecord = await Promise.race([lookup, timeout]).catch(() => null);

        if (userRecord) {
          role = role || userRecord.role;
          if (onboardingCompleted === undefined) {
            onboardingCompleted = userRecord.onboarding_completed;
          }
        }
      }

      // Redirect to onboarding only if we know it's incomplete. If unknown,
      // proceed to dashboard — server-side onboarding gate handles it.
      if (onboardingCompleted === false) {
        return NextResponse.redirect(new URL('/onboarding', origin));
      }

      if (role === 'super_admin' || role === 'content_moderator') {
        return NextResponse.redirect(new URL('/admin', origin));
      } else if (role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', origin));
      } else {
        return NextResponse.redirect(new URL('/student', origin));
      }
    }
  }

  // Fallback redirect to login with error
  return NextResponse.redirect(new URL('/login?error=no_code', origin));
}
