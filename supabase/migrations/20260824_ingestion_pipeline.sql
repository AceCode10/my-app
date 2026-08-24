-- ============================================
-- AUTOMATED EXAM-PAPER INGESTION PIPELINE
-- Batches, per-paper jobs, per-file tracking,
-- idempotency keys, and the paper_questions -> questions bridge
-- ============================================

-- ---------- 1. BATCHES ----------
CREATE TABLE IF NOT EXISTS ingestion_batches (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label          TEXT,
    source         TEXT NOT NULL DEFAULT 'admin_ui',   -- 'admin_ui' | 'cli'
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    subject_id     UUID REFERENCES subjects(id) ON DELETE SET NULL,
    exam_board_id  UUID REFERENCES exam_boards(id) ON DELETE SET NULL,
    level          TEXT,
    profile_id     TEXT,                                -- operator override, null = auto-detect
    options        JSONB DEFAULT '{}'::jsonb,           -- {mirror, figures, confidenceGate, ...}
    total_jobs     INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    failed_jobs    INTEGER DEFAULT 0,
    status         TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','running','completed','completed_with_warnings','failed','cancelled')),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ
);

-- ---------- 2. PER-PAPER JOBS ----------
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id           UUID NOT NULL REFERENCES ingestion_batches(id) ON DELETE CASCADE,
    paper_id           UUID REFERENCES past_papers(id) ON DELETE SET NULL,

    -- idempotency: profileId|subjectCode|year|session|paperNumber|variant
    pair_key           TEXT NOT NULL,

    -- resolved metadata
    profile_id         TEXT,
    subject_code       TEXT,
    exam_year          INTEGER,
    session_code       TEXT,
    paper_number       TEXT,
    variant            TEXT,
    metadata_source    TEXT DEFAULT 'filename'
        CHECK (metadata_source IN ('filename','header','override','conflict')),
    metadata_confidence NUMERIC(4,3),

    -- progress
    status             TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','running','needs_review','completed',
                          'completed_with_warnings','failed','cancelled','skipped')),
    stage              TEXT NOT NULL DEFAULT 'discover',
    stages_completed   TEXT[] DEFAULT ARRAY[]::TEXT[],
    progress_percent   INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),

    -- results
    questions_extracted   INTEGER DEFAULT 0,
    answers_matched       INTEGER DEFAULT 0,
    answers_unmatched     INTEGER DEFAULT 0,
    figures_extracted     INTEGER DEFAULT 0,
    questions_mirrored    INTEGER DEFAULT 0,
    marks_extracted       INTEGER,
    marks_stated_qp       INTEGER,
    marks_stated_ms       INTEGER,

    -- quality
    confidence         NUMERIC(4,3),
    gate_results       JSONB DEFAULT '[]'::jsonb,   -- [{id,passed,score,detail}]
    error_codes        TEXT[] DEFAULT ARRAY[]::TEXT[],
    warnings           JSONB DEFAULT '[]'::jsonb,
    error_message      TEXT,
    error_stage        TEXT,

    -- operational
    degraded_mode      TEXT,      -- null | 'pdfjs' | 'vision'
    figures_pending    BOOLEAN DEFAULT FALSE,
    llm_calls          INTEGER DEFAULT 0,
    llm_input_tokens   INTEGER DEFAULT 0,
    llm_output_tokens  INTEGER DEFAULT 0,
    attempt_count      INTEGER DEFAULT 0,
    reviewed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at        TIMESTAMPTZ,

    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_batch  ON ingestion_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_paper  ON ingestion_jobs(paper_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingestion_jobs_pair_key
    ON ingestion_jobs(pair_key) WHERE status <> 'cancelled';

-- ---------- 3. PER-FILE CHILD ----------
CREATE TABLE IF NOT EXISTS ingestion_files (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    batch_id       UUID NOT NULL REFERENCES ingestion_batches(id) ON DELETE CASCADE,
    original_name  TEXT NOT NULL,
    doc_type       TEXT NOT NULL
        CHECK (doc_type IN ('qp','ms','insert','examiner_report','grade_thresholds','source_files','unknown')),
    storage_bucket TEXT DEFAULT 'past-papers',
    storage_path   TEXT,
    public_url     TEXT,
    file_size      INTEGER,
    page_count     INTEGER,
    sha256         TEXT,                         -- skip re-extraction when unchanged
    status         TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','uploaded','extracted','orphan','failed','skipped')),
    stage_output   JSONB DEFAULT '{}'::jsonb,    -- {text:{...}, structure:{...}, markScheme:{...}}
    extraction_method TEXT,                      -- 'python_v2' | 'pdfjs' | 'vision'
    error_message  TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_files_job    ON ingestion_files(job_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_files_batch  ON ingestion_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_files_orphan ON ingestion_files(batch_id) WHERE status = 'orphan';
CREATE INDEX IF NOT EXISTS idx_ingestion_files_sha    ON ingestion_files(sha256);

-- ---------- 4. PAPER-LEVEL IDEMPOTENCY ----------
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS ingestion_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_past_papers_ingestion_key
    ON past_papers(ingestion_key) WHERE ingestion_key IS NOT NULL;

-- ---------- 5. paper_questions: canonical ref + provenance ----------
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS question_ref          TEXT;
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS ingestion_job_id      UUID REFERENCES ingestion_jobs(id) ON DELETE SET NULL;
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(4,3);
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS extraction_method     TEXT;
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS review_status         TEXT DEFAULT 'unreviewed';
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS source_page           INTEGER;
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS source_bbox           JSONB;
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS error_codes           TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS archived_at           TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'paper_questions_review_status_check') THEN
    ALTER TABLE paper_questions ADD CONSTRAINT paper_questions_review_status_check
      CHECK (review_status IN ('unreviewed','needs_review','approved','rejected','needs_topic'));
  END IF;
END $$;

-- Backfill question_ref for existing rows so the unique index can be created.
-- part_label conventions in existing data: 'a' or 'a(i)'.
UPDATE paper_questions
   SET question_ref = question_number::text ||
       CASE
         WHEN part_label IS NULL OR part_label = '' THEN ''
         -- "b(i)" -> "(b)(i)". regexp_replace avoids substring arithmetic, which
         -- throws "negative substring length" on any unexpected short value.
         WHEN part_label ~ '^[a-z]\([ivxlcdm]+\)$'
              THEN '(' || regexp_replace(part_label, '^([a-z])\(([ivxlcdm]+)\)$', E'\1)(\2') || ')'
         ELSE '(' || part_label || ')'
       END
 WHERE question_ref IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_questions_paper_ref
    ON paper_questions(paper_id, question_ref)
    WHERE question_ref IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_paper_questions_review
    ON paper_questions(review_status) WHERE review_status IN ('needs_review','needs_topic');

-- ---------- 6. THE BRIDGE: questions -> paper_questions ----------
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_paper_question_id UUID
    REFERENCES paper_questions(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ingestion_job_id UUID
    REFERENCES ingestion_jobs(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_confidence  NUMERIC(4,3);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_assigned_by TEXT;   -- 'llm' | 'admin' | 'rule'
ALTER TABLE questions ADD COLUMN IF NOT EXISTS review_status     TEXT DEFAULT 'unreviewed';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ingested_at       TIMESTAMPTZ;

-- THE upsert target: makes re-ingestion idempotent
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_paper_question
    ON questions(source_paper_question_id)
    WHERE source_paper_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_ingestion_job ON questions(ingestion_job_id);

COMMENT ON COLUMN questions.source_paper_question_id IS
  'Link back to the paper_questions row this was mirrored from. Unique - upsert target for idempotent re-ingestion.';
COMMENT ON COLUMN paper_questions.question_ref IS
  'Canonical question id: "4", "2(a)", "11(b)(i)". Unique per paper. Join key for mark schemes and idempotency.';

-- ---------- 7. RLS ----------
ALTER TABLE ingestion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_files   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ingestion batches" ON ingestion_batches;
CREATE POLICY "Admins manage ingestion batches" ON ingestion_batches FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','content_moderator','admin'))
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','content_moderator','admin'));

DROP POLICY IF EXISTS "Admins manage ingestion jobs" ON ingestion_jobs;
CREATE POLICY "Admins manage ingestion jobs" ON ingestion_jobs FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','content_moderator','admin'))
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','content_moderator','admin'));

DROP POLICY IF EXISTS "Admins manage ingestion files" ON ingestion_files;
CREATE POLICY "Admins manage ingestion files" ON ingestion_files FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','content_moderator','admin'))
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin','content_moderator','admin'));

-- ---------- 8. updated_at triggers (reuse existing fn from 20241218_paper_questions_clean.sql) ----------
DROP TRIGGER IF EXISTS ingestion_jobs_updated_at ON ingestion_jobs;
CREATE TRIGGER ingestion_jobs_updated_at BEFORE UPDATE ON ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION update_paper_questions_updated_at();

DROP TRIGGER IF EXISTS ingestion_files_updated_at ON ingestion_files;
CREATE TRIGGER ingestion_files_updated_at BEFORE UPDATE ON ingestion_files
  FOR EACH ROW EXECUTE FUNCTION update_paper_questions_updated_at();

SELECT 'Ingestion pipeline schema created successfully!' as status;
