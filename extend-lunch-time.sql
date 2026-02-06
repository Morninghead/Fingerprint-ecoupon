-- Extend lunch time for testing
-- Run this in Supabase SQL Editor

UPDATE companies 
SET 
  lunch_time_start = '10:00',
  lunch_time_end = '15:00',
  ot_time_start = '15:00',
  ot_time_end = '20:00'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

-- Verify the change
SELECT name, lunch_time_start, lunch_time_end, ot_time_start, ot_time_end
FROM companies;
