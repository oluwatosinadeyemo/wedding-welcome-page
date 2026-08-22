CREATE TABLE public.hotel_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  room_category TEXT,
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

CREATE POLICY "Authenticated can view hotel reservations" ON public.hotel_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert hotel reservations" ON public.hotel_reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update hotel reservations" ON public.hotel_reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete hotel reservations" ON public.hotel_reservations FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_hotel_reservations_updated_at BEFORE UPDATE ON public.hotel_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();