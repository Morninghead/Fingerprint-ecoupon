-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  lunch_price DECIMAL(10,2) DEFAULT 45.00,
  ot_meal_price DECIMAL(10,2) DEFAULT 60.00,
  lunch_time_start TIME DEFAULT '11:00:00',
  lunch_time_end TIME DEFAULT '14:00:00',
  ot_time_start TIME DEFAULT '18:00:00',
  ot_time_end TIME DEFAULT '22:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin TEXT UNIQUE NOT NULL,
  fingerprint_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Credits (Daily)
CREATE TABLE meal_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  lunch_available BOOLEAN DEFAULT TRUE,
  ot_meal_available BOOLEAN DEFAULT FALSE,
  UNIQUE(employee_id, date)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  company_id UUID REFERENCES companies(id),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('LUNCH', 'OT_MEAL')),
  amount DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  status TEXT DEFAULT 'VALID' CHECK (status IN ('VALID', 'FLAGGED'))
);

-- Daily Reports (Aggregated)
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  date DATE NOT NULL,
  lunch_count INTEGER DEFAULT 0,
  ot_meal_count INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  employee_list JSONB DEFAULT '[]',
  UNIQUE(company_id, date)
);

-- Indexes
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_meal_credits_employee ON meal_credits(employee_id);
CREATE INDEX idx_meal_credits_date ON meal_credits(date);
CREATE INDEX idx_transactions_employee ON transactions(employee_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_daily_reports_company_date ON daily_reports(company_id, date);
