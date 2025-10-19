-- Drop blocks and reports tables and related objects
-- Migration to remove blocking and reporting features

-- Drop RLS policies first
DROP POLICY IF EXISTS "users_can_view_own_blocks" ON blocks;
DROP POLICY IF EXISTS "users_can_block_others" ON blocks;
DROP POLICY IF EXISTS "users_can_unblock" ON blocks;
DROP POLICY IF EXISTS "users_can_submit_reports" ON reports;

-- Drop indexes
DROP INDEX IF EXISTS idx_blocks_blocked_id;

-- Drop tables
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS reports;
