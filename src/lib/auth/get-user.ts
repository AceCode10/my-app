import { createClient } from '@/lib/supabase/server';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Fetch user profile from users table
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
