-- Create table to store wrapped stats per FID
CREATE TABLE public.wrapped_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fid BIGINT NOT NULL UNIQUE,
  stats JSONB NOT NULL,
  user_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wrapped_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read/write since this is keyed by FID (Farcaster ID), not auth
CREATE POLICY "Anyone can read wrapped stats"
ON public.wrapped_stats
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert wrapped stats"
ON public.wrapped_stats
FOR INSERT
WITH CHECK (true);

-- Index for fast FID lookups
CREATE INDEX idx_wrapped_stats_fid ON public.wrapped_stats(fid);