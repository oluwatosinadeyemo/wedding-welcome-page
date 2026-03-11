
-- 1. Create guests table
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  party_size integer NOT NULL DEFAULT 1,
  side text CHECK (side IN ('bride', 'groom')),
  pass_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on guests
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Anyone can read guests (needed for invite code lookup)
CREATE POLICY "Allow public read of guests"
  ON public.guests FOR SELECT
  USING (true);

-- 2. Create rsvps table
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL UNIQUE,
  attending text NOT NULL CHECK (attending IN ('yes', 'no', 'maybe')),
  number_of_guests integer NOT NULL DEFAULT 1,
  message text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on rsvps
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone can read rsvps
CREATE POLICY "Allow public read of rsvps"
  ON public.rsvps FOR SELECT
  USING (true);

-- Anyone can insert rsvps
CREATE POLICY "Allow public insert of rsvps"
  ON public.rsvps FOR INSERT
  WITH CHECK (true);

-- Anyone can update rsvps
CREATE POLICY "Allow public update of rsvps"
  ON public.rsvps FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. Create lookup RPC function
CREATE OR REPLACE FUNCTION public.lookup_guest_by_invite_code(code text)
RETURNS TABLE (
  id uuid,
  full_name text,
  party_size integer,
  has_rsvp boolean,
  rsvp_attending text,
  has_pass boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.full_name,
    g.party_size,
    (r.id IS NOT NULL) AS has_rsvp,
    r.attending AS rsvp_attending,
    (g.pass_id IS NOT NULL) AS has_pass
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE UPPER(g.invite_code) = UPPER(code)
$$;
