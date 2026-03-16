-- ================================================
-- MIGRATION: Add 'expired' status to bets table
-- ================================================
-- Bets that are still PENDING but whose event dates are in the past
-- (d-1 or older) are automatically expired by the cron.
-- Run this after migration-add-void-status.sql

-- Drop the old constraint
ALTER TABLE bets DROP CONSTRAINT IF EXISTS chk_result_valid;

-- Add new constraint with 'expired' included
ALTER TABLE bets ADD CONSTRAINT chk_result_valid
  CHECK (result IN ('pending', 'won', 'lost', 'partial', 'void', 'expired'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'chk_result_valid';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: expired status added to bets.result constraint';
END $$;
