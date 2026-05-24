-- C5: Persistent platform-wide settings configurable by super_admin from the admin dashboard.
-- Key-value table (jsonb values) so we can add new settings without schema churn.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated reads are fine; clients (and middlewares enforcing limits) need to read these.
DROP POLICY IF EXISTS "platform_settings_read_authenticated" ON public.platform_settings;
CREATE POLICY "platform_settings_read_authenticated"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admin can write.
DROP POLICY IF EXISTS "platform_settings_write_super_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_write_super_admin"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Seed sensible defaults so the admin settings page has something to display on first load.
INSERT INTO public.platform_settings (key, value) VALUES
  ('siteName',                  to_jsonb('IGA Prep'::text)),
  ('siteDescription',           to_jsonb('Exam prep platform'::text)),
  ('supportEmail',              to_jsonb('support@igaprep.com'::text)),
  ('maintenanceMode',           to_jsonb(false)),
  ('allowSignups',              to_jsonb(true)),
  ('requireEmailVerification',  to_jsonb(true)),
  ('enableAIFeatures',          to_jsonb(false)),
  ('enablePublicQuizzes',       to_jsonb(true)),
  ('autoPublishAfterApproval',  to_jsonb(true)),
  ('guestNoteLimit',            to_jsonb(5)),
  ('basicNoteLimit',            to_jsonb(20)),
  ('guestFlashcardLimit',       to_jsonb(10)),
  ('basicFlashcardLimit',       to_jsonb(50)),
  ('maxFileSize',               to_jsonb(50)),
  ('allowedFileTypes',          to_jsonb('.pdf,.jpg,.png'::text)),
  ('sessionTimeout',            to_jsonb(24)),
  ('passwordMinLength',         to_jsonb(8)),
  ('enableRateLimiting',        to_jsonb(true))
ON CONFLICT (key) DO NOTHING;
