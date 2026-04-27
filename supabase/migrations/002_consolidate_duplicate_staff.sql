-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 002_consolidate_duplicate_staff
-- Merges duplicate staff records into canonical names.
-- Reassigns all FK references from duplicates to canonical records,
-- then soft-deletes (active = false) the duplicates.
--
-- Canonical → Duplicates:
--   Jordan Darnley    ← Jordan Darnely
--   Daniel Goodfellow ← Dan Goodfelow
--   Ethan Teuma       ← Ethan Tuma, Ethan Tuema
--   Natasha Zahra     ← Tash Zahra
--   Matthew Constance ← Mathew Constance
--
-- RUN THE VERIFICATION BLOCK FIRST (Step 1) to confirm IDs before proceeding.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Step 1: Verification (run this first, check output before proceeding) ────

SELECT
  name,
  id,
  active,
  CASE lower(trim(name))
    WHEN 'jordan darnley'    THEN 'canonical'
    WHEN 'jordan darnely'    THEN 'DUPLICATE'
    WHEN 'daniel goodfellow' THEN 'canonical'
    WHEN 'dan goodfelow'     THEN 'DUPLICATE'
    WHEN 'ethan teuma'       THEN 'canonical'
    WHEN 'ethan tuma'        THEN 'DUPLICATE'
    WHEN 'ethan tuema'       THEN 'DUPLICATE'
    WHEN 'natasha zahra'     THEN 'canonical'
    WHEN 'tash zahra'        THEN 'DUPLICATE'
    WHEN 'matthew constance' THEN 'canonical'
    WHEN 'mathew constance'  THEN 'DUPLICATE'
  END AS status
FROM staff
WHERE lower(trim(name)) IN (
  'jordan darnley', 'jordan darnely',
  'daniel goodfellow', 'dan goodfelow',
  'ethan teuma', 'ethan tuma', 'ethan tuema',
  'natasha zahra', 'tash zahra',
  'matthew constance', 'mathew constance'
)
ORDER BY lower(trim(name));


-- ── Step 2: Merge duplicates ─────────────────────────────────────────────────
-- Only run this after confirming Step 1 shows the correct records.
--
-- NOTE: The reporting tables (inspection_personnel, chemical_application_operators,
-- report_staff_summary) use a staff FK column. If that column is named differently
-- than 'staff_id' in your reporting schema (e.g. 'employee_id'), update those
-- UPDATE statements before running.

DO $$
DECLARE
  -- Canonical record IDs
  id_jordan_darnley    uuid;
  id_daniel_goodfellow uuid;
  id_ethan_teuma       uuid;
  id_natasha_zahra     uuid;
  id_matthew_constance uuid;

  -- Duplicate record IDs
  id_jordan_darnely    uuid;
  id_dan_goodfelow     uuid;
  id_ethan_tuma        uuid;
  id_ethan_tuema       uuid;
  id_tash_zahra        uuid;
  id_mathew_constance  uuid;

