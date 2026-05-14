-- ============================================================================
-- COMPLETE RECOVERY SCRIPT for the wedding website Supabase backend.
-- Paste this entire file into the Lovable Cloud SQL editor and click Run.
--
-- This script is IDEMPOTENT — safe to run on a fresh DB or one that's
-- partially set up. It will:
--   1. Create every table the app needs (IF NOT EXISTS)
--   2. Add any missing columns (ADD COLUMN IF NOT EXISTS)
--   3. Replace every RPC function with its current, working version
--   4. Configure RLS policies and grants
-- ============================================================================

-- ---------- 1. TABLES -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.guests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  invite_code     TEXT NOT NULL UNIQUE,
  party_size      INTEGER NOT NULL DEFAULT 1,
  table_assignment TEXT,
  side            TEXT,
  pass_id         UUID UNIQUE,
  pass_generated_at TIMESTAMP WITH TIME ZONE,
  checked_in      BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at   TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS table_assignment TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS side TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS pass_id UUID;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS pass_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_guests_invite_code      ON public.guests (invite_code);
CREATE INDEX IF NOT EXISTS idx_guests_full_name_lower  ON public.guests (lower(full_name));

CREATE TABLE IF NOT EXISTS public.rsvps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id         UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  attending        TEXT NOT NULL CHECK (attending IN ('yes','no','maybe')),
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  message          TEXT,
  submitted_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_rsvp_per_guest UNIQUE (guest_id)
);

ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_rsvps_guest_id ON public.rsvps (guest_id);

CREATE TABLE IF NOT EXISTS public.wedding_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path   TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  uploaded_by TEXT,
  caption     TEXT,
  user_id     UUID,
  expires_at  TIMESTAMP WITH TIME ZONE,
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wedding_photos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.wedding_photos ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wedding_photos ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.wedding_photos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.scan_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  label      TEXT,
  raw_value  TEXT NOT NULL,
  pass_id    UUID
);

ALTER TABLE public.scan_log ADD COLUMN IF NOT EXISTS pass_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS scan_log_pass_id_unique
  ON public.scan_log (pass_id) WHERE pass_id IS NOT NULL;

-- ---------- 2. STORAGE BUCKET ----------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('wedding-photos', 'wedding-photos', true, 52428800)
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 52428800;

-- ---------- 3. RLS ----------------------------------------------------------

ALTER TABLE public.guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_log        ENABLE ROW LEVEL SECURITY;

-- guests: anon flows go through SECURITY DEFINER RPCs; only admin sees rows directly
DROP POLICY IF EXISTS "Authenticated can view guests"            ON public.guests;
DROP POLICY IF EXISTS "Only authenticated can insert guests"     ON public.guests;
DROP POLICY IF EXISTS "Only authenticated can update guests"     ON public.guests;
DROP POLICY IF EXISTS "Only authenticated can delete guests"     ON public.guests;

CREATE POLICY "Authenticated can view guests"
  ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only authenticated can insert guests"
  ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only authenticated can update guests"
  ON public.guests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Only authenticated can delete guests"
  ON public.guests FOR DELETE TO authenticated USING (true);

-- rsvps
DROP POLICY IF EXISTS "Anyone can submit an RSVP"        ON public.rsvps;
DROP POLICY IF EXISTS "Anyone can view RSVPs"            ON public.rsvps;
DROP POLICY IF EXISTS "Only authenticated can update RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Only authenticated can delete RSVPs" ON public.rsvps;

CREATE POLICY "Anyone can submit an RSVP"
  ON public.rsvps FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view RSVPs"
  ON public.rsvps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Only authenticated can update RSVPs"
  ON public.rsvps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Only authenticated can delete RSVPs"
  ON public.rsvps FOR DELETE TO authenticated USING (true);

-- wedding_photos
DROP POLICY IF EXISTS "Anon can view approved photos"          ON public.wedding_photos;
DROP POLICY IF EXISTS "Authenticated can view all photos"      ON public.wedding_photos;
DROP POLICY IF EXISTS "Anyone can upload wedding photos"       ON public.wedding_photos;
DROP POLICY IF EXISTS "Authenticated can update wedding photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Authenticated can delete wedding photos" ON public.wedding_photos;

CREATE POLICY "Anon can view approved photos"
  ON public.wedding_photos FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "Authenticated can view all photos"
  ON public.wedding_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can upload wedding photos"
  ON public.wedding_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update wedding photos"
  ON public.wedding_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete wedding photos"
  ON public.wedding_photos FOR DELETE TO authenticated USING (true);

-- scan_log
DROP POLICY IF EXISTS "Anyone can insert scan log"        ON public.scan_log;
DROP POLICY IF EXISTS "Authenticated can read scan log"   ON public.scan_log;
DROP POLICY IF EXISTS "Authenticated can delete scan log" ON public.scan_log;

CREATE POLICY "Anyone can insert scan log"
  ON public.scan_log FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read scan log"
  ON public.scan_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can delete scan log"
  ON public.scan_log FOR DELETE TO authenticated USING (true);

