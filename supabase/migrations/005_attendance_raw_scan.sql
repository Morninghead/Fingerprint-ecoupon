-- Migration: Remove IN/OUT assumption, store raw scan data
-- Allow check_type to be NULL or 'SCAN' for later processing
-- This supports multiple shifts and complex schedules

-- Update check_type constraint to allow NULL and 'SCAN'
-- Note: This modifies the attendance table to be more flexible

ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS attendance_check_type_check;

-- Allow: NULL (no type), 'SCAN' (raw scan), 'IN', 'OUT', 'UNKNOWN'
-- NULL and 'SCAN' mean the record needs processing
-- 'IN', 'OUT' can be set after shift calculation
ALTER TABLE attendance 
ADD CONSTRAINT attendance_check_type_check 
CHECK (check_type IS NULL OR check_type IN ('SCAN', 'IN', 'OUT', 'UNKNOWN'));

-- Add column for raw state from device (for debugging/auditing)
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS raw_state INTEGER;

-- Add column for calculated check type (filled by shift analysis)
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS calculated_type TEXT CHECK (calculated_type IS NULL OR calculated_type IN ('IN', 'OUT'));

-- Add column for shift ID reference (when shift is determined)
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS shift_id UUID;

-- Comment explaining the workflow
COMMENT ON COLUMN attendance.check_type IS 'Type from sync: SCAN (raw), IN, OUT, UNKNOWN, or NULL';
COMMENT ON COLUMN attendance.raw_state IS 'Original state value from ZKTeco device (0=IN, 1=OUT, etc.)';
COMMENT ON COLUMN attendance.calculated_type IS 'Calculated IN/OUT based on shift analysis';
COMMENT ON COLUMN attendance.shift_id IS 'Reference to calculated shift (if any)';
