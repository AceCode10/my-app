-- Fix update_leaderboard_cache(): it has never successfully run in production.
--
-- The original body opened with an unqualified `DELETE FROM leaderboard_cache`.
-- Supabase enables a safe-update guard that rejects DELETE/UPDATE without a
-- WHERE clause, so every call failed with SQLSTATE 21000, "DELETE requires a
-- WHERE clause". Both call sites wrapped the RPC in try/catch and only
-- console.error'd, so the failure was silent and leaderboard_cache stayed empty.
--
-- Two changes:
--   1. `WHERE true` satisfies the guard. The DELETE and INSERT run inside the
--      function's transaction, so readers never observe an empty table mid-rebuild.
--   2. Execution is restricted to service_role. The function SELECTs
--      user_gamification, whose RLS is `user_id = auth.uid()`; called by a
--      logged-in user it would rebuild the whole board from that one visible row
--      and wipe everyone else out. service_role bypasses RLS, so the cron path
--      (/api/v1/leaderboard/refresh) rebuilds correctly. Left as SECURITY INVOKER
--      deliberately — with EXECUTE revoked, SECURITY DEFINER would add privilege
--      surface for no benefit.

CREATE OR REPLACE FUNCTION update_leaderboard_cache() RETURNS VOID AS $$
BEGIN
    DELETE FROM leaderboard_cache WHERE true;

    INSERT INTO leaderboard_cache (user_id, rank, total_xp, level, display_name, avatar_url, updated_at)
    SELECT
        ug.user_id,
        ROW_NUMBER() OVER (ORDER BY ug.total_xp DESC, ug.created_at ASC) as rank,
        ug.total_xp,
        ug.xp_level,
        COALESCE(u.display_name, u.email) as display_name,
        u.avatar_url,
        NOW() as updated_at
    FROM user_gamification ug
    JOIN users u ON ug.user_id = u.id
    WHERE u.leaderboard_opt_out = false
    ORDER BY ug.total_xp DESC, ug.created_at ASC
    LIMIT 1000;

    PERFORM pg_notify('leaderboard_updated', 'refresh');
END;
$$ LANGUAGE plpgsql;

-- Only the cron may rebuild the board.
REVOKE EXECUTE ON FUNCTION update_leaderboard_cache() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_leaderboard_cache() FROM anon;
REVOKE EXECUTE ON FUNCTION update_leaderboard_cache() FROM authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_cache() TO service_role;

-- The client reads this table on every leaderboard render, ordered by rank.
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_user_id ON leaderboard_cache(user_id);

-- Never publish an email address on the leaderboard.
--
-- leaderboard_cache is `USING (true)` — readable by anyone holding the anon key,
-- which ships in the client bundle. The original COALESCE fell back to
-- users.email when display_name was unset, so the moment the cache actually
-- populated, 10 of 13 rows became real addresses on a school domain. It went
-- unnoticed only because the DELETE bug meant the table was always empty.
--
-- Any account whose display_name is blank OR itself an email address now
-- appears under a neutral label. The durable fix is to require a real display
-- name at signup and backfill the existing rows.
CREATE OR REPLACE FUNCTION update_leaderboard_cache() RETURNS VOID AS $$
BEGIN
    DELETE FROM leaderboard_cache WHERE true;

    INSERT INTO leaderboard_cache (user_id, rank, total_xp, level, display_name, avatar_url, updated_at)
    SELECT
        ug.user_id,
        ROW_NUMBER() OVER (ORDER BY ug.total_xp DESC, ug.created_at ASC) as rank,
        ug.total_xp,
        ug.xp_level,
        -- display_name itself holds an email for many accounts (signup writes the
        -- address when no name is given), so a NULL check is not enough — anything
        -- address-shaped is masked outright.
        CASE
            WHEN TRIM(COALESCE(u.display_name, '')) = '' THEN 'Student'
            WHEN u.display_name LIKE '%@%' THEN 'Student'
            ELSE TRIM(u.display_name)
        END as display_name,
        u.avatar_url,
        NOW() as updated_at
    FROM user_gamification ug
    JOIN users u ON ug.user_id = u.id
    WHERE u.leaderboard_opt_out = false
    ORDER BY ug.total_xp DESC, ug.created_at ASC
    LIMIT 1000;

    PERFORM pg_notify('leaderboard_updated', 'refresh');
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION update_leaderboard_cache() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_leaderboard_cache() FROM anon;
REVOKE EXECUTE ON FUNCTION update_leaderboard_cache() FROM authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_cache() TO service_role;