GRANT INSERT, SELECT ON public.scan_log TO anon;

-- storage.objects policies for the wedding-photos bucket
DROP POLICY IF EXISTS "Anyone can view wedding photos"     ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload wedding photos"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete wedding photos in storage" ON storage.objects;

CREATE POLICY "Anyone can view wedding photos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'wedding-photos');
CREATE POLICY "Anyone can upload wedding photos"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'wedding-photos');
CREATE POLICY "Authenticated can delete wedding photos in storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wedding-photos');

-- ---------- 4. TRIGGERS -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rsvps_updated_at ON public.rsvps;
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_rsvp_guest_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE max_party_size INTEGER;
BEGIN
  SELECT party_size INTO max_party_size FROM public.guests WHERE id = NEW.guest_id;
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

DROP TRIGGER IF EXISTS enforce_rsvp_guest_count ON public.rsvps;
CREATE TRIGGER enforce_rsvp_guest_count
  BEFORE INSERT OR UPDATE ON public.rsvps FOR EACH ROW
  EXECUTE FUNCTION public.validate_rsvp_guest_count();

-- Make sure no old upload-limit triggers block anonymous uploads
DROP TRIGGER IF EXISTS check_photo_upload_limit_trigger ON public.wedding_photos;
DROP TRIGGER IF EXISTS enforce_photo_upload_limit       ON public.wedding_photos;
DROP TRIGGER IF EXISTS check_photo_upload_limit         ON public.wedding_photos;
DROP TRIGGER IF EXISTS set_photo_expiry_trigger         ON public.wedding_photos;

-- ---------- 5. RPC FUNCTIONS ------------------------------------------------

