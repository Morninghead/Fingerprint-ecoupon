-- Create attendance table for ZKTeco sync
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code VARCHAR(20) NOT NULL,
  check_time TIMESTAMPTZ NOT NULL,
  check_type VARCHAR(1), -- I=In, O=Out
  device_ip VARCHAR(15),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(employee_code, check_time, device_ip)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_time ON attendance(check_time);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_time ON attendance(employee_code, check_time DESC);
