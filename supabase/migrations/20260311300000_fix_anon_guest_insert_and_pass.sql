-- ============================================
-- Migration: Allow anonymous guest creation and name-based pass generation
-- ============================================

-- 1. Allow anonymous users to insert guests (for walk-in RSVPs)
CREATE POLICY "Anyone can create a guest record"
ON public.guests
FOR INSERT
TO anon
WITH CHECK (true);

-- 2. Create a name-based guest lookup function
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
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.full_name,
    g.party_size,
    (r.id IS NOT NULL) AS has_rsvp,
    r.attending AS rsvp_attending,
    (g.pass_id IS NOT NULL) AS has_pass
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE lower(g.full_name) = lower(guest_name)
  ORDER BY g.created_at DESC
  LIMIT 1;
END;
$$;

-- 3. Create a simpler pass generation function that works by guest_id only
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
  -- Check if guest exists
  SELECT g.pass_id INTO v_existing_pass
  FROM public.guests g
  WHERE g.id = p_guest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest not found';
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
  SET pass_id = v_pass_id
  WHERE id = p_guest_id;

  RETURN v_pass_id;
END;
$$;

-- 4. Allow anonymous users to update guests (for pass generation via SECURITY DEFINER)
-- The RPC functions use SECURITY DEFINER so they bypass RLS,
-- but we also need anon to call them, which is already allowed by default.
