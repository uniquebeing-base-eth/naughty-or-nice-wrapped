
-- Add fid column to minted_bloomers for linking to Farcaster profiles
ALTER TABLE public.minted_bloomers 
ADD COLUMN IF NOT EXISTS fid bigint;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_minted_bloomers_fid ON public.minted_bloomers(fid);
