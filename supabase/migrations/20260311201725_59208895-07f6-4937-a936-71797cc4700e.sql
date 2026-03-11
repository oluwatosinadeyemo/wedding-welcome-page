
-- Create generate_guest_pass function
CREATE OR REPLACE FUNCTION public.generate_guest_pass(p_guest_id uuid, p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass_id uuid;
  v_guest_exists boolean;
  v_has_rsvp boolean;
BEGIN
  -- Verify guest exists and invite code matches
  SELECT EXISTS (
    SELECT 1 FROM public.guests
    WHERE id = p_guest_id AND UPPER(invite_code) = UPPER(p_invite_code)
  ) INTO v_guest_exists;

  IF NOT v_guest_exists THEN
    RAISE EXCEPTION 'Invalid guest or invite code';
  END IF;

  -- Check if guest has RSVP'd yes
  SELECT EXISTS (
    SELECT 1 FROM public.rsvps
    WHERE guest_id = p_guest_id AND attending = 'yes'
  ) INTO v_has_rsvp;

  IF NOT v_has_rsvp THEN
    RAISE EXCEPTION 'You must RSVP yes before generating a pass';
  END IF;

  -- Check if pass already exists
  SELECT pass_id INTO v_pass_id
  FROM public.guests
  WHERE id = p_guest_id;

  IF v_pass_id IS NOT NULL THEN
    RETURN v_pass_id;
  END IF;

  -- Generate new pass
  v_pass_id := gen_random_uuid();
  UPDATE public.guests SET pass_id = v_pass_id WHERE id = p_guest_id;

  RETURN v_pass_id;
END;
$$;
