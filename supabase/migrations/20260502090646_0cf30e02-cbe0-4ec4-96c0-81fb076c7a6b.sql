-- Drop the trigger that enforces user_id = auth.uid() (blocks anonymous uploads)
DROP TRIGGER IF EXISTS check_photo_upload_limit_trigger ON public.wedding_photos;
DROP TRIGGER IF EXISTS enforce_photo_upload_limit ON public.wedding_photos;
DROP TRIGGER IF EXISTS check_photo_upload_limit ON public.wedding_photos;

-- Ensure storage policies allow anonymous uploads to wedding-photos bucket
DROP POLICY IF EXISTS "Anyone can upload wedding photos" ON storage.objects;
CREATE POLICY "Anyone can upload wedding photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'wedding-photos');

DROP POLICY IF EXISTS "Anyone can view wedding photos" ON storage.objects;
CREATE POLICY "Anyone can view wedding photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'wedding-photos');