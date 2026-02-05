-- Production Seed Data for FP-E-Coupon System
-- Run this in Supabase SQL Editor after deployment

-- Step 1: Create a test company
-- Note: You'll need to create an admin user first via Supabase Auth UI
-- Then replace NULL below with auth.users.id

INSERT INTO companies (id, name, admin_id, lunch_price, ot_meal_price, lunch_time_start, lunch_time_end, ot_time_start, ot_time_end)
VALUES (
  'c0000000-0000-0000-0000-000000000001'::uuid, -- Fixed UUID for easy reference
  'Demo Company',
  NULL, -- TODO: Replace with actual admin user ID from auth.users
  45.00,
  60.00,
  '11:00:00',
  '14:00:00',
  '18:00:00',
  '22:00:00'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lunch_price = EXCLUDED.lunch_price,
  ot_meal_price = EXCLUDED.ot_meal_price;

-- Step 2: Create test employees
INSERT INTO employees (id, company_id, name, pin, fingerprint_template)
VALUES
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'John Doe', '1001', 'mock_fingerprint_template_001'),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'Jane Smith', '1002', 'mock_fingerprint_template_002'),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'Bob Wilson', '1003', 'mock_fingerprint_template_003'),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'Alice Johnson', '1004', 'mock_fingerprint_template_004'),
  ('e0000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'Charlie Brown', '1005', 'mock_fingerprint_template_005')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  pin = EXCLUDED.pin;

-- Step 3: Create meal credits for today
INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
SELECT 
  id, 
  CURRENT_DATE, 
  TRUE,  -- Lunch available
  FALSE  -- OT meal not available by default
FROM employees
WHERE company_id = 'c0000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (employee_id, date) DO UPDATE SET
  lunch_available = EXCLUDED.lunch_available,
  ot_meal_available = EXCLUDED.ot_meal_available;

-- Step 4: Create meal credits for the next 7 days (optional)
INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
SELECT 
  e.id, 
  CURRENT_DATE + i,
  TRUE,
  FALSE
FROM employees e
CROSS JOIN generate_series(1, 7) AS i
WHERE e.company_id = 'c0000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (employee_id, date) DO NOTHING;

-- Verification queries
SELECT 'Companies:' AS section, count(*) AS count FROM companies
UNION ALL
SELECT 'Employees:', count(*) FROM employees
UNION ALL
SELECT 'Meal Credits (Today):', count(*) FROM meal_credits WHERE date = CURRENT_DATE
UNION ALL
SELECT 'Meal Credits (Total):', count(*) FROM meal_credits;

-- Show created data
SELECT 
  c.name AS company,
  e.name AS employee,
  e.pin,
  mc.date,
  mc.lunch_available,
  mc.ot_meal_available
FROM companies c
JOIN employees e ON e.company_id = c.id
LEFT JOIN meal_credits mc ON mc.employee_id = e.id AND mc.date = CURRENT_DATE
ORDER BY e.name;
