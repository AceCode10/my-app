'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Input validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;
  const role = (formData.get('role') as string) || 'student';

  // Input validation
  if (!email || !password || !displayName) {
    return { error: 'All fields are required' };
  }

  if (!validateEmail(email)) {
    return { error: 'Please enter a valid email address' };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { error: passwordValidation.message };
  }

  // Validate role
  const validRoles = ['student', 'teacher'];
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role selected' };
  }

  const supabase = await createClient();

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        role: role,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    // Create user profile in users table with all required fields
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      display_name: displayName.trim(),
      role,
      subscription_tier: role === 'teacher' ? 'pro' : 'basic',
      onboarding_completed: false,
      leaderboard_opt_out: false,
      xp: 0,
      streak_days: 0,
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { error: 'Failed to create user profile. Please try again.' };
    }
  }

  // Redirect to onboarding for new users
  redirect('/onboarding');
}

// Handle OAuth user profile creation
export async function handleOAuthUser(user: any, displayName?: string, role?: string) {
  const supabase = await createClient();
  
  // Check if user profile already exists
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existingProfile) {
    // Update display_name if it looks like an email prefix (no spaces, likely auto-generated)
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (googleName) {
      const { data: currentProfile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      if (currentProfile?.display_name && !currentProfile.display_name.includes(' ') && currentProfile.display_name.includes('_')) {
        await supabase
          .from('users')
          .update({ display_name: googleName })
          .eq('id', user.id);
      }
    }
    return { success: true };
  }

  // Create profile for new OAuth user
  const { error: profileError } = await supabase.from('users').insert({
    id: user.id,
    email: user.email?.toLowerCase().trim(),
    display_name: displayName || user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || user.email?.split('@')[0],
    role: role || 'student',
    subscription_tier: 'basic',
    onboarding_completed: false,
    leaderboard_opt_out: false,
    xp: 0,
    streak_days: 0,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error('OAuth profile creation error:', profileError);
    return { error: 'Failed to create user profile' };
  }

  return { success: true };
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string | null;

  // Input validation
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (!validateEmail(email)) {
    return { error: 'Please enter a valid email address' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if user has completed onboarding
  if (data.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed, role')
      .eq('id', data.user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      redirect('/onboarding');
    }

    // Use redirect parameter if provided, otherwise redirect based on role
    if (redirectTo) {
      redirect(redirectTo);
    }
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
