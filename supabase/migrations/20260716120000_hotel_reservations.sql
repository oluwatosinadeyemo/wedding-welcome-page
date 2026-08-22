-- Hotel reservation tracking for the couple dashboard.
-- Tracks who has a hotel room booked, the room category, and how much of
-- the cost has been paid (as a percentage), plus the nights booked and
-- check-in / check-out dates where known.

CREATE TABLE public.hotel_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  room_category TEXT,
  -- Percentage of the room cost that has been paid (0-100)
  percent_paid INTEGER NOT NULL DEFAULT 0 CHECK (percent_paid >= 0 AND percent_paid <= 100),
  nights INTEGER,
  check_in TEXT,
  check_out TEXT,
  nights_booked TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_reservations TO authenticated;
GRANT ALL ON public.hotel_reservations TO service_role;

ALTER TABLE public.hotel_reservations ENABLE ROW LEVEL SECURITY;

-- Admin access is gated in the app by an email allow-list, so any signed-in
-- user gets full CRUD here, matching the other dashboard tables.
CREATE POLICY "Authenticated can view hotel reservations" ON public.hotel_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert hotel reservations" ON public.hotel_reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update hotel reservations" ON public.hotel_reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete hotel reservations" ON public.hotel_reservations FOR DELETE TO authenticated USING (true);

-- Reuse the shared updated_at trigger function used by the other tables.
CREATE TRIGGER update_hotel_reservations_updated_at
BEFORE UPDATE ON public.hotel_reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Preload the known reservations. Names that appeared in the room-category
-- list are merged with their nights/dates from the night-booking lists.
-- Percentages start at 0 and are meant to be filled in from the dashboard.
-- Only seeds when the table is still empty, so re-running is safe.
INSERT INTO public.hotel_reservations
  (full_name, room_category, percent_paid, nights, check_in, check_out, nights_booked, notes)
SELECT v.full_name, v.room_category, v.percent_paid, v.nights, v.check_in, v.check_out, v.nights_booked, v.notes
FROM (VALUES
  -- Room category + nights known
  ('Olumide'::text,               'Standard'::text,      0, 3::int, 'Thu 10 Dec'::text, 'Sun 13 Dec'::text, 'Thu, Fri, Sat'::text, NULL::text),
  ('Famo',                        'Standard',            0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Skimmer',                     'Deluxe',              0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Isaac',                       'Standard',            0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Seriki',                      'Deluxe',              0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat',      'Room list noted "Friday"'),
  -- Room category only (no nights in the booking lists)
  ('Yinka',                       'Deluxe',              0, NULL, NULL, NULL, NULL, NULL),
  ('Raphael',                     'Double Deluxe',       0, NULL, NULL, NULL, NULL, NULL),
  ('Jide',                        'Standard',            0, NULL, NULL, NULL, NULL, NULL),
  -- 2 nights (Fri 11 Dec - Sun 13 Dec), room category not listed
  ('Seyi',                        NULL,                  0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat', NULL),
  ('Funmi & K-Cola',             NULL,                  0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat', NULL),
  ('Odun / Ameenat / Tunmise',    NULL,                  0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat', NULL),
  ('Femi / Sesan',                NULL,                  0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat', NULL),
  ('Soji',                        NULL,                  0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat', NULL),
  ('Tunbosun',                    NULL,                  0, 2, 'Fri 11 Dec', 'Sun 13 Dec', 'Fri, Sat', NULL),
  -- 3 nights (Thu 10 Dec - Sun 13 Dec), room category not listed
  ('Kizzle',                      NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Tommy',                       NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Ralph',                       NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Toyosi',                      NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Big Tuns',                    NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Kola',                        NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Saheed & Jide',              NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Kazeem & Khadijat',          NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL),
  ('Tosin (Groom)',               NULL,                  0, 3, 'Thu 10 Dec', 'Sun 13 Dec', 'Thu, Fri, Sat', NULL)
) AS v(full_name, room_category, percent_paid, nights, check_in, check_out, nights_booked, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.hotel_reservations);
