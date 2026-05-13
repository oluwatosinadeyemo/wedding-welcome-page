-- Add missing pass_generated_at column to guests table (was omitted in an earlier migration)
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS pass_generated_at TIMESTAMPTZ;

-- Re-create generate_pass_by_guest_id to match current schema
CREATE OR REPLACE FUNCTION public.generate_pass_by_guest_id(p_guest_id UUID)
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
  SELECT g.pass_id INTO v_existing_pass
  FROM public.guests g
  WHERE g.id = p_guest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest not found';
  END IF;

  IF v_existing_pass IS NOT NULL THEN
    RETURN v_existing_pass;
  END IF;

  SELECT r.attending INTO v_attending
  FROM public.rsvps r
  WHERE r.guest_id = p_guest_id;

  IF v_attending IS NULL OR v_attending != 'yes' THEN
    RAISE EXCEPTION 'Pass can only be generated after confirming attendance (RSVP yes)';
  END IF;

  v_pass_id := gen_random_uuid();

  UPDATE public.guests
  SET pass_id = v_pass_id, pass_generated_at = now()
  WHERE id = p_guest_id;

  RETURN v_pass_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pass_by_guest_id(UUID) TO anon, authenticated;
