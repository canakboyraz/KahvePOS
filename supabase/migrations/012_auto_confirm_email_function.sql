-- Auto-confirm email for new users (for @kahvepos.local domain users)
-- This function allows new users to login immediately without email confirmation
-- Only works for users with @kahvepos.local or @kahvepos.com email domains

CREATE OR REPLACE FUNCTION auth.auto_confirm_kahvepos_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-confirm users from our local domains
  IF NEW.email LIKE '%@kahvepos.local' OR NEW.email LIKE '%@kahvepos.com' THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-confirm email on user creation
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.auto_confirm_kahvepos_users();

-- Alternative: Direct update function that can be called after signup
CREATE OR REPLACE FUNCTION confirm_user_email(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE email = user_email;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT) TO anon;
