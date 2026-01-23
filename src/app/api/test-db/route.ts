import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Check auth
    const startAuth = Date.now();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const authTime = Date.now() - startAuth;
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authTime,
        authError: authError?.message,
      });
    }
    
    // Test 2: Simple count query
    const startCount = Date.now();
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    const countTime = Date.now() - startCount;
    
    // Test 3: Fetch user profile
    const startProfile = Date.now();
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    const profileTime = Date.now() - startProfile;
    
    return NextResponse.json({
      success: true,
      timings: {
        auth: `${authTime}ms`,
        count: `${countTime}ms`,
        profile: `${profileTime}ms`,
      },
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile ? {
        role: profile.role,
        hasData: true,
      } : null,
      errors: {
        count: countError?.message,
        profile: profileError?.message,
      },
      totalUsers: count,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message,
    }, { status: 500 });
  }
}
