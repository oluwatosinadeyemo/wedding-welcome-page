-- Fix check-in: mark guest as checked_in when their pass is scanned.
-- Previously insert_scan_log recorded the scan but never updated guests.checked_in,
-- so the dashboard "Checked In" count always showed 0.
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
  v_row      scan_log;
  v_label    TEXT := p_label;
  v_existing scan_log;
BEGIN
  -- Resolve guest name from pass_id when no label supplied
  IF p_pass_id IS NOT NULL AND v_label IS NULL THEN
    SELECT full_name INTO v_label
    FROM public.guests
    WHERE pass_id = p_pass_id;
  END IF;

  -- Dedup: if this pass was already scanned, return the original entry
  IF p_pass_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.scan_log
    WHERE pass_id = p_pass_id;

    IF FOUND THEN
      RETURN json_build_object(
        'already_checked_in', true,
        'id',         v_existing.id,
        'label',      v_existing.label,
        'scanned_at', v_existing.scanned_at,
        'raw_value',  v_existing.raw_value,
        'pass_id',    v_existing.pass_id
      );
    END IF;
  END IF;

  -- New scan — insert into scan_log
  INSERT INTO public.scan_log (raw_value, label, pass_id)
  VALUES (p_raw_value, v_label, p_pass_id)
  RETURNING * INTO v_row;

  -- Mark the guest as checked in
  IF p_pass_id IS NOT NULL THEN
    UPDATE public.guests
    SET checked_in    = true,
        checked_in_at = now()
    WHERE pass_id = p_pass_id;
  END IF;

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
