'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;
  const role = (formData.get('role') as string) || 'student';
  
  // Validate inputs
  if (!email || !password || !displayName) {
    return { error: 'All fields are required' };
  }
  
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }
  
  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  
  if (error) {
    return { error: error.message };
  }
  
  // Create user profile
  if (data.user) {
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email!,
      display_name: displayName,
      role: role,
    });
    
    if (profileError) {
      return { error: 'Failed to create user profile' };
    }
  }
  
  redirect('/dashboard');
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return { error: 'Invalid email or password' };
  }
  
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'Not authenticated' };
  }
  
  const displayName = formData.get('displayName') as string;
  const avatarUrl = formData.get('avatarUrl') as string;
  const subjectsOfInterest = formData.get('subjectsOfInterest') as string;
  
  const updates: any = {};
  
  if (displayName) updates.display_name = displayName;
  if (avatarUrl) updates.avatar_url = avatarUrl;
  if (subjectsOfInterest) {
    updates.subjects_of_interest = subjectsOfInterest.split(',').map(s => s.trim());
  }
  
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);
  
  if (error) {
    return { error: 'Failed to update profile' };
  }
  
  revalidatePath('/dashboard/profile');
  return { success: true };
}
