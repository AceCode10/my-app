import { createClient } from '@/lib/supabase/client';

export type SettingsMap = Record<string, any>;

// Defaults used when no rows exist yet. Keep keys aligned with the admin UI shape.
export const DEFAULT_SETTINGS: SettingsMap = {
  siteName: 'IGA Prep',
  siteDescription: 'The best revision materials for IGCSE, GCSE & A-Level students',
  supportEmail: 'support@igaprep.com',
  maintenanceMode: false,
  allowSignups: true,
  enableSignups: true,
  enableGoogleAuth: true,
  enableNotifications: true,
  enableEmailDigest: false,
  requireEmailVerification: true,
  enableAIFeatures: false,
  enablePublicQuizzes: true,
  defaultContentStatus: 'draft',
  requireApproval: true,
  autoPublishAfterApproval: true,
  guestNoteLimit: 5,
  basicNoteLimit: 20,
  guestFlashcardLimit: 10,
  basicFlashcardLimit: 50,
  maxFileSize: 50,
  allowedFileTypes: '.pdf,.jpg,.png',
  sessionTimeout: 24,
  passwordMinLength: 8,
  enableRateLimiting: true,
};

export async function loadPlatformSettings(): Promise<SettingsMap> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value');

  if (error || !data) {
    return { ...DEFAULT_SETTINGS };
  }

  const merged: SettingsMap = { ...DEFAULT_SETTINGS };
  for (const row of data) {
    merged[(row as any).key] = (row as any).value;
  }
  return merged;
}

export async function savePlatformSettings(
  settings: SettingsMap,
  userId?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const updatedAt = new Date().toISOString();
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_by: userId ?? null,
    updated_at: updatedAt,
  }));

  const { error } = await supabase
    .from('platform_settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getSetting<T = any>(key: string, fallback?: T): Promise<T> {
  const supabase = createClient();
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (!data) return (fallback ?? DEFAULT_SETTINGS[key]) as T;
  return (data as any).value as T;
}
