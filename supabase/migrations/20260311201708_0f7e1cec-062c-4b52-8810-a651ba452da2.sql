
-- Add expires_at column to wedding_photos
ALTER TABLE public.wedding_photos ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Update existing photos to expire 48h from their creation
UPDATE public.wedding_photos SET expires_at = created_at + interval '48 hours' WHERE expires_at IS NULL;

-- Create trigger to auto-set expires_at on insert
CREATE OR REPLACE FUNCTION public.set_photo_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_photo_expiry_trigger
  BEFORE INSERT ON public.wedding_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_photo_expiry();

-- Add public SELECT policy for anonymous users to view non-expired photos
CREATE POLICY "Public can view non-expired photos"
  ON public.wedding_photos FOR SELECT
  TO anon
  USING (expires_at IS NULL OR expires_at > now());
