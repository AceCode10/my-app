-- LLM cost telemetry.
--
-- Before this table there was no record of what any model call cost. The
-- ingestion_jobs columns (llm_calls, llm_input_tokens, llm_output_tokens) only
-- cover the new pipeline, and the three legacy extraction routes — which did
-- all 72 papers in the corpus — recorded nothing at all.
--
-- One row per model call, written fire-and-forget so accounting can never fail
-- a user-facing request.

CREATE TABLE IF NOT EXISTS llm_usage (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Which code path spent the money. Kept as free text rather than an enum so
  -- adding a call site never needs a migration.
  feature            TEXT NOT NULL,
  provider           TEXT NOT NULL,
  model              TEXT NOT NULL,

  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,

  -- Null when the model is absent from the rate table. A null cost with real
  -- token counts is honest; a fabricated cost is not.
  estimated_cost_usd NUMERIC(12, 6),

  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  paper_id           UUID,
  job_id             UUID,

  succeeded          BOOLEAN NOT NULL DEFAULT true,
  error              TEXT,
  metadata           JSONB
);

COMMENT ON TABLE llm_usage IS
  'One row per LLM call. estimated_cost_usd is null when the model has no known rate.';

CREATE INDEX IF NOT EXISTS llm_usage_created_idx
  ON llm_usage (created_at DESC);

CREATE INDEX IF NOT EXISTS llm_usage_feature_idx
  ON llm_usage (feature, created_at DESC);

CREATE INDEX IF NOT EXISTS llm_usage_user_idx
  ON llm_usage (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Access
--
-- Spend data is administrative. Server-side paths (scripts, ingestion) use the
-- service role and bypass RLS; the only in-app writer is the authenticated
-- request that made the call, and it may only attribute spend to itself.
-- ---------------------------------------------------------------------------

ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS llm_usage_admin_read ON llm_usage;
CREATE POLICY llm_usage_admin_read ON llm_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

DROP POLICY IF EXISTS llm_usage_self_insert ON llm_usage;
CREATE POLICY llm_usage_self_insert ON llm_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON llm_usage TO authenticated;

-- ---------------------------------------------------------------------------
-- Rollup for the cost dashboard
-- ---------------------------------------------------------------------------

-- security_invoker is required. Without it the view runs as its owner and
-- silently bypasses the admin-only RLS policy above, exposing spend data to
-- every authenticated user.
CREATE OR REPLACE VIEW llm_usage_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  feature,
  provider,
  model,
  count(*)                            AS calls,
  count(*) FILTER (WHERE NOT succeeded) AS failures,
  sum(input_tokens)                   AS input_tokens,
  sum(output_tokens)                  AS output_tokens,
  sum(estimated_cost_usd)             AS estimated_cost_usd,
  -- Surfaces unpriced models so a missing rate is visible, not silently $0.
  count(*) FILTER (WHERE estimated_cost_usd IS NULL) AS unpriced_calls
FROM llm_usage
GROUP BY 1, 2, 3, 4;

GRANT SELECT ON llm_usage_daily TO authenticated;
