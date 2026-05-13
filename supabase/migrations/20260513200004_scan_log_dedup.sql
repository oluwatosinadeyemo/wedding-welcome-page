-- Add pass_id column to scan_log and enforce one scan per pass
ALTER TABLE public.scan_log
  ADD COLUMN IF NOT EXISTS pass_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS scan_log_pass_id_unique
  ON public.scan_log (pass_id)
  WHERE pass_id IS NOT NULL;

-- Updated function: returns {already_checked_in, label, scanned_at}
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
  v_row        scan_log;
  v_label      TEXT := p_label;
  v_existing   scan_log;
BEGIN
  -- Resolve guest name from pass_id if no label supplied
  IF p_pass_id IS NOT NULL AND v_label IS NULL THEN
    SELECT full_name INTO v_label
    FROM public.guests
    WHERE pass_id = p_pass_id;
  END IF;

  -- Check for existing scan of this pass
  IF p_pass_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.scan_log
    WHERE pass_id = p_pass_id;

    IF FOUND THEN
      RETURN json_build_object(
        'already_checked_in', true,
        'id',          v_existing.id,
        'label',       v_existing.label,
        'scanned_at',  v_existing.scanned_at,
        'raw_value',   v_existing.raw_value,
        'pass_id',     v_existing.pass_id
      );
    END IF;
  END IF;

  -- New scan — insert and return with flag
  INSERT INTO public.scan_log (raw_value, label, pass_id)
  VALUES (p_raw_value, v_label, p_pass_id)
  RETURNING * INTO v_row;

  RETURN (
    SELECT row_to_json(r)
    FROM (
      SELECT v_row.id, v_row.label, v_row.scanned_at,
             v_row.raw_value, v_row.pass_id,
             false AS already_checked_in
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_scan_log(TEXT, TEXT, UUID) TO anon;
