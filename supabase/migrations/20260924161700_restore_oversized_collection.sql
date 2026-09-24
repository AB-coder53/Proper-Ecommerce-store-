INSERT INTO public.collections (id, title, image, product_id, tint, sort_order)
VALUES (
  'oversized',
  'Oversized',
  '/images/oversized-lavender.png',
  'oversized-240',
  'bg-white',
  1
)
ON CONFLICT (id) DO NOTHING;
