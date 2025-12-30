-- Add unique constraint on fid and month_key for proper upsert behavior
ALTER TABLE public.monthly_wrapped_stats 
ADD CONSTRAINT monthly_wrapped_stats_fid_month_key_unique UNIQUE (fid, month_key);