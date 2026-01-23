-- Find what's blocking the deletion of user 2ba67cd4-d88b-4cbf-8b8e-899b78509d66
-- This will show all tables that have references to this user

DO $$
DECLARE
  target_user_id UUID := '2ba67cd4-d88b-4cbf-8b8e-899b78509d66';
  table_name TEXT;
  column_name TEXT;
  row_count INTEGER;
  sql_query TEXT;
BEGIN
  RAISE NOTICE 'Searching for references to user: %', target_user_id;
  RAISE NOTICE '========================================';
  
  -- Loop through all tables and columns that might reference the user
  FOR table_name, column_name IN
    SELECT t.table_name, c.column_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND c.column_name IN ('user_id', 'teacher_id', 'student_id', 'sender_id', 'recipient_id', 'created_by', 'updated_by', 'approved_by', 'owner_id')
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    BEGIN
      sql_query := format('SELECT COUNT(*) FROM %I WHERE %I = $1', table_name, column_name);
      EXECUTE sql_query INTO row_count USING target_user_id;
      
      IF row_count > 0 THEN
        RAISE NOTICE '❌ Table: % (column: %) has % rows', table_name, column_name, row_count;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip tables that cause errors
      NULL;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Search completed';
END $$;
