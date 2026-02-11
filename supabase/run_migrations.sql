-- Combined Migration: 005 + 006
-- Run this in Supabase SQL Editor

-- =============================================
-- 005: Attendance Raw Scan Updates
-- =============================================

-- Update check_type constraint to allow NULL and 'SCAN'
ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS attendance_check_type_check;

ALTER TABLE attendance 
ADD CONSTRAINT attendance_check_type_check 
CHECK (check_type IS NULL OR check_type IN ('SCAN', 'IN', 'OUT', 'UNKNOWN', 'I', 'O'));

-- Add columns for raw data and calculated values
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS raw_state INTEGER;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS calculated_type TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_id UUID;

-- =============================================
-- 006: Shifts and Work Records
-- =============================================

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ot_start_time TIME NOT NULL,
  crosses_midnight BOOLEAN DEFAULT FALSE,
  break_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 3 shifts
INSERT INTO shifts (name, start_time, end_time, ot_start_time, crosses_midnight, break_minutes) VALUES
  ('Day', '08:00', '17:00', '17:30', FALSE, 60),
  ('Evening', '17:00', '02:00', '02:30', TRUE, 60),
  ('Night', '20:00', '05:00', '05:30', TRUE, 60)
ON CONFLICT (name) DO NOTHING;

-- Work records table
CREATE TABLE IF NOT EXISTS work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  work_date DATE NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  scan_in_id UUID,
  scan_out_id UUID,
  scan_in TIMESTAMPTZ,
  scan_out TIMESTAMPTZ,
  working_minutes INTEGER DEFAULT 0,
  ot_minutes INTEGER DEFAULT 0,
  skip_break_lunch BOOLEAN DEFAULT FALSE,
  skip_break_ot BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'incomplete', 'reviewed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_code, work_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_records_employee ON work_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_records_date ON work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_work_records_shift ON work_records(shift_id);
CREATE INDEX IF NOT EXISTS idx_work_records_status ON work_records(status);

-- Done!
SELECT 'Migration complete!' as status;
SELECT * FROM shifts;
