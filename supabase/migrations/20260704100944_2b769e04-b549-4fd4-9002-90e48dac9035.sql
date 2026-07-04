CREATE TABLE public.agbada_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  delivery_address TEXT,
  tailor TEXT NOT NULL DEFAULT 'ours',
  measurements TEXT,
  amount NUMERIC(12, 2),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agbada_orders TO authenticated;
GRANT ALL ON public.agbada_orders TO service_role;

ALTER TABLE public.agbada_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view agbada orders" ON public.agbada_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert agbada orders" ON public.agbada_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update agbada orders" ON public.agbada_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete agbada orders" ON public.agbada_orders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_agbada_orders_updated_at
BEFORE UPDATE ON public.agbada_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();