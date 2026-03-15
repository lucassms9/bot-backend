-- ================================================
-- MIGRATION: Add 'void' status to bets table
-- ================================================
-- This migration adds 'void' as a valid bet result status
-- Run this after schema.sql and migration-auth.sql

-- Drop the old constraint
ALTER TABLE bets DROP CONSTRAINT IF EXISTS chk_result_valid;

-- Add new constraint with 'void' included
ALTER TABLE bets ADD CONSTRAINT chk_result_valid 
  CHECK (result IN ('pending', 'won', 'lost', 'partial', 'void'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'chk_result_valid';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: void status added to bets.result constraint';
END $$;
