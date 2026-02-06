-- Update SSTH company lunch price to 45 baht
-- Run this in Supabase SQL Editor

-- Update all companies to have default 45 baht lunch price
UPDATE companies
SET lunch_price = 45, ot_meal_price = 45
WHERE lunch_price IS NULL OR lunch_price = 0;

-- Verify
SELECT code, name, lunch_price, ot_meal_price FROM companies ORDER BY code;
