// ============================================
// ADMIN MIDDLEWARE
// Server-side admin route protection
// ============================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AdminPermission } from '@/types/admin';

export async function requireAdmin(requiredPermission?: AdminPermission | 'super_admin_only') {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin/dashboard');
  }

  // Fetch user admin status
  const { data: userData, error } = await supabase
    .from('users')
    .select(
      `
      id,
      is_admin,
      admin_role_id,
      admin_role:admin_roles(
        id,
        code,
        name,
        permissions
      )
    `
    )
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    redirect('/unauthorized');
  }

  // Check if user is admin
  if (!userData.is_admin) {
    redirect('/unauthorized');
  }

  // If no specific permission required, any admin can access
  if (!requiredPermission) {
    return userData;
  }

  // Check for super admin only routes
  if (requiredPermission === 'super_admin_only') {
    if (userData.admin_role?.code !== 'super_admin') {
      redirect('/admin/dashboard'); // Redirect to their allowed area
    }
    return userData;
  }

  // Check specific permission
  const permissions = userData.admin_role?.permissions || [];

  // Super admin has all permissions
  if (permissions.includes('all')) {
    return userData;
  }

  // Check if user has required permission
  if (!permissions.includes(requiredPermission)) {
    redirect('/admin/dashboard'); // Redirect to their allowed area
  }

  return userData;
}

// Check if current user is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from('users')
    .select(
      `
      admin_role:admin_roles(code)
    `
    )
    .eq('id', user.id)
    .eq('is_admin', true)
    .single();

  return data?.admin_role?.code === 'super_admin';
}

// Check if current user is content moderator
export async function isContentModerator(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from('users')
    .select(
      `
      admin_role:admin_roles(code)
    `
    )
    .eq('id', user.id)
    .eq('is_admin', true)
    .single();

  return data?.admin_role?.code === 'content_moderator';
}

// Check if current user has specific permission
export async function hasPermission(permission: AdminPermission): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from('users')
    .select(
      `
      admin_role:admin_roles(permissions)
    `
    )
    .eq('id', user.id)
    .eq('is_admin', true)
    .single();

  const permissions = data?.admin_role?.permissions || [];

  // Super admin has all permissions
  if (permissions.includes('all')) {
    return true;
  }

  return permissions.includes(permission);
}
