-- Temporarily disable the trigger to test if it's causing the hang
-- Run this to test, then re-enable if needed

DROP TRIGGER IF EXISTS calculate_test_totals_trigger ON tests;

-- After testing, if this fixes the issue, we'll need to debug the trigger function
-- To re-enable later, run:
-- CREATE TRIGGER calculate_test_totals_trigger
-- BEFORE INSERT OR UPDATE OF sections ON tests
-- FOR EACH ROW EXECUTE FUNCTION calculate_test_totals();
