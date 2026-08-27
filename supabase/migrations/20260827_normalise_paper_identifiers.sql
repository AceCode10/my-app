-- Normalise past_papers identifier columns.
--
-- Rows reached the table two ways and disagree about which column holds what:
--
--   ingested      paper_number '1'        component_code '11'        variant '1'
--   hand-entered  paper_number 'Paper 1'  component_code 'Paper 1'   variant '11'
--
-- On hand-entered rows the real Cambridge component code sits in `variant` and
-- `component_code` holds a display label. Anything reading component_code as
-- the code gets a label, and anything reading variant as the trailing digit
-- gets the whole code. That is why the past-papers page rendered "0417/2" for
-- some rows and "0417/21" for others.
--
-- Target shape, matching the ingested rows:
--   component_code = full component code   ("11", "21", "02")
--   paper_number   = paper digit           ("1",  "2",  "2")
--   variant        = variant digit or NULL ("1",  "1",  NULL)
--
-- NOT TOUCHED — these are correct Cambridge codes, not errors:
--   0417/02 and 0417/03 are the Oct/Nov practical papers, which have no
--   regional variants. Every such row has session 'on' and variant NULL. The
--   May/June and Feb/March sittings of the same papers do have variants and
--   are coded /21, /22, /31, /32. Rewriting /02 to /21 would invent a paper
--   that does not exist.
--
-- Preview before applying:
--   npx tsx scripts/normalise-paper-identifiers.ts

-- ---------------------------------------------------------------------------
-- The one rule, applied idempotently.
--
-- Guards, all of which must hold:
--   1. component_code is not already a numeric code (so a re-run is a no-op)
--   2. variant holds exactly two digits — the real component code
--   3. the paper digit derived from that code agrees with the "Paper N" label
--      already on the row, so a row whose columns contradict each other is
--      left for a human rather than silently rewritten
-- ---------------------------------------------------------------------------

UPDATE past_papers
SET
  component_code = variant,
  paper_number = CASE
    WHEN left(variant, 1) = '0' THEN right(variant, 1)
    ELSE left(variant, 1)
  END,
  variant = CASE
    -- A leading zero means "no variant": 0417/02 is Paper 2, not Paper 0.
    WHEN left(variant, 1) = '0' THEN NULL
    ELSE right(variant, 1)
  END,
  updated_at = now()
WHERE
  component_code IS NOT NULL
  AND component_code !~ '^[0-9]+$'
  AND variant ~ '^[0-9]{2}$'
  AND (
    paper_number !~ '^[Pp]aper [0-9]+$'
    OR substring(paper_number from '[0-9]+') = CASE
         WHEN left(variant, 1) = '0' THEN right(variant, 1)
         ELSE left(variant, 1)
       END
  );

-- ---------------------------------------------------------------------------
-- Left alone deliberately
--
-- Two 0417 rows carry component_code '2' and '3' with session 'unknown'. A
-- single-digit code is not a Cambridge component code, and without the session
-- there is no way to tell whether they are /02 and /03 (Oct/Nov) or /21 and
-- /31 (May/June). Guessing would put a wrong code on a real paper, so they
-- keep their current values and are reported by the preview script instead.
-- ---------------------------------------------------------------------------
