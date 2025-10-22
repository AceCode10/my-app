import { getCurrentUser } from './get-user';
import { redirect } from 'next/navigation';
import type { Role } from '@/types/database';

export async function requireAuth(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }
  
  return user;
}

export async function requireStudent() {
  return requireAuth(['student']);
}

export async function requireTeacher() {
  return requireAuth(['teacher', 'super_admin']);
}

export async function requireAdmin() {
  return requireAuth(['super_admin', 'content_moderator']);
}
