
-- Restrict guests SELECT/INSERT to authenticated only (anon flows use SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Anyone can look up guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can create a guest record" ON public.guests;

-- Restrict rsvps UPDATE to authenticated admin only
DROP POLICY IF EXISTS "Anyone can update an RSVP" ON public.rsvps;
CREATE POLICY "Only authenticated can update RSVPs"
ON public.rsvps FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- Restrict wedding_photos DELETE to authenticated only
DROP POLICY IF EXISTS "Public can delete photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Anyone can delete wedding photos" ON public.wedding_photos;

-- Restrict storage DELETE on wedding-photos bucket to authenticated only
DROP POLICY IF EXISTS "Public can delete wedding photos in storage" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete wedding photos storage" ON storage.objects;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Authenticated can delete wedding photos in storage'
  ) THEN
    CREATE POLICY "Authenticated can delete wedding photos in storage"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'wedding-photos');
  END IF;
END $$;

-- SECURITY DEFINER RPC: fetch a guest's pass_id by guest_id (used after invite/name lookup)
CREATE OR REPLACE FUNCTION public.get_guest_pass_id(p_guest_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pass_id FROM public.guests WHERE id = p_guest_id;
$$;

-- SECURITY DEFINER RPC: search guests by name for check-in (excludes pass_id)
CREATE OR REPLACE FUNCTION public.search_guests_for_checkin(p_query text)
RETURNS TABLE(id uuid, full_name text, party_size integer, checked_in boolean, checked_in_at timestamptz, invite_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.full_name, g.party_size, g.checked_in, g.checked_in_at, g.invite_code
  FROM public.guests g
  WHERE g.full_name ILIKE '%' || p_query || '%'
  ORDER BY g.full_name
  LIMIT 6;
$$;
