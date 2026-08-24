CREATE OR REPLACE FUNCTION public.submit_walkin_rsvp(p_full_name text, p_attending text, p_number_of_guests integer DEFAULT 1, p_message text DEFAULT NULL::text, p_side text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_guest_id     UUID;
  v_invite_code  TEXT;
  v_clean_name   TEXT := trim(regexp_replace(p_full_name, '\s+', ' ', 'g'));
  v_existing_id  UUID;
  v_existing_code TEXT;
  v_side         TEXT := lower(nullif(trim(coalesce(p_side,'')), ''));
BEGIN
  IF p_attending NOT IN ('yes','no','maybe') THEN
    RAISE EXCEPTION 'Invalid attending value. Must be yes, no, or maybe.';
  END IF;
  IF p_number_of_guests < 1 OR p_number_of_guests > 10 THEN
    RAISE EXCEPTION 'Number of guests must be between 1 and 10.';
  END IF;
  IF v_side IS NOT NULL AND v_side NOT IN ('groom','bride') THEN
    RAISE EXCEPTION 'Invalid side. Must be groom or bride.';
  END IF;

  SELECT g.id, g.invite_code INTO v_existing_id, v_existing_code
  FROM public.guests g
  WHERE g.invite_code LIKE 'WALK-IN-%'
    AND lower(trim(regexp_replace(g.full_name, '\s+', ' ', 'g'))) = lower(v_clean_name)
  ORDER BY g.created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.guests
      SET party_size = GREATEST(party_size, p_number_of_guests),
          side = COALESCE(v_side, side)
      WHERE id = v_existing_id;
    INSERT INTO public.rsvps (guest_id, attending, number_of_guests, message)
    VALUES (v_existing_id, p_attending, p_number_of_guests, p_message)
    ON CONFLICT (guest_id) DO UPDATE
      SET attending=EXCLUDED.attending,
          number_of_guests=EXCLUDED.number_of_guests,
          message=EXCLUDED.message,
          updated_at=now();
    RETURN json_build_object('guest_id',v_existing_id,'invite_code',v_existing_code,'updated',true);
  END IF;

  v_invite_code := 'WALK-IN-' || upper(left(replace(gen_random_uuid()::text,'-',''),12));
  INSERT INTO public.guests (full_name, invite_code, party_size, side)
  VALUES (v_clean_name, v_invite_code, p_number_of_guests, v_side)
  RETURNING id INTO v_guest_id;
  INSERT INTO public.rsvps (guest_id, attending, number_of_guests, message)
  VALUES (v_guest_id, p_attending, p_number_of_guests, p_message);
  RETURN json_build_object('guest_id',v_guest_id,'invite_code',v_invite_code,'updated',false);
END;
$function$;