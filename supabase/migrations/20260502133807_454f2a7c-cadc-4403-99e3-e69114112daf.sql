-- Allow public deletion of wedding photos and remove expiry
CREATE POLICY "Public can delete photos"
ON public.wedding_photos
FOR DELETE
TO anon, authenticated
USING (true);

-- Update SELECT policy to show all photos (no expiry filter)
DROP POLICY IF EXISTS "Public can view non-expired photos" ON public.wedding_photos;
CREATE POLICY "Public can view all photos"
ON public.wedding_photos
FOR SELECT
TO anon, authenticated
USING (true);

-- Stop auto-setting expiry on new uploads
CREATE OR REPLACE FUNCTION public.set_photo_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.expires_at := NULL;
  RETURN NEW;
END;
$function$;

-- Clear existing expiry timestamps so older photos remain visible
UPDATE public.wedding_photos SET expires_at = NULL;

-- Allow public deletion of photo files in storage
CREATE POLICY "Public can delete wedding photos in storage"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'wedding-photos');