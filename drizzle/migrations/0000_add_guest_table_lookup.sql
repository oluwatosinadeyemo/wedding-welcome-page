CREATE OR REPLACE FUNCTION public.get_guest_table_assignment(p_guest_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT table_assignment
  FROM public.guests
  WHERE id = p_guest_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_table_assignment(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_table_assignment(uuid) TO authenticated;