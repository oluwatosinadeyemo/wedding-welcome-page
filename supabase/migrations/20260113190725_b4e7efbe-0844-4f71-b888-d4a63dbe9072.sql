-- First, drop existing permissive policies on wedding_photos table
DROP POLICY IF EXISTS "Anyone can view wedding photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Anyone can upload wedding photos" ON public.wedding_photos;

-- Add user_id column to track which authenticated user uploaded the photo
ALTER TABLE public.wedding_photos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a function to check upload limits (max 10 photos per user)
CREATE OR REPLACE FUNCTION public.check_photo_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  -- Count existing photos by this user
  SELECT COUNT(*) INTO photo_count
  FROM public.wedding_photos
  WHERE user_id = NEW.user_id;
  
  -- Limit to 10 photos per user
  IF photo_count >= 10 THEN
    RAISE EXCEPTION 'Upload limit exceeded. Maximum 10 photos per user.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for upload limit
DROP TRIGGER IF EXISTS enforce_photo_upload_limit ON public.wedding_photos;
CREATE TRIGGER enforce_photo_upload_limit
BEFORE INSERT ON public.wedding_photos
FOR EACH ROW
EXECUTE FUNCTION public.check_photo_upload_limit();

-- Create new secure RLS policies for wedding_photos table

-- Only authenticated users can view photos
CREATE POLICY "Authenticated users can view wedding photos"
ON public.wedding_photos
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can upload photos (with their user_id)
CREATE POLICY "Authenticated users can upload their own photos"
ON public.wedding_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Users can update their own photos"
ON public.wedding_photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON public.wedding_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload wedding photos storage" ON storage.objects;

-- Create secure storage policies

-- Only authenticated users can view photos in the bucket
CREATE POLICY "Authenticated users can view wedding photos storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'wedding-photos');

-- Only authenticated users can upload to the bucket (with folder structure by user_id)
CREATE POLICY "Authenticated users can upload wedding photos storage"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wedding-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own files
CREATE POLICY "Users can update their own wedding photos storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'wedding-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own files
CREATE POLICY "Users can delete their own wedding photos storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'wedding-photos' AND auth.uid()::text = (storage.foldername(name))[1]);