
-- Add energy_result column to wrapped_stats table
ALTER TABLE public.wrapped_stats 
ADD COLUMN energy_result jsonb;

-- Add index for faster lookups
CREATE INDEX idx_wrapped_stats_energy_result ON public.wrapped_stats USING GIN(energy_result);
