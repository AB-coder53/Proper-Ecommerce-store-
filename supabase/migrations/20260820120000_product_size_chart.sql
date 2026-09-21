-- Optional size chart image URL per product
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_chart TEXT;
