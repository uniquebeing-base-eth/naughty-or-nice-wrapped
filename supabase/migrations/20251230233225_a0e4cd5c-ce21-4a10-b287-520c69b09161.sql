
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for storing monthly wrapped stats
CREATE TABLE public.monthly_wrapped_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fid BIGINT NOT NULL,
  month_key TEXT NOT NULL,
  stats JSONB NOT NULL,
  judgment JSONB NOT NULL,
  user_data JSONB,
  energy_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fid, month_key)
);

-- Enable RLS
ALTER TABLE public.monthly_wrapped_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can read monthly stats"
ON public.monthly_wrapped_stats
FOR SELECT
USING (true);

-- Allow inserts and updates (service role handles this)
CREATE POLICY "Allow insert monthly stats"
ON public.monthly_wrapped_stats
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update monthly stats"
ON public.monthly_wrapped_stats
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_monthly_wrapped_stats_fid_month ON public.monthly_wrapped_stats(fid, month_key);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_wrapped_stats_updated_at
BEFORE UPDATE ON public.monthly_wrapped_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
