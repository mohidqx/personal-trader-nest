-- Add username field to profiles table (nullable first)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Generate unique usernames for existing users
UPDATE public.profiles 
SET username = 'user_' || substring(id::text from 1 for 8)
WHERE username IS NULL;

-- Now add unique constraint and make it required
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;

-- Update the handle_new_user function to require username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with username from metadata
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8))
  );
  
  -- Insert wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;