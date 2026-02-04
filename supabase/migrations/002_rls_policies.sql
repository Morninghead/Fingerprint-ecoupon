-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Companies: Admin can see/edit their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admin can update own company"
  ON companies FOR UPDATE
  USING (auth.uid() = admin_id);

-- Employees: Only employees from same company
CREATE POLICY "View own company employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = employees.company_id
      AND companies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Manage own company employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = employees.company_id
      AND companies.admin_id = auth.uid()
    )
  );

-- Meal Credits: Only via company
CREATE POLICY "View own company meal credits"
  ON meal_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = (
        SELECT company_id FROM employees WHERE employees.id = meal_credits.employee_id
      )
      AND companies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Manage own company meal credits"
  ON meal_credits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = (
        SELECT company_id FROM employees WHERE employees.id = meal_credits.employee_id
      )
      AND companies.admin_id = auth.uid()
    )
  );

-- Transactions: Only via company
CREATE POLICY "View own company transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = transactions.company_id
      AND companies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Manage own company transactions"
  ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = transactions.company_id
      AND companies.admin_id = auth.uid()
    )
  );

-- Daily Reports: Only via company
CREATE POLICY "View own company reports"
  ON daily_reports FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE admin_id = auth.uid()
  ));
