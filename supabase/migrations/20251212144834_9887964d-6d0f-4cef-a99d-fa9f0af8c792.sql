-- Create a public bucket for static assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');