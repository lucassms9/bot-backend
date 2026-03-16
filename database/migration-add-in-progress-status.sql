-- ================================================
-- MIGRATION: Add 'in_progress' status to bets table
-- ================================================
-- Bets that the user has confirmed placing at the bookmaker
-- and is now waiting for the match result.
-- Run this after migration-add-expired-status.sql

-- Drop the old constraint
ALTER TABLE bets DROP CONSTRAINT IF EXISTS chk_result_valid;

-- Add new constraint with 'in_progress' included
ALTER TABLE bets ADD CONSTRAINT chk_result_valid
  CHECK (result IN ('pending', 'in_progress', 'won', 'lost', 'partial', 'void', 'expired'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'chk_result_valid';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: in_progress status added to bets.result constraint';
END $$;
