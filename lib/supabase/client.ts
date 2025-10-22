import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://inmptqnwcgymzkjjppdm.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubXB0cW53Y2d5bXprampwcGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDQzNzUsImV4cCI6MjA3NjUyMDM3NX0.f3g9JOOot5hU2IHX4GhYcaoFyzuZQYG4m8SYhGe_zI8";
  
  return createBrowserClient(supabaseUrl, supabaseKey);
}
