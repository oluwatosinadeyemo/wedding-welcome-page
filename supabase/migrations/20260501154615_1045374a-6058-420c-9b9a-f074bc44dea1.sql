-- Allow anyone (not just RSVP'd guests) to upload photos via the submit_guest_photo RPC
CREATE OR REPLACE FUNCTION public.submit_guest_photo(
  p_full_name text,
  p_file_path text,
  p_file_name text,
  p_caption text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_photo_id uuid;
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  INSERT INTO public.wedding_photos (file_path, file_name, uploaded_by, caption)
  VALUES (p_file_path, p_file_name, trim(p_full_name), p_caption)
  RETURNING id INTO v_photo_id;

  RETURN v_photo_id;
END;
$function$;

-- Increase the wedding-photos bucket file size limit to 50MB
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'wedding-photos';