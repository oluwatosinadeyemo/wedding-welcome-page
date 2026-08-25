CREATE TABLE public.cap_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  delivery_address text,
  tailor text NOT NULL DEFAULT 'ours',
  measurements text,
  amount numeric,
  paid boolean NOT NULL DEFAULT false,
  delivered boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_orders TO authenticated;
GRANT ALL ON public.cap_orders TO service_role;

ALTER TABLE public.cap_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cap orders" ON public.cap_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cap orders" ON public.cap_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cap orders" ON public.cap_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete cap orders" ON public.cap_orders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_cap_orders_updated_at BEFORE UPDATE ON public.cap_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();