-- Update insert_scan_log to auto-resolve guest name from pass_id
CREATE OR REPLACE FUNCTION public.insert_scan_log(
  p_raw_value TEXT,
  p_label     TEXT DEFAULT NULL,
  p_pass_id   UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row   scan_log;
  v_label TEXT := p_label;
BEGIN
  -- If a pass_id is supplied, resolve it to the guest's full name
  IF p_pass_id IS NOT NULL AND v_label IS NULL THEN
    SELECT full_name INTO v_label
    FROM public.guests
    WHERE pass_id = p_pass_id;
  END IF;

  INSERT INTO public.scan_log (raw_value, label)
  VALUES (p_raw_value, v_label)
  RETURNING * INTO v_row;

  RETURN row_to_json(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_scan_log(TEXT, TEXT, UUID) TO anon;
