-- Agbada order tracking for the couple dashboard.
-- Tracks who has bought their agbada, delivery details, payment status,
-- whether the couple's tailor or the guest's own tailor is being used,
-- and whether the outfit has been delivered.

CREATE TABLE public.agbada_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  delivery_address TEXT,
  -- 'ours' = using the couple's tailor, 'theirs' = using their own tailor
  tailor TEXT NOT NULL DEFAULT 'ours',
  measurements TEXT,
  -- Amount owed / agreed price for the agbada
  amount NUMERIC(12, 2),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.agbada_orders ENABLE ROW LEVEL SECURITY;

-- Admin access is gated at the application layer by an email allow-list,
-- so any authenticated (signed-in) user gets full CRUD here, matching the
-- pattern used by the rest of the dashboard tables.
CREATE POLICY "Authenticated can view agbada orders"
  ON public.agbada_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert agbada orders"
  ON public.agbada_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update agbada orders"
  ON public.agbada_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete agbada orders"
  ON public.agbada_orders FOR DELETE TO authenticated USING (true);

-- Keep updated_at fresh on every change.
CREATE OR REPLACE FUNCTION public.set_agbada_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agbada_orders_set_updated_at
  BEFORE UPDATE ON public.agbada_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_agbada_orders_updated_at();
