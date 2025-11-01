'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;
  const role = (formData.get('role') as string) || 'student';

  const supabase = await createClient();

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    // Create user profile in users table
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      display_name: displayName,
      role,
      subscription_tier: role === 'teacher' ? 'pro' : 'basic',
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      return { error: profileError.message };
    }
  }

  redirect('/dashboard');
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
