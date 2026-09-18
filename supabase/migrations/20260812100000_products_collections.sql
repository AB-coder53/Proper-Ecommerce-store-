-- AB Collection catalogue tables (products + collections)
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed.

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fabric TEXT NOT NULL,
  image TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  details TEXT[] NOT NULL DEFAULT '{}',
  colors TEXT[] NOT NULL DEFAULT '{}',
  sizes TEXT[] NOT NULL DEFAULT '{}',
  price TEXT NOT NULL,
  badge TEXT,
  featured BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  product_id TEXT REFERENCES public.products (id) ON DELETE SET NULL,
  tint TEXT NOT NULL DEFAULT 'bg-[#f5e9a8]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_sort_order_idx ON public.products (sort_order ASC, name ASC);
CREATE INDEX IF NOT EXISTS products_featured_idx ON public.products (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS collections_sort_order_idx ON public.collections (sort_order ASC, title ASC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS collections_set_updated_at ON public.collections;
CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "collections_public_read" ON public.collections;
CREATE POLICY "collections_public_read"
  ON public.collections
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.collections TO service_role;

-- Seed current catalogue (skips rows that already exist)
INSERT INTO public.products (
  id, name, fabric, image, images, tagline, description, details, colors, sizes, price, badge, featured, sort_order
) VALUES
(
  'oversized-240',
  'The Oversized Tee',
  '240 GSM Premium Cotton',
  '/images/oversized-lavender.png',
  ARRAY[
    '/images/oversized-lavender.png',
    '/images/oversized-brown.png',
    '/images/oversized-maroon.webp'
  ],
  'Structured drape that holds its shape',
  'Heavyweight combed cotton with a boxy, intentional fall. Substantial enough to stand on its own, soft enough to live in all day.',
  ARRAY[
    'Bio-washed combed cotton',
    'Ribbed collar, shoulder taped',
    'Pre-shrunk, colour-locked'
  ],
  ARRAY['Lavender', 'Coffee Brown', 'Maroon'],
  ARRAY['S', 'M', 'L', 'XL', 'XXL'],
  '₹799/-',
  'Top Sale',
  true,
  1
),
(
  'regular-240',
  'The Regular Fit Tee',
  '240 GSM Premium Cotton',
  '/images/regular-white.webp',
  ARRAY[
    '/images/regular-white.webp',
    '/images/regular-black.webp',
    '/images/regular-brown.webp'
  ],
  'The everyday standard, refined',
  'A clean, true-to-size cut for work, travel and everything between. Tailored through the body without ever feeling tight.',
  ARRAY[
    '240 GSM single jersey',
    'Straight hem, no roll',
    'Holds shape past 40 washes'
  ],
  ARRAY['Black', 'White', 'Coffee Brown'],
  ARRAY['S', 'M', 'L', 'XL', 'XXL'],
  '₹699',
  'Top Sale',
  true,
  2
),
(
  'terry-260',
  'The French Terry Oversized',
  '260 GSM French Terry',
  '/images/terry-beige.png',
  ARRAY[
    '/images/terry-beige.png',
    '/images/terry-black.png',
    '/images/terry-white.png'
  ],
  'Weight you can feel, softness you notice',
  'Loopback French terry with a quiet texture and a heavier hand. Our most comfortable piece, built for the whole day.',
  ARRAY[
    '260 GSM loopback terry',
    'Dropped shoulder, relaxed body',
    'Brushed interior'
  ],
  ARRAY['Beige', 'Black', 'White'],
  ARRAY['S', 'M', 'L', 'XL'],
  '₹949/-',
  'Popular',
  true,
  3
),
(
  'terry-300',
  'The French Terry Oversized 300',
  '300 GSM French Terry',
  '/images/terry300-black.png',
  ARRAY['/images/terry300-black.png', '/images/terry300-white.png'],
  'Our heaviest hand, built to last',
  'A denser 300 GSM loopback terry with a sculpted, premium fall. The most substantial piece in the collection, and the one you''ll reach for first.',
  ARRAY[
    '300 GSM loopback terry',
    'Structured oversized silhouette',
    'Reinforced neck and shoulders'
  ],
  ARRAY['Black', 'White'],
  ARRAY['S', 'M', 'L', 'XL'],
  '₹999/-',
  'Popular',
  true,
  4
),
(
  'sun-faded-240',
  'The Sun-Faded Tee',
  '240 GSM Special Wash Cotton',
  '/images/sun-faded-green.png',
  ARRAY[
    '/images/sun-faded-green.png',
    '/images/sun-faded-green-2.png',
    '/images/sun-faded-grey-3.png',
    '/images/sun-faded-grey-2.png'
  ],
  'Faded like a favourite, from day one',
  'A special sun-fade wash on 240 GSM cotton that gives every piece a softened, lived-in tone. Broken in before it reaches you.',
  ARRAY[
    '240 GSM special wash cotton',
    'Tonal sun-faded finish',
    'Soft, worn-in hand feel'
  ],
  ARRAY['Olive Green', 'Grey'],
  ARRAY['S', 'M', 'L', 'XL'],
  '₹1,099/-',
  'New',
  true,
  5
),
(
  'acid-wash',
  'The Lava-sprayed Acid Wash Oversized',
  'Premium Garment-Dyed Cotton',
  '/images/lava-black.png',
  ARRAY[
    '/images/lava-black.png',
    '/images/lava-black-2.png',
    '/images/lava-grey.png'
  ],
  'Character in every wash, no two alike',
  'A hand-finished acid wash on heavyweight cotton. Broken in from day one, with depth that keeps improving.',
  ARRAY[
    'Garment-dyed and hand washed',
    'Unique tonal variation',
    'Softened, worn-in feel'
  ],
  ARRAY['Black', 'Light Grey'],
  ARRAY['S', 'M', 'L', 'XL'],
  '₹1,199/-',
  'New',
  true,
  6
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collections (id, title, image, product_id, tint, sort_order) VALUES
(
  'oversized',
  'Oversized',
  '/images/oversized-lavender.png',
  'oversized-240',
  'bg-[#f5e9a8]',
  1
),
(
  'regular-fit',
  'Regular Fit',
  '/images/regular-white.webp',
  'regular-240',
  'bg-[#f7ecb0]',
  2
),
(
  'french-terry',
  'French Terry',
  '/images/terry-beige.png',
  'terry-260',
  'bg-[#f3e6a0]',
  3
)
ON CONFLICT (id) DO NOTHING;
