-- Add More Meal Credits for Testing
-- Run this in Supabase SQL Editor to give employees more credits

-- Clear existing credits (optional - only if you want to start fresh)
-- DELETE FROM meal_credits;

-- Add credits for next 7 days for all employees
-- This gives everyone lunch credits for the week

INSERT INTO meal_credits (employee_id, date, lunch_credit, ot_meal_credit)
SELECT 
    e.id as employee_id,
    date_series.date,
    1 as lunch_credit,  -- 1 lunch per day
    1 as ot_meal_credit -- 1 OT meal per day
FROM 
    employees e
CROSS JOIN (
    -- Generate dates for next 7 days
    SELECT 
        current_date + i as date
    FROM 
        generate_series(0, 6) as i
) as date_series
ON CONFLICT (employee_id, date) 
DO UPDATE SET
    lunch_credit = EXCLUDED.lunch_credit,
    ot_meal_credit = EXCLUDED.ot_meal_credit;

-- Verify credits added
SELECT 
    e.name,
    mc.date,
    mc.lunch_credit,
    mc.ot_meal_credit
FROM 
    meal_credits mc
JOIN 
    employees e ON mc.employee_id = e.id
WHERE 
    mc.date >= current_date
ORDER BY 
    e.name, mc.date;

-- Expected result: Should show 35 rows (5 employees × 7 days)
