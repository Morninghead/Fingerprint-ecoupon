-- Fingerprint Templates Table
-- Each employee can have up to 10 fingers (0-9)

CREATE TABLE IF NOT EXISTS fingerprint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  mdb_user_id INTEGER NOT NULL,
  employee_code TEXT NOT NULL,
  finger_id INTEGER NOT NULL CHECK (finger_id >= 0 AND finger_id <= 9),
  template_data TEXT NOT NULL, -- Base64 encoded binary
  template_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mdb_user_id, finger_id)
);

-- Indexes
CREATE INDEX idx_fp_employee ON fingerprint_templates(employee_id);
CREATE INDEX idx_fp_employee_code ON fingerprint_templates(employee_code);
CREATE INDEX idx_fp_mdb_user ON fingerprint_templates(mdb_user_id);

-- Comment
COMMENT ON TABLE fingerprint_templates IS 'ZKTeco fingerprint templates from MDB, SS21 format';
