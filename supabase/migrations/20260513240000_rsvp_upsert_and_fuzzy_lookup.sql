-- ============================================
-- UX fixes:
-- 1. lookup_guest_by_name: tolerate whitespace + partial matches
-- 2. submit_walkin_rsvp:   update existing walk-in record instead of
--    creating duplicates when a guest re-submits the form
-- ============================================

-- 1. Fuzzier name lookup — tries exact match first, falls back to ILIKE
CREATE OR REPLACE FUNCTION public.lookup_guest_by_name(guest_name TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  party_size INTEGER,
  has_rsvp BOOLEAN,
  rsvp_attending TEXT,
  has_pass BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT := lower(trim(regexp_replace(guest_name, '\s+', ' ', 'g')));
BEGIN
  -- Exact (normalized) match first
  RETURN QUERY
  SELECT
    g.id, g.full_name, g.party_size,
    (r.id IS NOT NULL) AS has_rsvp,
    r.attending AS rsvp_attending,
    (g.pass_id IS NOT NULL) AS has_pass
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE lower(trim(regexp_replace(g.full_name, '\s+', ' ', 'g'))) = v_normalized
  ORDER BY g.created_at DESC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fallback: substring match in either direction (typed name in stored, or stored in typed)
  RETURN QUERY
  SELECT
    g.id, g.full_name, g.party_size,
    (r.id IS NOT NULL) AS has_rsvp,
    r.attending AS rsvp_attending,
    (g.pass_id IS NOT NULL) AS has_pass
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE length(v_normalized) >= 3
    AND (
      lower(g.full_name) ILIKE '%' || v_normalized || '%'
      OR v_normalized ILIKE '%' || lower(g.full_name) || '%'
    )
  ORDER BY g.created_at DESC
  LIMIT 1;
END;
$$;

-- 2. RSVP dedup: if a walk-in guest with this name already exists, update
--    their RSVP rather than creating a new guest record.
CREATE OR REPLACE FUNCTION public.submit_walkin_rsvp(
  p_full_name TEXT,
  p_attending TEXT,
  p_number_of_guests INTEGER DEFAULT 1,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id     UUID;
  v_invite_code  TEXT;
  v_clean_name   TEXT := trim(regexp_replace(p_full_name, '\s+', ' ', 'g'));
  v_existing_id  UUID;
  v_existing_code TEXT;
BEGIN
  IF p_attending NOT IN ('yes', 'no', 'maybe') THEN
    RAISE EXCEPTION 'Invalid attending value. Must be yes, no, or maybe.';
  END IF;

  IF p_number_of_guests < 1 OR p_number_of_guests > 10 THEN
    RAISE EXCEPTION 'Number of guests must be between 1 and 10.';
  END IF;

  -- Look for an existing walk-in guest with this exact (normalized) name
  SELECT g.id, g.invite_code
  INTO v_existing_id, v_existing_code
  FROM public.guests g
  WHERE g.invite_code LIKE 'WALK-IN-%'
    AND lower(trim(regexp_replace(g.full_name, '\s+', ' ', 'g'))) = lower(v_clean_name)
  ORDER BY g.created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing guest's RSVP (upsert behaviour)
    UPDATE public.guests
    SET party_size = GREATEST(party_size, p_number_of_guests)
    WHERE id = v_existing_id;

    INSERT INTO public.rsvps (guest_id, attending, number_of_guests, message)
    VALUES (v_existing_id, p_attending, p_number_of_guests, p_message)
    ON CONFLICT (guest_id) DO UPDATE
      SET attending         = EXCLUDED.attending,
          number_of_guests  = EXCLUDED.number_of_guests,
          message           = EXCLUDED.message,
          updated_at        = now();

    RETURN json_build_object(
      'guest_id',    v_existing_id,
      'invite_code', v_existing_code,
      'updated',     true
    );
  END IF;

  -- New walk-in guest
  v_invite_code := 'WALK-IN-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 12));

  INSERT INTO public.guests (full_name, invite_code, party_size)
  VALUES (v_clean_name, v_invite_code, p_number_of_guests)
  RETURNING id INTO v_guest_id;

  INSERT INTO public.rsvps (guest_id, attending, number_of_guests, message)
  VALUES (v_guest_id, p_attending, p_number_of_guests, p_message);

  RETURN json_build_object(
    'guest_id',    v_guest_id,
    'invite_code', v_invite_code,
    'updated',     false
  );
END;
$$;
