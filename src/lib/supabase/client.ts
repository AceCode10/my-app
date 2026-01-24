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
        // Session will be refreshed automatically before expiring
        // Supabase default is 1 hour, refresh happens at 80% of expiry
      },
      global: {
        headers: {
          'x-client-info': 'igaprep-web',
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
