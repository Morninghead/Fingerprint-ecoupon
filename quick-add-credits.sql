-- Quick setup for testing
-- This adds credits for all employees for the next 7 days

-- 1. Delete any existing credits
DELETE FROM meal_credits;

-- 2. Add credits for next 7 days
INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
SELECT 
  e.id,
  CURRENT_DATE + (n || ' days')::interval,
  true,
  true
FROM employees e
CROSS JOIN generate_series(0, 6) AS n;

-- 3. Verify the credits
SELECT 
  e.name,
  e.pin,
  mc.date,
  mc.lunch_available,
  mc.ot_meal_available
FROM meal_credits mc
JOIN employees e ON e.id = mc.employee_id
WHERE mc.date >= CURRENT_DATE
ORDER BY mc.date, e.pin;
