-- Multiple gallery photos per product colour.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_images jsonb NOT NULL DEFAULT '[]'::jsonb;
