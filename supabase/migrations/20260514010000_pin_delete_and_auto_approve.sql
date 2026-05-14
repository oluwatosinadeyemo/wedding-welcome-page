-- 1. Auto-approve guest photo uploads so they appear immediately in the gallery.
CREATE OR REPLACE FUNCTION public.submit_guest_photo(
  p_full_name text, p_file_path text, p_file_name text, p_caption text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_photo_id uuid;
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  INSERT INTO public.wedding_photos (file_path, file_name, uploaded_by, caption, status)
  VALUES (p_file_path, p_file_name, trim(p_full_name), p_caption, 'approved')
  RETURNING id INTO v_photo_id;
  RETURN v_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_photo(text, text, text, text) TO anon, authenticated;

-- 2. PIN-protected delete — PIN is checked server-side so it never appears in the JS bundle.
--    Returns the file_path so the client can also remove the storage object.
CREATE OR REPLACE FUNCTION public.delete_photo_with_pin(
  p_photo_id UUID,
  p_pin      TEXT
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_file_path TEXT;
BEGIN
  IF p_pin != '5566' THEN
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

  SELECT file_path INTO v_file_path
  FROM public.wedding_photos
  WHERE id = p_photo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photo not found';
  END IF;

  DELETE FROM public.wedding_photos WHERE id = p_photo_id;
  RETURN v_file_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_photo_with_pin(UUID, TEXT) TO anon, authenticated;

-- 3. Allow anon to delete files from the guest/ storage folder so the client
--    can clean up the storage object after a successful PIN delete.
DROP POLICY IF EXISTS "Anon can delete guest folder photos" ON storage.objects;
CREATE POLICY "Anon can delete guest folder photos"
  ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'wedding-photos' AND (storage.foldername(name))[1] = 'guest');
