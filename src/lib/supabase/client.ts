import { createBrowserClient } from "@supabase/ssr";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Validate environment variables
function validateEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }

  return { supabaseUrl, supabaseKey };
}

// Singleton pattern - reuse the same client instance
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;
let authListenerSetup = false;

export function createClient() {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseKey } = validateEnv();
    
    // CRITICAL: Use default cookie-based storage for SSR compatibility
    // This ensures client and server share the same session via cookies
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Let Supabase SSR handle storage via cookies (default behavior)
        // DO NOT override storage - this breaks SSR session sync
      },
      global: {
        headers: {
          'x-client-info': 'igaprep-web',
        },
        // Retry on network errors only. Do NOT add custom AbortController
        // or override options.signal — Supabase manages its own signals internally.
        // Overriding the signal breaks token refresh and causes requests to hang.
        fetch: async (url, options = {}) => {
          const maxRetries = 1;
          let lastError: Error | null = null;
          // Diagnostic: extract short URL path for logging
          const urlStr = typeof url === 'string' ? url : (url as Request).url || String(url);
          const shortUrl = urlStr.replace(/https?:\/\/[^/]+/, '').split('?')[0];
          const method = (options as RequestInit).method || 'GET';
          
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const start = Date.now();
            try {
              if (attempt > 0) console.log(`[Fetch] RETRY #${attempt} ${method} ${shortUrl}`);
              else console.log(`[Fetch] ${method} ${shortUrl}`);
              const response = await fetch(url, options);
              console.log(`[Fetch] ${method} ${shortUrl} → ${response.status} (${Date.now() - start}ms)`);
              return response;
            } catch (err) {
              lastError = err as Error;
              console.error(`[Fetch] ${method} ${shortUrl} FAILED (${Date.now() - start}ms): ${(err as Error).name} ${(err as Error).message}`);
              // Don't retry intentional aborts
              if (err instanceof Error && err.name === 'AbortError') {
                throw err;
              }
              // Retry network errors after a delay
              if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
              }
            }
          }
          throw lastError;
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    });
  }
  
  // Set up auth listener only once
  if (!authListenerSetup && supabaseClient) {
    authListenerSetup = true;
    supabaseClient.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed');
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] Signed out - clearing cache');
        // Dispatch event for other components to react
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth_signed_out'));
        }
      } else if (event === 'SIGNED_IN') {
        console.log('[Auth] Signed in');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth_signed_in', { detail: { userId: session?.user?.id } }));
        }
      }
    });
  }
  
  return supabaseClient;
}

// Helper to validate session with server (more reliable than getSession)
export async function getValidatedSession() {
  try {
    const client = createClient();
    // getUser() validates the session with the server
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) {
      return null;
    }
    // Get the full session after validating user exists
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

// Helper to check if session is valid without throwing
export async function isSessionValid(): Promise<boolean> {
  const session = await getValidatedSession();
  return !!session;
}
