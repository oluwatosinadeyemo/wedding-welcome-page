-- ============================================
-- Migration: Digital pass generation function
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_guest_pass(p_guest_id UUID, p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass_id UUID;
  v_attending TEXT;
  v_existing_pass UUID;
BEGIN
  -- Verify the guest exists and invite code matches
  SELECT g.pass_id INTO v_existing_pass
  FROM public.guests g
  WHERE g.id = p_guest_id AND lower(g.invite_code) = lower(p_invite_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest not found or invite code mismatch';
  END IF;

  -- If pass already exists, return it
  IF v_existing_pass IS NOT NULL THEN
    RETURN v_existing_pass;
  END IF;

  -- Check that the guest has RSVP'd 'yes'
  SELECT r.attending INTO v_attending
  FROM public.rsvps r
  WHERE r.guest_id = p_guest_id;

  IF v_attending IS NULL OR v_attending != 'yes' THEN
    RAISE EXCEPTION 'Pass can only be generated after confirming attendance (RSVP yes)';
  END IF;

  -- Generate and store the pass
  v_pass_id := gen_random_uuid();

  UPDATE public.guests
  SET pass_id = v_pass_id, pass_generated_at = now()
  WHERE id = p_guest_id;

  RETURN v_pass_id;
END;
$$;
