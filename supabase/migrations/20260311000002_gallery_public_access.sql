-- ============================================
-- Migration: Make gallery publicly viewable, add expiry, allow anon uploads
-- ============================================

-- 1. Add expires_at column for 48-hour photo expiry
ALTER TABLE public.wedding_photos
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '48 hours');

-- Set expires_at for existing photos (give them 48h from now)
UPDATE public.wedding_photos SET expires_at = now() + interval '48 hours' WHERE expires_at IS NULL;

-- 2. Drop existing auth-only policies on wedding_photos
DROP POLICY IF EXISTS "Authenticated users can view wedding photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Authenticated users can upload their own photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.wedding_photos;

-- 3. Create new public-friendly policies
-- Anyone can view photos
CREATE POLICY "Anyone can view wedding photos"
ON public.wedding_photos
FOR SELECT
TO anon, authenticated
USING (true);

-- Anyone can upload photos (no user_id required for anonymous guests)
CREATE POLICY "Anyone can upload wedding photos"
ON public.wedding_photos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated (couple/admin) can update photos
CREATE POLICY "Authenticated can update wedding photos"
ON public.wedding_photos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated (couple/admin) can delete photos
CREATE POLICY "Authenticated can delete wedding photos"
ON public.wedding_photos
FOR DELETE
TO authenticated
USING (true);

-- 4. Drop existing auth-only storage policies
DROP POLICY IF EXISTS "Authenticated users can view wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own wedding photos storage" ON storage.objects;

-- 5. Create new public storage policies
-- Anyone can view/download photos
CREATE POLICY "Anyone can view wedding photos storage"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'wedding-photos');

-- Anyone can upload photos (use 'guest' folder for anonymous uploads)
CREATE POLICY "Anyone can upload wedding photos storage"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'wedding-photos');

-- Only authenticated can update storage objects
CREATE POLICY "Authenticated can update wedding photos storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'wedding-photos');

-- Only authenticated can delete storage objects
CREATE POLICY "Authenticated can delete wedding photos storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'wedding-photos');

-- 6. Update the upload limit trigger to work without auth
-- Remove user_id validation since guests upload anonymously
CREATE OR REPLACE FUNCTION public.check_photo_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count INTEGER;
BEGIN
  -- Just enforce a reasonable total limit per uploader name
  IF NEW.uploaded_by IS NOT NULL THEN
    SELECT COUNT(*) INTO total_count
    FROM public.wedding_photos
    WHERE uploaded_by = NEW.uploaded_by;

    IF total_count >= 10 THEN
      RAISE EXCEPTION 'Upload limit exceeded. Maximum 10 photos per guest.';
    END IF;
  END IF;

  -- Set expires_at if not provided
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = now() + interval '48 hours';
  END IF;

  RETURN NEW;
END;
$$;
