CREATE TABLE public.scan_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  label TEXT,
  raw_value TEXT NOT NULL
);

ALTER TABLE public.scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert scan log"
  ON public.scan_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can read scan log"
  ON public.scan_log FOR SELECT TO authenticated USING (true);
