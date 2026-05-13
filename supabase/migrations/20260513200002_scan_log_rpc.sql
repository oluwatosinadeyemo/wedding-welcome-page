-- SECURITY DEFINER function runs as the table owner, bypassing RLS.
-- This lets unauthenticated (anon) check-in staff insert scan records
-- without needing a separate GRANT on the table.
CREATE OR REPLACE FUNCTION public.insert_scan_log(
  p_raw_value TEXT,
  p_label     TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row scan_log;
BEGIN
  INSERT INTO public.scan_log (raw_value, label)
  VALUES (p_raw_value, p_label)
  RETURNING * INTO v_row;

  RETURN row_to_json(v_row);
END;
$$;

-- Allow unauthenticated callers to execute this function
GRANT EXECUTE ON FUNCTION public.insert_scan_log(TEXT, TEXT) TO anon;