-- 5a. Lookup by invite code (used by the invite-code flow)
CREATE OR REPLACE FUNCTION public.lookup_guest_by_invite_code(code TEXT)
RETURNS TABLE (id UUID, full_name TEXT, party_size INTEGER,
               has_rsvp BOOLEAN, rsvp_attending TEXT, has_pass BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, g.party_size,
         (r.id IS NOT NULL),
         r.attending,
         (g.pass_id IS NOT NULL)
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE lower(g.invite_code) = lower(code);
$$;

-- 5b. Fuzzy lookup by name (used by the QR pass page)
CREATE OR REPLACE FUNCTION public.lookup_guest_by_name(guest_name TEXT)
RETURNS TABLE (id UUID, full_name TEXT, party_size INTEGER,
               has_rsvp BOOLEAN, rsvp_attending TEXT, has_pass BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_normalized TEXT := lower(trim(regexp_replace(guest_name, '\s+', ' ', 'g')));
BEGIN
  RETURN QUERY
  SELECT g.id, g.full_name, g.party_size,
         (r.id IS NOT NULL), r.attending, (g.pass_id IS NOT NULL)
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE lower(trim(regexp_replace(g.full_name, '\s+', ' ', 'g'))) = v_normalized
  ORDER BY g.created_at DESC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT g.id, g.full_name, g.party_size,
         (r.id IS NOT NULL), r.attending, (g.pass_id IS NOT NULL)
  FROM public.guests g
  LEFT JOIN public.rsvps r ON r.guest_id = g.id
  WHERE length(v_normalized) >= 3
    AND (lower(g.full_name) ILIKE '%' || v_normalized || '%'
      OR v_normalized ILIKE '%' || lower(g.full_name) || '%')
  ORDER BY g.created_at DESC LIMIT 1;
END;
$$;

-- 5c. Generate pass by guest_id (called from QRCodePass.tsx)
CREATE OR REPLACE FUNCTION public.generate_pass_by_guest_id(p_guest_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pass_id UUID; v_attending TEXT; v_existing UUID;
BEGIN
  SELECT pass_id INTO v_existing FROM public.guests WHERE id = p_guest_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest not found'; END IF;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  SELECT attending INTO v_attending FROM public.rsvps WHERE guest_id = p_guest_id;
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

-- 5d. Generate pass by guest_id + invite_code
CREATE OR REPLACE FUNCTION public.generate_guest_pass(p_guest_id UUID, p_invite_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pass_id UUID; v_attending TEXT; v_existing UUID;
BEGIN
  SELECT pass_id INTO v_existing FROM public.guests
    WHERE id = p_guest_id AND lower(invite_code) = lower(p_invite_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest not found or invite code mismatch'; END IF;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  SELECT attending INTO v_attending FROM public.rsvps WHERE guest_id = p_guest_id;
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

-- 5e. Get a guest's pass_id (used after lookup)
CREATE OR REPLACE FUNCTION public.get_guest_pass_id(p_guest_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pass_id FROM public.guests WHERE id = p_guest_id;
$$;

-- 5f. Search guests by name (check-in tool)
CREATE OR REPLACE FUNCTION public.search_guests_for_checkin(p_query TEXT)
RETURNS TABLE (id UUID, full_name TEXT, party_size INTEGER,
               checked_in BOOLEAN, checked_in_at TIMESTAMPTZ, invite_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.full_name, g.party_size, g.checked_in, g.checked_in_at, g.invite_code
  FROM public.guests g
  WHERE g.full_name ILIKE '%' || p_query || '%'
  ORDER BY g.full_name LIMIT 6;
$$;

-- 5g. Walk-in RSVP (creates or updates guest + rsvp in one call)
CREATE OR REPLACE FUNCTION public.submit_walkin_rsvp(
  p_full_name TEXT,
  p_attending TEXT,
  p_number_of_guests INTEGER DEFAULT 1,
  p_message TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest_id     UUID;
  v_invite_code  TEXT;
  v_clean_name   TEXT := trim(regexp_replace(p_full_name, '\s+', ' ', 'g'));
  v_existing_id  UUID;
  v_existing_code TEXT;
BEGIN
  IF p_attending NOT IN ('yes','no','maybe') THEN
    RAISE EXCEPTION 'Invalid attending value. Must be yes, no, or maybe.';
  END IF;
  IF p_number_of_guests < 1 OR p_number_of_guests > 10 THEN
    RAISE EXCEPTION 'Number of guests must be between 1 and 10.';
  END IF;

  SELECT g.id, g.invite_code INTO v_existing_id, v_existing_code
  FROM public.guests g
  WHERE g.invite_code LIKE 'WALK-IN-%'
    AND lower(trim(regexp_replace(g.full_name, '\s+', ' ', 'g'))) = lower(v_clean_name)
  ORDER BY g.created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.guests
      SET party_size = GREATEST(party_size, p_number_of_guests)
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
  INSERT INTO public.guests (full_name, invite_code, party_size)
  VALUES (v_clean_name, v_invite_code, p_number_of_guests)
  RETURNING id INTO v_guest_id;
  INSERT INTO public.rsvps (guest_id, attending, number_of_guests, message)
  VALUES (v_guest_id, p_attending, p_number_of_guests, p_message);
  RETURN json_build_object('guest_id',v_guest_id,'invite_code',v_invite_code,'updated',false);
END;
$$;

-- 5h. Submit a guest photo
CREATE OR REPLACE FUNCTION public.submit_guest_photo(
  p_full_name TEXT, p_file_path TEXT, p_file_name TEXT, p_caption TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_photo_id UUID;
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  INSERT INTO public.wedding_photos (file_path, file_name, uploaded_by, caption)
  VALUES (p_file_path, p_file_name, trim(p_full_name), p_caption)
  RETURNING id INTO v_photo_id;
  RETURN v_photo_id;
END;
$$;

-- 5i. Insert scan + mark guest checked-in (with dedup)
CREATE OR REPLACE FUNCTION public.insert_scan_log(
  p_raw_value TEXT, p_label TEXT DEFAULT NULL, p_pass_id UUID DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row      scan_log;
  v_label    TEXT := p_label;
  v_existing scan_log;
BEGIN
  IF p_pass_id IS NOT NULL AND v_label IS NULL THEN
    SELECT full_name INTO v_label FROM public.guests WHERE pass_id = p_pass_id;
  END IF;

  IF p_pass_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.scan_log WHERE pass_id = p_pass_id;
    IF FOUND THEN
      RETURN json_build_object(
        'already_checked_in', true,
        'id', v_existing.id, 'label', v_existing.label,
        'scanned_at', v_existing.scanned_at,
        'raw_value', v_existing.raw_value, 'pass_id', v_existing.pass_id);
    END IF;
  END IF;

  INSERT INTO public.scan_log (raw_value, label, pass_id)
  VALUES (p_raw_value, v_label, p_pass_id) RETURNING * INTO v_row;

  IF p_pass_id IS NOT NULL THEN
    UPDATE public.guests
      SET checked_in = true, checked_in_at = now()
      WHERE pass_id = p_pass_id;
  END IF;

  RETURN (SELECT row_to_json(r) FROM (
    SELECT v_row.id, v_row.label, v_row.scanned_at,
           v_row.raw_value, v_row.pass_id, false AS already_checked_in) r);
END;
$$;

-- ---------- 6. GRANTS -------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.lookup_guest_by_invite_code(TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_guest_by_name(TEXT)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pass_by_guest_id(UUID)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_guest_pass(UUID, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_pass_id(UUID)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_guests_for_checkin(TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_walkin_rsvp(TEXT, TEXT, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_photo(TEXT, TEXT, TEXT, TEXT)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_scan_log(TEXT, TEXT, UUID)        TO anon, authenticated;

-- ---------- 7. REALTIME -----------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='wedding_photos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_photos;
  END IF;
END $$;

-- ============================================================================
-- DONE. Verify by running:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='guests';
-- You should see: id, full_name, email, phone, invite_code, party_size,
-- table_assignment, side, pass_id, pass_generated_at, checked_in,
-- checked_in_at, created_at, updated_at.
-- ============================================================================
