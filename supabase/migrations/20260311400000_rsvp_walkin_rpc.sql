-- ============================================
-- Migration: RPC for walk-in RSVP (bypasses RLS via SECURITY DEFINER)
-- ============================================

-- Allow anonymous guests to RSVP by creating a guest record + RSVP in one call.
-- This bypasses the guests table RLS which requires authenticated INSERT.

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

  -- Generate a unique invite code for walk-in guests using gen_random_uuid
  v_invite_code := 'WALK-IN-' || left(replace(gen_random_uuid()::text, '-', ''), 12);

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

-- Also allow anon INSERT on guests (belt and suspenders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guests' AND policyname = 'Anyone can create a guest record'
  ) THEN
    CREATE POLICY "Anyone can create a guest record"
    ON public.guests FOR INSERT TO anon WITH CHECK (true);
  END IF;
END;
$$;
