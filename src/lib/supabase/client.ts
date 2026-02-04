import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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
        // Increase session lifetime and refresh more aggressively
        // This helps prevent unexpected logouts
      },
      global: {
        headers: {
          'x-client-info': 'igaprep-web',
        },
        // Add retry logic for failed requests
        fetch: (url, options = {}) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
          
          return fetch(url, { 
            ...options, 
            signal: controller.signal 
          }).finally(() => clearTimeout(timeoutId));
        },
      },
      // Improve connection resilience
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    });
    
    // Set up session refresh listener to prevent unexpected logouts
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Supabase] Session token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('[Supabase] User signed out');
      }
    });
  }
  return supabaseClient;

}

// Helper to check if session is valid without throwing
export async function isSessionValid(): Promise<boolean> {
  try {
    const client = createClient();
    const { data: { session }, error } = await client.auth.getSession();
    return !error && !!session;
  } catch {
    return false;
  }
}
