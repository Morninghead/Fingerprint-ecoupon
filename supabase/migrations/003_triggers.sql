-- Function to create meal credits for new employees
CREATE OR REPLACE FUNCTION create_meal_credits_for_employee()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
  SELECT
    NEW.id,
    CURRENT_DATE + generate_series(0, 30),
    TRUE,
    FALSE
  ON CONFLICT (employee_id, date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on employee insert
DROP TRIGGER IF EXISTS trigger_create_meal_credits;
CREATE TRIGGER trigger_create_meal_credits
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION create_meal_credits_for_employee();

-- Trigger to create company on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company for the user
  INSERT INTO companies (id, name, admin_id, lunch_price, ot_meal_price, lunch_time_start, lunch_time_end, ot_time_start, ot_time_end)
  VALUES (
    gen_random_uuid(),
    'New Company',
    NEW.id,
    45.00,
    60.00,
    '11:00:00',
    '14:00:00',
    '18:00:00',
    '22:00:00'
  )
  RETURNING new_company_id INTO new_company_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_signup;
CREATE TRIGGER on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
