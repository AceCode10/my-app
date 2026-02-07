import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protected route prefixes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/teacher",
  "/admin",
  "/student",
  "/onboarding",
];

// Auth pages that authenticated users should be redirected away from
const AUTH_PAGES = ["/login", "/signup"];


export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Intercept OAuth callback codes landing on the homepage
  // When Supabase redirects to /?code=... instead of /auth/callback?code=...,
  // forward to the server-side callback route for proper code exchange
  if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // Skip full middleware auth for /auth/callback — let the route handler
  // exchange the PKCE code without interference from getUser() which could
  // modify cookies or consume the code verifier
  if (pathname === '/auth/callback') {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in middleware');
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        // IMPORTANT: Use Supabase's cookie options as-is
        // Overriding them can break session persistence
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: Do NOT use getSession() or getClaims() here.
  // getUser() is the ONLY method that:
  // 1. Validates the token with the Supabase Auth server
  // 2. Refreshes expired tokens using the refresh token
  // 3. Writes updated cookies via the setAll callback above
  // Using getClaims()/getSession() skips token refresh, causing sessions
  // to silently expire and users to be logged out on page refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve the original URL as a redirect parameter
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  // Note: We redirect to "/" and let client-side handle role-based routing
  // because middleware can't easily fetch user role from database
  const isAuthPage = AUTH_PAGES.includes(pathname);
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    // Check for redirect parameter
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    url.pathname = redirectTo || "/";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
