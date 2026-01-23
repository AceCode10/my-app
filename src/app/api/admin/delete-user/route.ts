import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Check if current user is admin/super_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user has admin privileges
    if (!['super_admin', 'content_moderator'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if target user is admin/moderator (prevent accidental deletion)
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (targetError) {
      return NextResponse.json({ 
        error: 'Target user not found', 
        details: targetError.message 
      }, { status: 404 });
    }

    // Prevent deletion of admin/moderator accounts
    if (targetUser.role === 'super_admin' || targetUser.role === 'content_moderator') {
      return NextResponse.json({ 
        error: 'Cannot delete admin or moderator accounts', 
        details: `User ${targetUser.email} has role: ${targetUser.role}. Please demote the user first or use emergency deletion procedures.`,
        role: targetUser.role
      }, { status: 403 });
    }

    // Delete user from auth.users (this will cascade delete from users table)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete user', 
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error: any) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      message: error.message 
    }, { status: 500 });
  }
}
