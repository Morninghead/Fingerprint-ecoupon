-- Seed data for E-Coupon PWA System
-- This file will be used to populate initial data after schema is applied

-- Note: Admin user should be created via Supabase Auth first
-- The admin_id will be referenced after user registration

-- Example company (admin_id should be replaced with actual auth.users.id)
INSERT INTO companies (id, name, admin_id, lunch_price, ot_meal_price, lunch_time_start, lunch_time_end, ot_time_start, ot_time_end, created_at)
VALUES (
  gen_random_uuid(),
  'Demo Company',
  NULL, -- Will be updated after admin user creation
  45.00,
  60.00,
  '11:00:00',
  '14:00:00',
  '18:00:00',
  '22:00:00',
  NOW()
);

-- Example employees (company_id should reference the company created above)
-- Note: These will be inserted after company_id is known
-- INSERT INTO employees (id, company_id, name, pin, fingerprint_template, created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), '<company_id>', 'John Doe', '1001', NULL, NOW(), NOW()),
--   (gen_random_uuid(), '<company_id>', 'Jane Smith', '1002', NULL, NOW(), NOW());

-- Meal credits will be automatically created by the trigger when employees are inserted
