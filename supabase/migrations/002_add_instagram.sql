-- Add Instagram username to profiles
-- This allows users to share their Instagram with matches

ALTER TABLE public.profiles ADD COLUMN instagram_username TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.instagram_username IS 'Instagram username (without @) that will be shared with matched users';
