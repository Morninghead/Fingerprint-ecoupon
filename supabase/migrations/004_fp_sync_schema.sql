-- Migration: Add branches, fingerprint_templates, and attendance tables
-- Run this after 001_initial_schema.sql

-- Branches (สาขา)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  location TEXT,
  device_type TEXT DEFAULT 'ZKTeco',
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter employees table to add new columns
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS mdb_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id),
  ADD COLUMN IF NOT EXISTS prefix_group TEXT;

-- Create index on employee_code
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_mdb_user_id ON employees(mdb_user_id);

-- Fingerprint Templates (separate table for multiple fingers)
CREATE TABLE IF NOT EXISTS fingerprint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  finger_id INTEGER NOT NULL CHECK (finger_id >= 0 AND finger_id <= 9),
  template_data TEXT NOT NULL,
  template_version TEXT DEFAULT '10',
  template_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, finger_id)
);

CREATE INDEX IF NOT EXISTS idx_fp_templates_employee ON fingerprint_templates(employee_id);

-- Attendance (เวลาเข้า-ออก sync จาก ZKTeco)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  check_time TIMESTAMPTZ NOT NULL,
  check_type TEXT CHECK (check_type IN ('IN', 'OUT', 'UNKNOWN')),
  verify_type TEXT, -- fingerprint, card, password, etc.
  device_sn TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, check_time)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_time ON attendance(check_time);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance(branch_id);

-- Function to auto-create meal credit when employee checks in
CREATE OR REPLACE FUNCTION auto_create_meal_credit()
RETURNS TRIGGER AS $$
DECLARE
  check_date DATE;
  emp_company_id UUID;
BEGIN
  -- Only process check-in (first check of the day)
  check_date := DATE(NEW.check_time AT TIME ZONE 'Asia/Bangkok');
  
  -- Get employee's company
  SELECT company_id INTO emp_company_id 
  FROM employees 
  WHERE id = NEW.employee_id;
  
  -- Create meal credit if not exists
  INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
  VALUES (NEW.employee_id, check_date, TRUE, FALSE)
  ON CONFLICT (employee_id, date) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create meal credit on attendance
DROP TRIGGER IF EXISTS trigger_auto_meal_credit ON attendance;
CREATE TRIGGER trigger_auto_meal_credit
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_meal_credit();

-- Sync log (track sync history)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  sync_type TEXT NOT NULL, -- 'attendance', 'employees', 'fingerprints'
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS Policies for new tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fingerprint_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow all for development (adjust for production)
CREATE POLICY "Allow all branches" ON branches FOR ALL USING (true);
CREATE POLICY "Allow all fingerprint_templates" ON fingerprint_templates FOR ALL USING (true);
CREATE POLICY "Allow all attendance" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow all sync_logs" ON sync_logs FOR ALL USING (true);

-- Update employees RLS to allow reading by employee_code
DROP POLICY IF EXISTS "Allow reading employees" ON employees;
CREATE POLICY "Allow reading employees" ON employees FOR SELECT USING (true);
