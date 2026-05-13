
-- Add category and moderation status to wedding_photos
ALTER TABLE public.wedding_photos
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Existing photos (admin-uploaded) treated as approved
UPDATE public.wedding_photos SET status = 'approved' WHERE status = 'pending' AND user_id IS NULL AND uploaded_by IS NULL;

-- Replace public SELECT policy: anon sees only approved; authenticated (admin) sees all
DROP POLICY IF EXISTS "Anyone can view all photos" ON public.wedding_photos;

CREATE POLICY "Anon can view approved photos"
ON public.wedding_photos
FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "Authenticated can view all photos"
ON public.wedding_photos
FOR SELECT
TO authenticated
USING (true);
