-- Create storage bucket for bloomers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bloomers', 'bloomers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to bloomers
CREATE POLICY "Public can view bloomers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'bloomers');

-- Allow authenticated users to upload bloomers (via service role)
CREATE POLICY "Service role can upload bloomers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'bloomers');