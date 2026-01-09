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
let supabaseClient: SupabaseClient | null = null;

export function createClient() {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseKey } = validateEnv();
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}
