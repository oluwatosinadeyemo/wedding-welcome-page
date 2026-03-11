-- ============================================
-- Migration: Create guests and rsvps tables
-- ============================================

-- Table: guests (the couple's invite list)
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  party_size INTEGER NOT NULL DEFAULT 1,
  table_assignment TEXT,
  side TEXT CHECK (side IN ('bride', 'groom', 'mutual')),
  pass_id UUID UNIQUE,
  pass_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_invite_code ON public.guests (invite_code);
CREATE INDEX idx_guests_full_name_lower ON public.guests (lower(full_name));

-- Table: rsvps (guest responses)
CREATE TABLE public.rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  attending TEXT NOT NULL CHECK (attending IN ('yes', 'no', 'maybe')),
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_rsvp_per_guest UNIQUE (guest_id)
);

CREATE INDEX idx_rsvps_guest_id ON public.rsvps (guest_id);

-- Trigger: validate number_of_guests against party_size
CREATE OR REPLACE FUNCTION public.validate_rsvp_guest_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_party_size INTEGER;
BEGIN
  SELECT party_size INTO max_party_size
  FROM public.guests
  WHERE id = NEW.guest_id;

  IF NEW.number_of_guests > max_party_size THEN
    RAISE EXCEPTION 'Number of guests (%) exceeds your invitation party size (%)',
      NEW.number_of_guests, max_party_size;
  END IF;

  IF NEW.number_of_guests < 1 THEN
    RAISE EXCEPTION 'Number of guests must be at least 1';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_rsvp_guest_count
BEFORE INSERT OR UPDATE ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.validate_rsvp_guest_count();

-- Trigger: auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at
BEFORE UPDATE ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for guests
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can look up guests"
ON public.guests
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only authenticated can insert guests"
ON public.guests
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only authenticated can update guests"
ON public.guests
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Only authenticated can delete guests"
ON public.guests
FOR DELETE
TO authenticated
USING (true);

-- RLS for rsvps
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an RSVP"
ON public.rsvps
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update an RSVP"
ON public.rsvps
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view RSVPs"
ON public.rsvps
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only authenticated can delete RSVPs"
ON public.rsvps
FOR DELETE
TO authenticated
USING (true);

-- RPC: Secure guest lookup by invite code
CREATE OR REPLACE FUNCTION public.lookup_guest_by_invite_code(code TEXT)
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
  WHERE lower(g.invite_code) = lower(code);
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
