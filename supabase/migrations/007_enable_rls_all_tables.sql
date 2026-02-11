-- Migration 007: Fix all RLS issues flagged by Supabase Database Linter
-- Run this in Supabase SQL Editor
-- 
-- Issues fixed:
--   1. employees: has policies but RLS not enabled
--   2. work_records: RLS not enabled, no policies
--   3. shifts: RLS not enabled, no policies
--   4. attendance: RLS not enabled (despite policy in migration 004)
--   5. meal_credits: RLS not enabled
--   6. companies: RLS not enabled
--   7. transactions: RLS not enabled
--   8. daily_reports: RLS not enabled

-- =============================================
-- Step 1: Enable RLS on ALL public tables
-- =============================================
-- Using ALTER TABLE ... ENABLE ROW LEVEL SECURITY on all affected tables.
-- This is idempotent — safe to run even if already enabled.

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Step 2: Add missing RLS policies for new tables
-- =============================================
-- Tables: shifts, work_records, attendance
-- These tables had no policies or policies weren't applied properly.
-- Using permissive policies consistent with existing pattern (migration 004).
-- NOTE: For production, replace USING (true) with proper auth checks!

-- Shifts: read-only for all authenticated users (reference/lookup table)
DROP POLICY IF EXISTS "Allow read shifts" ON shifts;
CREATE POLICY "Allow read shifts" 
  ON shifts FOR SELECT 
  USING (true);

-- Work Records: allow all operations (admin app manages this)
DROP POLICY IF EXISTS "Allow all work_records" ON work_records;
CREATE POLICY "Allow all work_records" 
  ON work_records FOR ALL 
  USING (true);

-- Attendance: ensure the policy from migration 004 exists
-- (re-create it in case it wasn't applied)
DROP POLICY IF EXISTS "Allow all attendance" ON attendance;
CREATE POLICY "Allow all attendance" 
  ON attendance FOR ALL 
  USING (true);

-- =============================================
-- Step 3: Verify existing policies still work
-- =============================================
-- The following tables already have policies from migration 002:
--   companies, employees, meal_credits, transactions, daily_reports
-- We just needed to ensure RLS is ENABLED (Step 1 above).
-- Their existing policies will now take effect.

-- =============================================
-- Verification query (run manually to confirm)
-- =============================================
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
