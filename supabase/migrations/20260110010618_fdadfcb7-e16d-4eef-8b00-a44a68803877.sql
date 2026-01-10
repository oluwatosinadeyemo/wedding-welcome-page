-- Create storage bucket for wedding photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true);

-- Create table for photo gallery
CREATE TABLE public.wedding_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by TEXT,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wedding_photos
ALTER TABLE public.wedding_photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view photos
CREATE POLICY "Anyone can view wedding photos"
ON public.wedding_photos
FOR SELECT
USING (true);

-- Allow anyone to upload photos (public wedding gallery)
CREATE POLICY "Anyone can upload wedding photos"
ON public.wedding_photos
FOR INSERT
WITH CHECK (true);

-- Storage policies for wedding-photos bucket
CREATE POLICY "Anyone can view wedding photos storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'wedding-photos');

CREATE POLICY "Anyone can upload wedding photos storage"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'wedding-photos');

-- Enable realtime for the photos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_photos;