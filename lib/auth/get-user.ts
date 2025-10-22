import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types/database';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  return data?.role || null;
}
