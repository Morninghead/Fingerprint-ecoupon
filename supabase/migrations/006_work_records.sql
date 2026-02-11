-- Migration: Create shifts and work_records tables
-- Focus on Day shift (08:00-17:00) for meal credits

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ot_start_time TIME NOT NULL,  -- OT เริ่มนับหลังเวลานี้
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

-- Work records table (ผลการคำนวณ)
CREATE TABLE IF NOT EXISTS work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  work_date DATE NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  
  -- Scan times
  scan_in_id UUID REFERENCES attendance(id),
  scan_out_id UUID REFERENCES attendance(id),
  scan_in TIMESTAMPTZ,
  scan_out TIMESTAMPTZ,
  
  -- Calculated values (in minutes)
  working_minutes INTEGER DEFAULT 0,
  ot_minutes INTEGER DEFAULT 0,
  
  -- Skip break flags (HR sets these)
  skip_break_lunch BOOLEAN DEFAULT FALSE,  -- ผ่าเบรคเที่ยง = +60 min
  skip_break_ot BOOLEAN DEFAULT FALSE,      -- ผ่าเบรค OT = no 30-min grace
  
  -- Status
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

-- Comments
COMMENT ON TABLE work_records IS 'Calculated work hours from attendance scans';
COMMENT ON COLUMN work_records.ot_minutes IS 'OT in minutes, rounded down to 30-min blocks';
COMMENT ON COLUMN work_records.skip_break_lunch IS 'If true, add 60 min to working hours';
COMMENT ON COLUMN work_records.skip_break_ot IS 'If true, no 30-min grace period before OT';
