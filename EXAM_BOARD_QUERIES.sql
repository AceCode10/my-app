-- ============================================
-- EXAM BOARD SYSTEM - USEFUL QUERIES
-- Quick reference for common operations
-- ============================================

-- ============================================
-- 1. VERIFICATION QUERIES
-- ============================================

-- Check all exam boards
SELECT * FROM exam_boards ORDER BY display_order;

-- Check user preferences
SELECT 
    u.id,
    u.email,
    u.preferred_exam_board_id,
    eb.name as preferred_board,
    u.onboarding_completed,
    u.show_all_exam_boards
FROM users u
LEFT JOIN exam_boards eb ON eb.id = u.preferred_exam_board_id
ORDER BY u.created_at DESC
LIMIT 20;

-- Check content distribution by exam board
SELECT 
    eb.name as exam_board,
    COUNT(DISTINCT s.id) as subjects,
    COUNT(DISTINCT t.id) as topics,
    COUNT(DISTINCT q.id) as questions,
    COUNT(DISTINCT pp.id) as past_papers
FROM exam_boards eb
LEFT JOIN subjects s ON s.exam_board_id = eb.id
LEFT JOIN topics t ON t.exam_board_id = eb.id
LEFT JOIN questions q ON q.exam_board_id = eb.id
LEFT JOIN past_papers pp ON pp.exam_board_id = eb.id
GROUP BY eb.id, eb.name
ORDER BY eb.display_order;

-- ============================================
-- 2. USER MANAGEMENT
-- ============================================

-- Set user's preferred exam board
UPDATE users 
SET preferred_exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE'),
    onboarding_completed = true,
    show_all_exam_boards = false
WHERE id = 'user-uuid-here';

-- Mark onboarding as completed
UPDATE users 
SET onboarding_completed = true 
WHERE id = 'user-uuid-here';

-- Reset user's exam board preference
UPDATE users 
SET preferred_exam_board_id = NULL,
    show_all_exam_boards = true
WHERE id = 'user-uuid-here';

-- Find users by exam board preference
SELECT u.email, eb.name as preferred_board
FROM users u
INNER JOIN exam_boards eb ON eb.id = u.preferred_exam_board_id
WHERE eb.code = 'CIE';

-- ============================================
-- 3. CONTENT MANAGEMENT
-- ============================================

-- Assign exam board to subject
UPDATE subjects 
SET exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
WHERE slug = 'mathematics';

-- Assign exam board to all subjects without one
UPDATE subjects 
SET exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
WHERE exam_board_id IS NULL;

-- Find content without exam board assignment
SELECT 'subjects' as type, COUNT(*) as count FROM subjects WHERE exam_board_id IS NULL
UNION ALL
SELECT 'topics', COUNT(*) FROM topics WHERE exam_board_id IS NULL
UNION ALL
SELECT 'questions', COUNT(*) FROM questions WHERE exam_board_id IS NULL
UNION ALL
SELECT 'past_papers', COUNT(*) FROM past_papers WHERE exam_board_id IS NULL;

-- Get subjects with their exam boards
SELECT 
    s.name as subject_name,
    eb.name as exam_board,
    s.status,
    s.created_at
FROM subjects s
LEFT JOIN exam_boards eb ON eb.id = s.exam_board_id
ORDER BY s.name;

-- ============================================
-- 4. MULTI-BOARD CONTENT
-- ============================================

-- Assign content to multiple exam boards
INSERT INTO content_exam_boards (content_type, content_id, exam_board_id)
VALUES 
    ('subject', 'subject-uuid-here', (SELECT id FROM exam_boards WHERE code = 'CIE')),
    ('subject', 'subject-uuid-here', (SELECT id FROM exam_boards WHERE code = 'EDEXCEL'));

-- Get all exam boards for a piece of content
SELECT 
    ceb.content_type,
    ceb.content_id,
    eb.code,
    eb.name
FROM content_exam_boards ceb
INNER JOIN exam_boards eb ON eb.id = ceb.exam_board_id
WHERE ceb.content_id = 'content-uuid-here';

-- Find content belonging to multiple exam boards
SELECT 
    content_type,
    content_id,
    COUNT(*) as board_count,
    STRING_AGG(eb.name, ', ') as boards
FROM content_exam_boards ceb
INNER JOIN exam_boards eb ON eb.id = ceb.exam_board_id
GROUP BY content_type, content_id
HAVING COUNT(*) > 1;

-- Remove multi-board assignments for content
DELETE FROM content_exam_boards 
WHERE content_type = 'subject' 
AND content_id = 'subject-uuid-here';

-- ============================================
-- 5. FILTERING QUERIES
-- ============================================

-- Get subjects for specific exam board
SELECT * FROM subjects 
WHERE exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
AND status = 'published'
ORDER BY display_order;

-- Get questions for specific exam board and subject
SELECT 
    q.*,
    s.name as subject_name,
    t.name as topic_name,
    eb.name as exam_board
FROM questions q
INNER JOIN subjects s ON s.id = q.subject_id
LEFT JOIN topics t ON t.id = q.topic_id
INNER JOIN exam_boards eb ON eb.id = q.exam_board_id
WHERE q.exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
AND q.subject_id = 'subject-uuid-here'
AND q.status = 'published';

-- Get past papers for exam board and year
SELECT 
    pp.*,
    s.name as subject_name,
    eb.name as exam_board
FROM past_papers pp
INNER JOIN subjects s ON s.id = pp.subject_id
INNER JOIN exam_boards eb ON eb.id = pp.exam_board_id
WHERE pp.exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
AND pp.year = 2024
AND pp.status = 'published'
ORDER BY pp.paper_number;

