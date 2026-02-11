-- Migration 008: Fix employee_code UNIQUE constraint
-- Run this in Supabase SQL Editor
--
-- Problem: Migration 004 used ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE
-- but if the column already existed (without UNIQUE), it was skipped entirely.
-- This causes upsert with onConflict: 'employee_code' to fail every time.

-- =============================================
-- Step 1: Check for duplicates first
-- =============================================
-- Show any duplicate employee_codes (run this SELECT first to review)
-- SELECT employee_code, COUNT(*) as cnt 
-- FROM employees 
-- WHERE employee_code IS NOT NULL 
-- GROUP BY employee_code 
-- HAVING COUNT(*) > 1;

-- =============================================
-- Step 2: Handle duplicates if any exist
-- =============================================
-- Keep only the NEWEST record for each duplicate employee_code
-- Delete older duplicates (by created_at)
DELETE FROM employees a
USING employees b
WHERE a.employee_code = b.employee_code
  AND a.employee_code IS NOT NULL
  AND a.created_at < b.created_at;

-- =============================================
-- Step 3: Add UNIQUE constraint
-- =============================================
-- Drop the index if it exists (from migration 004) to avoid conflict
DROP INDEX IF EXISTS idx_employees_code;

-- Add the UNIQUE constraint (this also creates an index)
ALTER TABLE employees 
  ADD CONSTRAINT employees_employee_code_unique UNIQUE (employee_code);

-- =============================================
-- Verification
-- =============================================
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'employees'::regclass 
  AND conname LIKE '%employee_code%';
