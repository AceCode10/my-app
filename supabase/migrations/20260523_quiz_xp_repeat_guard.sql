-- H1: Block repeat XP for topical-question grinding.
--
-- Policy (locked with product owner 2026-05-23):
--   First successful XP award for a (user_id, question_id) on source='topical_question'
--   is the only one that counts. Re-attempts must award 0 XP.
--
-- The reward engine enforces this in code, but we add a defense-in-depth unique index
-- so a parallel race or a future refactor cannot accidentally re-grant XP.

CREATE UNIQUE INDEX IF NOT EXISTS xp_transactions_topical_question_unique
  ON public.xp_transactions (user_id, source_id)
  WHERE source = 'topical_question' AND source_id IS NOT NULL;
