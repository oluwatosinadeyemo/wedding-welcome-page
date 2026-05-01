
-- Make wedding-photos bucket public for viewing
UPDATE storage.buckets SET public = true WHERE id = 'wedding-photos';

-- Drop authenticated-only storage policies and replace with public/guest policies
DROP POLICY IF EXISTS "Authenticated users can view wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own wedding photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own wedding photos storage" ON storage.objects;

CREATE POLICY "Public can view wedding photos storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'wedding-photos');

CREATE POLICY "Anyone can upload to guest folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wedding-photos' AND (storage.foldername(name))[1] = 'guest');

-- Allow public select on wedding_photos (already exists for non-expired); drop authenticated-only one
DROP POLICY IF EXISTS "Authenticated users can view wedding photos" ON public.wedding_photos;

-- RPC: submit a guest photo, gated by an existing RSVP (yes/maybe) for that full_name
CREATE OR REPLACE FUNCTION public.submit_guest_photo(
  p_full_name text,
  p_file_path text,
  p_file_name text,
  p_caption text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_exists boolean;
  v_photo_id uuid;
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rsvps r
    JOIN public.guests g ON g.id = r.guest_id
    WHERE lower(trim(g.full_name)) = lower(trim(p_full_name))
      AND r.attending IN ('yes', 'maybe')
  ) INTO v_guest_exists;

  IF NOT v_guest_exists THEN
    RAISE EXCEPTION 'Only guests who have RSVP''d can upload photos';
  END IF;

  INSERT INTO public.wedding_photos (file_path, file_name, uploaded_by, caption)
  VALUES (p_file_path, p_file_name, trim(p_full_name), p_caption)
  RETURNING id INTO v_photo_id;

  RETURN v_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_photo(text, text, text, text) TO anon, authenticated;
