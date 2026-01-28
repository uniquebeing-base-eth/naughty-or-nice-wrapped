
-- Create storage bucket for share card images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('share-cards', 'share-cards', true);

-- Allow anyone to read share card images (public)
CREATE POLICY "Share cards are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'share-cards');

-- Allow anyone to upload share cards (we'll handle this via edge function)
CREATE POLICY "Anyone can upload share cards"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'share-cards');
