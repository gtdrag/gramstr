-- Create the instascrape-media storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'instascrape-media',
  'instascrape-media', 
  true,
  false,
  52428800, -- 50MB in bytes
  '{"video/*", "image/*"}'
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'instascrape-media');

-- Create policy for authenticated uploads
CREATE POLICY "Authenticated upload access" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'instascrape-media');