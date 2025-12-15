-- Add UPDATE policy to allow updating tx_hash for minted bloomers
CREATE POLICY "Anyone can update minted bloomers" 
ON public.minted_bloomers 
FOR UPDATE 
USING (true)
WITH CHECK (true);