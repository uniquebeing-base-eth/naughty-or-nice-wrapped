
-- Create public bucket for NFT metadata JSON files
INSERT INTO storage.buckets (id, name, public)
VALUES ('bloomers-metadata', 'bloomers-metadata', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to metadata files
CREATE POLICY "Public read access for bloomers metadata"
ON storage.objects FOR SELECT
USING (bucket_id = 'bloomers-metadata');

-- Allow authenticated/anon insert for metadata files
CREATE POLICY "Allow insert for bloomers metadata"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bloomers-metadata');
