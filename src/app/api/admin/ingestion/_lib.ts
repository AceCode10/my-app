import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared plumbing for the ingestion routes.
 *
 * Mirrors the auth gate used by /api/admin/fix-context-questions so ingestion
 * is protected exactly like every other admin endpoint.
 */

export const ADMIN_ROLES = ['super_admin', 'content_moderator', 'admin'];

export interface AdminContext {
  userId: string;
  role: string;
  /** Service-role client: ingestion writes across tables that RLS restricts. */
  service: SupabaseClient;
}

export async function requireAdmin(): Promise<
  { ok: true; ctx: AdminContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const { data: profile, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleError || !profile) {
    return { ok: false, response: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) };
  }

  if (!ADMIN_ROLES.includes(profile.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Server is missing Supabase service credentials' },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      role: profile.role,
      service: createServiceClient(url, key, { auth: { persistSession: false } }),
    },
  };
}

export const PAST_PAPERS_BUCKET = 'past-papers';

/**
 * Storage path for an uploaded source PDF, matching the convention already used
 * by the admin papers upload form.
 */
export function storagePathFor(
  meta: { year: number | null; subjectCode: string | null; componentCode: string | null },
  docType: string,
  originalName: string,
): string {
  const extension = originalName.split('.').pop()?.toLowerCase() ?? 'pdf';
  const stamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return [
    meta.year ?? 'unknown',
    meta.subjectCode ?? 'unknown',
    meta.componentCode ?? 'p',
    `${docType}-${stamp}-${random}.${extension}`,
  ].join('/');
}
