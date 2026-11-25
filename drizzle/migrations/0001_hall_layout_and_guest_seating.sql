CREATE TABLE public.hall_layout (
  id text PRIMARY KEY DEFAULT 'main',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hall_layout TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hall_layout TO authenticated;
GRANT ALL ON public.hall_layout TO service_role;
ALTER TABLE public.hall_layout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view hall layout" ON public.hall_layout FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert hall layout" ON public.hall_layout FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update hall layout" ON public.hall_layout FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_hall_layout_updated_at BEFORE UPDATE ON public.hall_layout
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_guest_seating(p_guest_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_table text;
BEGIN
  SELECT table_assignment INTO v_table FROM public.guests WHERE id = p_guest_id;
  IF v_table IS NULL OR length(trim(v_table)) = 0 THEN
    RETURN json_build_object('table_name', NULL, 'tablemates', '[]'::json);
  END IF;
  RETURN json_build_object(
    'table_name', v_table,
    'tablemates', COALESCE((
      SELECT json_agg(json_build_object('full_name', g.full_name, 'party_size', g.party_size) ORDER BY g.full_name)
      FROM public.guests g LEFT JOIN public.rsvps r ON r.guest_id = g.id
      WHERE g.table_assignment = v_table AND g.id <> p_guest_id AND COALESCE(r.attending, '') <> 'no'
    ), '[]'::json));
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_guest_seating(uuid) TO anon, authenticated;