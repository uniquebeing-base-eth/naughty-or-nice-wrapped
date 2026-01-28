
-- Create pending_tips table to store tips detected from Farcaster comments
CREATE TABLE IF NOT EXISTS public.pending_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_fid INTEGER NOT NULL,
  receiver_fid INTEGER NOT NULL,
  sender_wallet TEXT NOT NULL,
  receiver_wallet TEXT NOT NULL,
  amount TEXT NOT NULL,
  cast_hash TEXT NOT NULL,
  sender_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pending_tips_sender_fid ON public.pending_tips(sender_fid);
CREATE INDEX IF NOT EXISTS idx_pending_tips_receiver_fid ON public.pending_tips(receiver_fid);
CREATE INDEX IF NOT EXISTS idx_pending_tips_status ON public.pending_tips(status);
CREATE INDEX IF NOT EXISTS idx_pending_tips_sender_wallet ON public.pending_tips(sender_wallet);

-- Enable RLS
ALTER TABLE public.pending_tips ENABLE ROW LEVEL SECURITY;

-- Allow public read access (tips are public)
CREATE POLICY "Anyone can view pending tips" 
ON public.pending_tips 
FOR SELECT 
USING (true);

-- Allow insert from service role only (via edge function)
CREATE POLICY "Service role can insert tips" 
ON public.pending_tips 
FOR INSERT 
WITH CHECK (true);

-- Allow update from service role only
CREATE POLICY "Service role can update tips" 
ON public.pending_tips 
FOR UPDATE 
USING (true);
