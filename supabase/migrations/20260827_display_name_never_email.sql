-- Stop writing email addresses into users.display_name, and clean up the ones
-- already there.
--
-- Root cause: the on_auth_user_created trigger on auth.users ran
--   COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
-- so any signup whose metadata lacked a 'display_name' key got its email address
-- stored as the display name. The signup form and the signUp() server action both
-- require a name, but the trigger fires first and wins; Google OAuth supplies
-- 'full_name'/'name' rather than 'display_name', so every OAuth user landed on the
-- email fallback. 10 of 19 existing accounts are affected, most recently in June.
--
-- This surfaced because leaderboard_cache is USING (true) — readable by anyone
-- holding the anon key that ships in the client bundle — so those addresses became
-- publicly visible the moment the leaderboard cache was first populated.

-- 1. The trigger: try every metadata key an auth provider might use, and if none
--    yields a usable name, derive one from the email's local part rather than
--    storing the address itself. Mirrors formatEmailAsName() in src/app/auth/actions.ts.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  meta_name text;
  resolved  text;
BEGIN
  meta_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')
  );

  -- An address is never an acceptable display name, wherever it came from.
  IF meta_name IS NULL OR meta_name LIKE '%@%' THEN
    resolved := INITCAP(
      REGEXP_REPLACE(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), '[._-]+', ' ', 'g')
    );
  ELSE
    resolved := meta_name;
  END IF;

  INSERT INTO public.users (id, email, display_name, role, subscription_tier, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(resolved), ''), 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'teacher' THEN 'pro'
      ELSE 'basic'
    END,
    NOW()
  )
  -- The app inserts this row from three places (signUp, handleOAuthUser, and
  -- useUser's create-if-missing path), any of which can race the trigger. Without
  -- this the loser raised a duplicate-key error mid-signup.
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Backfill. Same transformation, so a school address like
--    dennis.sommeling@lusakaoaktree.school becomes "Dennis Sommeling" rather than
--    a generic placeholder. Only rows that are blank or address-shaped are touched.
UPDATE public.users
SET display_name = COALESCE(
      NULLIF(
        TRIM(INITCAP(REGEXP_REPLACE(SPLIT_PART(COALESCE(email, ''), '@', 1), '[._-]+', ' ', 'g'))),
        ''
      ),
      'Student'
    )
WHERE display_name IS NULL
   OR TRIM(display_name) = ''
   OR display_name LIKE '%@%';
