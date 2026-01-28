
-- Create table for minted bloomers
CREATE TABLE public.minted_bloomers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  image_url TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.minted_bloomers ENABLE ROW LEVEL SECURITY;

-- Anyone can read bloomers
CREATE POLICY "Anyone can view minted bloomers" 
ON public.minted_bloomers 
FOR SELECT 
USING (true);

-- Anyone can insert (we track by wallet address, not auth)
CREATE POLICY "Anyone can insert minted bloomers" 
ON public.minted_bloomers 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries by wallet
CREATE INDEX idx_minted_bloomers_user_address ON public.minted_bloomers(user_address);