BEGIN

  -- ── Resolve canonical IDs ───────────────────────────────────────────────
  SELECT id INTO id_jordan_darnley    FROM staff WHERE lower(trim(name)) = 'jordan darnley';
  SELECT id INTO id_daniel_goodfellow FROM staff WHERE lower(trim(name)) = 'daniel goodfellow';
  SELECT id INTO id_ethan_teuma       FROM staff WHERE lower(trim(name)) = 'ethan teuma';
  SELECT id INTO id_natasha_zahra     FROM staff WHERE lower(trim(name)) = 'natasha zahra';
  SELECT id INTO id_matthew_constance FROM staff WHERE lower(trim(name)) = 'matthew constance';

  -- ── Resolve duplicate IDs ───────────────────────────────────────────────
  SELECT id INTO id_jordan_darnely   FROM staff WHERE lower(trim(name)) = 'jordan darnely';
  SELECT id INTO id_dan_goodfelow    FROM staff WHERE lower(trim(name)) = 'dan goodfelow';
  SELECT id INTO id_ethan_tuma       FROM staff WHERE lower(trim(name)) = 'ethan tuma';
  SELECT id INTO id_ethan_tuema      FROM staff WHERE lower(trim(name)) = 'ethan tuema';
  SELECT id INTO id_tash_zahra       FROM staff WHERE lower(trim(name)) = 'tash zahra';
  SELECT id INTO id_mathew_constance FROM staff WHERE lower(trim(name)) = 'mathew constance';

  RAISE NOTICE 'Canonical IDs — Jordan Darnley: %, Daniel Goodfellow: %, Ethan Teuma: %, Natasha Zahra: %, Matthew Constance: %',
    id_jordan_darnley, id_daniel_goodfellow, id_ethan_teuma, id_natasha_zahra, id_matthew_constance;
  RAISE NOTICE 'Duplicate IDs — Jordan Darnely: %, Dan Goodfelow: %, Ethan Tuma: %, Ethan Tuema: %, Tash Zahra: %, Mathew Constance: %',
    id_jordan_darnely, id_dan_goodfelow, id_ethan_tuma, id_ethan_tuema, id_tash_zahra, id_mathew_constance;


  -- ── Pair 1: Jordan Darnely → Jordan Darnley ────────────────────────────
  IF id_jordan_darnely IS NOT NULL AND id_jordan_darnley IS NOT NULL THEN
    UPDATE roster_assignments             SET staff_id = id_jordan_darnley WHERE staff_id = id_jordan_darnely;
    UPDATE inspection_personnel           SET staff_id = id_jordan_darnley WHERE staff_id = id_jordan_darnely;
    UPDATE chemical_application_operators SET staff_id = id_jordan_darnley WHERE staff_id = id_jordan_darnely;
    UPDATE report_staff_summary           SET staff_id = id_jordan_darnley WHERE staff_id = id_jordan_darnely;
    UPDATE staff SET active = false WHERE id = id_jordan_darnely;
    RAISE NOTICE 'Merged: Jordan Darnely → Jordan Darnley';
  ELSE
    RAISE NOTICE 'SKIP Pair 1 — one or both records not found';
  END IF;


  -- ── Pair 2: Dan Goodfelow → Daniel Goodfellow ──────────────────────────
  IF id_dan_goodfelow IS NOT NULL AND id_daniel_goodfellow IS NOT NULL THEN
    UPDATE roster_assignments             SET staff_id = id_daniel_goodfellow WHERE staff_id = id_dan_goodfelow;
    UPDATE inspection_personnel           SET staff_id = id_daniel_goodfellow WHERE staff_id = id_dan_goodfelow;
    UPDATE chemical_application_operators SET staff_id = id_daniel_goodfellow WHERE staff_id = id_dan_goodfelow;
    UPDATE report_staff_summary           SET staff_id = id_daniel_goodfellow WHERE staff_id = id_dan_goodfelow;
    UPDATE staff SET active = false WHERE id = id_dan_goodfelow;
    RAISE NOTICE 'Merged: Dan Goodfelow → Daniel Goodfellow';
  ELSE
    RAISE NOTICE 'SKIP Pair 2 — one or both records not found';
  END IF;


  -- ── Pair 3a: Ethan Tuma → Ethan Teuma ──────────────────────────────────
  IF id_ethan_tuma IS NOT NULL AND id_ethan_teuma IS NOT NULL THEN
    UPDATE roster_assignments             SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuma;
    UPDATE inspection_personnel           SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuma;
    UPDATE chemical_application_operators SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuma;
    UPDATE report_staff_summary           SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuma;
    UPDATE staff SET active = false WHERE id = id_ethan_tuma;
    RAISE NOTICE 'Merged: Ethan Tuma → Ethan Teuma';
  ELSE
    RAISE NOTICE 'SKIP Pair 3a — one or both records not found';
  END IF;

  -- ── Pair 3b: Ethan Tuema → Ethan Teuma ─────────────────────────────────
  IF id_ethan_tuema IS NOT NULL AND id_ethan_teuma IS NOT NULL THEN
    UPDATE roster_assignments             SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuema;
    UPDATE inspection_personnel           SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuema;
    UPDATE chemical_application_operators SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuema;
    UPDATE report_staff_summary           SET staff_id = id_ethan_teuma WHERE staff_id = id_ethan_tuema;
    UPDATE staff SET active = false WHERE id = id_ethan_tuema;
    RAISE NOTICE 'Merged: Ethan Tuema → Ethan Teuma';
  ELSE
    RAISE NOTICE 'SKIP Pair 3b — one or both records not found';
  END IF;


  -- ── Pair 4: Tash Zahra → Natasha Zahra ─────────────────────────────────
  IF id_tash_zahra IS NOT NULL AND id_natasha_zahra IS NOT NULL THEN
    UPDATE roster_assignments             SET staff_id = id_natasha_zahra WHERE staff_id = id_tash_zahra;
    UPDATE inspection_personnel           SET staff_id = id_natasha_zahra WHERE staff_id = id_tash_zahra;
    UPDATE chemical_application_operators SET staff_id = id_natasha_zahra WHERE staff_id = id_tash_zahra;
    UPDATE report_staff_summary           SET staff_id = id_natasha_zahra WHERE staff_id = id_tash_zahra;
    UPDATE staff SET active = false WHERE id = id_tash_zahra;
    RAISE NOTICE 'Merged: Tash Zahra → Natasha Zahra';
  ELSE
    RAISE NOTICE 'SKIP Pair 4 — one or both records not found';
  END IF;


  -- ── Pair 5: Mathew Constance → Matthew Constance ───────────────────────
  IF id_mathew_constance IS NOT NULL AND id_matthew_constance IS NOT NULL THEN
    UPDATE roster_assignments             SET staff_id = id_matthew_constance WHERE staff_id = id_mathew_constance;
    UPDATE inspection_personnel           SET staff_id = id_matthew_constance WHERE staff_id = id_mathew_constance;
    UPDATE chemical_application_operators SET staff_id = id_matthew_constance WHERE staff_id = id_mathew_constance;
    UPDATE report_staff_summary           SET staff_id = id_matthew_constance WHERE staff_id = id_mathew_constance;
    UPDATE staff SET active = false WHERE id = id_mathew_constance;
    RAISE NOTICE 'Merged: Mathew Constance → Matthew Constance';
  ELSE
    RAISE NOTICE 'SKIP Pair 5 — one or both records not found';
  END IF;

END $$;


-- ── Step 3: Confirm result ───────────────────────────────────────────────────
-- After running Step 2, run this to verify duplicates are deactivated.

SELECT name, id, active
FROM staff
WHERE lower(trim(name)) IN (
  'jordan darnley', 'jordan darnely',
  'daniel goodfellow', 'dan goodfelow',
  'ethan teuma', 'ethan tuma', 'ethan tuema',
  'natasha zahra', 'tash zahra',
  'matthew constance', 'mathew constance'
)
ORDER BY lower(trim(name));
