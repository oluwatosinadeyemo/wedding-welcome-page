-- Fix 1: Make the wedding-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'wedding-photos';

-- Fix 2: Update the check_photo_upload_limit function to validate user_id matches auth.uid()
CREATE OR REPLACE FUNCTION public.check_photo_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  -- Defense in depth: Validate that user_id matches the authenticated user
  IF NEW.user_id IS NULL OR NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match the authenticated user';
  END IF;
  
  -- Count existing photos for this user
  SELECT COUNT(*) INTO photo_count
  FROM public.wedding_photos
  WHERE user_id = NEW.user_id;
  
  -- Check if limit exceeded (10 photos per user)
  IF photo_count >= 10 THEN
    RAISE EXCEPTION 'Upload limit exceeded. Maximum 10 photos per user allowed.';
  END IF;
  
  RETURN NEW;
END;
$$;