-- ============================================
-- 6. ANALYTICS
-- ============================================

-- Count users by exam board preference
SELECT 
    eb.name as exam_board,
    COUNT(u.id) as user_count,
    ROUND(COUNT(u.id) * 100.0 / SUM(COUNT(u.id)) OVER (), 2) as percentage
FROM exam_boards eb
LEFT JOIN users u ON u.preferred_exam_board_id = eb.id
GROUP BY eb.id, eb.name
ORDER BY user_count DESC;

-- Users who completed onboarding
SELECT 
    COUNT(*) FILTER (WHERE onboarding_completed = true) as completed,
    COUNT(*) FILTER (WHERE onboarding_completed = false) as not_completed,
    COUNT(*) as total
FROM users;

-- Content creation by exam board over time
SELECT 
    eb.name as exam_board,
    DATE_TRUNC('month', s.created_at) as month,
    COUNT(*) as subjects_created
FROM subjects s
INNER JOIN exam_boards eb ON eb.id = s.exam_board_id
WHERE s.created_at >= NOW() - INTERVAL '6 months'
GROUP BY eb.name, DATE_TRUNC('month', s.created_at)
ORDER BY month DESC, eb.name;

-- ============================================
-- 7. MAINTENANCE
-- ============================================

-- Add new exam board
INSERT INTO exam_boards (code, name, full_name, description, display_order)
VALUES ('IB', 'IB', 'International Baccalaureate', 'IB Diploma Programme', 6);

-- Update exam board details
UPDATE exam_boards 
SET description = 'Updated description',
    logo_url = 'https://example.com/logo.png'
WHERE code = 'CIE';

-- Deactivate exam board (soft delete)
UPDATE exam_boards 
SET is_active = false 
WHERE code = 'OLD_BOARD';

-- Reactivate exam board
UPDATE exam_boards 
SET is_active = true 
WHERE code = 'OLD_BOARD';

-- Merge exam boards (move content from one to another)
DO $$
DECLARE
    old_board_id UUID;
    new_board_id UUID;
BEGIN
    SELECT id INTO old_board_id FROM exam_boards WHERE code = 'OLD_BOARD';
    SELECT id INTO new_board_id FROM exam_boards WHERE code = 'NEW_BOARD';
    
    -- Update all content
    UPDATE subjects SET exam_board_id = new_board_id WHERE exam_board_id = old_board_id;
    UPDATE topics SET exam_board_id = new_board_id WHERE exam_board_id = old_board_id;
    UPDATE questions SET exam_board_id = new_board_id WHERE exam_board_id = old_board_id;
    UPDATE past_papers SET exam_board_id = new_board_id WHERE exam_board_id = old_board_id;
    
    -- Update user preferences
    UPDATE users SET preferred_exam_board_id = new_board_id WHERE preferred_exam_board_id = old_board_id;
    
    -- Deactivate old board
    UPDATE exam_boards SET is_active = false WHERE id = old_board_id;
END $$;

-- ============================================
-- 8. BULK OPERATIONS
-- ============================================

-- Bulk assign exam board to subjects by name pattern
UPDATE subjects 
SET exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
WHERE name ILIKE '%IGCSE%'
AND exam_board_id IS NULL;

-- Copy content to another exam board
INSERT INTO content_exam_boards (content_type, content_id, exam_board_id)
SELECT 
    'subject',
    s.id,
    (SELECT id FROM exam_boards WHERE code = 'EDEXCEL')
FROM subjects s
WHERE s.exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE')
AND NOT EXISTS (
    SELECT 1 FROM content_exam_boards ceb
    WHERE ceb.content_id = s.id
    AND ceb.content_type = 'subject'
    AND ceb.exam_board_id = (SELECT id FROM exam_boards WHERE code = 'EDEXCEL')
);

-- ============================================
-- 9. DEBUGGING
-- ============================================

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('exam_boards', 'subjects', 'topics', 'questions', 'past_papers')
ORDER BY tablename, policyname;

-- Check if user can see content
SELECT 
    s.name as subject,
    s.exam_board_id,
    eb.name as board,
    u.preferred_exam_board_id,
    u.show_all_exam_boards,
    CASE 
        WHEN u.show_all_exam_boards THEN 'Visible (show all)'
        WHEN s.exam_board_id = u.preferred_exam_board_id THEN 'Visible (match)'
        WHEN s.exam_board_id IS NULL THEN 'Visible (no board)'
        ELSE 'Hidden'
    END as visibility
FROM subjects s
LEFT JOIN exam_boards eb ON eb.id = s.exam_board_id
CROSS JOIN users u
WHERE u.id = 'user-uuid-here'
AND s.status = 'published'
ORDER BY s.name;

-- Test exam board filter function
SELECT get_user_exam_board_filter('user-uuid-here');

-- ============================================
-- 10. CLEANUP
-- ============================================

-- Remove orphaned multi-board assignments
DELETE FROM content_exam_boards ceb
WHERE NOT EXISTS (
    SELECT 1 FROM subjects WHERE id = ceb.content_id AND ceb.content_type = 'subject'
)
AND NOT EXISTS (
    SELECT 1 FROM topics WHERE id = ceb.content_id AND ceb.content_type = 'topic'
)
AND NOT EXISTS (
    SELECT 1 FROM questions WHERE id = ceb.content_id AND ceb.content_type = 'question'
)
AND NOT EXISTS (
    SELECT 1 FROM past_papers WHERE id = ceb.content_id AND ceb.content_type = 'paper'
);

-- Reset all onboarding status (for testing)
-- WARNING: Use with caution!
-- UPDATE users SET onboarding_completed = false;

-- ============================================
-- END OF QUERIES
-- ============================================
