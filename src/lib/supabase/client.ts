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
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'igaprep-auth',
        flowType: 'pkce',
        // Use localStorage for better persistence across refreshes
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-client-info': 'igaprep-web',
        },
        // Add retry logic for failed requests with better error handling
        fetch: async (url, options = {}) => {
          const maxRetries = 2;
          let lastError: Error | null = null;
          
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            try {
              const response = await fetch(url, { 
                ...options, 
                signal: controller.signal 
              });
              clearTimeout(timeoutId);
              return response;
            } catch (err) {
              clearTimeout(timeoutId);
              lastError = err as Error;
              // Only retry on network errors, not on aborts
              if (err instanceof Error && err.name === 'AbortError') {
                throw err;
              }
              // Wait before retry
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
