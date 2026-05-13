-- Fix: replace gen_random_bytes (requires pgcrypto) with gen_random_uuid() slice
-- gen_random_bytes(integer) does not exist on this Supabase instance without pgcrypto.
-- gen_random_uuid() is natively available and produces sufficient entropy for invite codes.

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
  v_guest_id UUID;
  v_invite_code TEXT;
BEGIN
  -- Validate attending value
  IF p_attending NOT IN ('yes', 'no', 'maybe') THEN
    RAISE EXCEPTION 'Invalid attending value. Must be yes, no, or maybe.';
  END IF;

  -- Validate guest count
  IF p_number_of_guests < 1 OR p_number_of_guests > 10 THEN
    RAISE EXCEPTION 'Number of guests must be between 1 and 10.';
  END IF;

  -- Generate a unique invite code using gen_random_uuid() (no pgcrypto needed)
  v_invite_code := 'WALK-IN-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 12));

  -- Create the guest record
  INSERT INTO public.guests (full_name, invite_code, party_size)
  VALUES (trim(p_full_name), v_invite_code, p_number_of_guests)
  RETURNING id INTO v_guest_id;

  -- Create the RSVP record
  INSERT INTO public.rsvps (guest_id, attending, number_of_guests, message)
  VALUES (v_guest_id, p_attending, p_number_of_guests, p_message);

  RETURN json_build_object(
    'guest_id', v_guest_id,
    'invite_code', v_invite_code
  );
END;
$$;
