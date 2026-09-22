-- Badges, coupons, compare-at pricing, invoice numbers, bundle pricing types.
-- Idempotent.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price text;

CREATE TABLE IF NOT EXISTS public.product_badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  tone text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_badge_assignments (
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.product_badges (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('percent', 'fixed', 'per_item_fixed')),
  value integer NOT NULL CHECK (value > 0),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_value integer NOT NULL DEFAULT 0,
  max_discount integer,
  usage_limit integer,
  usage_per_customer integer,
  product_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (upper(code));

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons (id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  customer_id uuid,
  code text NOT NULL,
  discount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bundle_discount integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'prepaid';

CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_idx
  ON public.orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

ALTER TABLE public.bundle_offers DROP CONSTRAINT IF EXISTS bundle_offers_bundle_price_check;
ALTER TABLE public.bundle_offers ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'fixed';
ALTER TABLE public.bundle_offers ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS product_badges_set_updated_at ON public.product_badges;
CREATE TRIGGER product_badges_set_updated_at
  BEFORE UPDATE ON public.product_badges
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS coupons_set_updated_at ON public.coupons;
CREATE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.product_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_badge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_badges_public_read" ON public.product_badges;
CREATE POLICY "product_badges_public_read"
  ON public.product_badges FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "product_badge_assignments_public_read" ON public.product_badge_assignments;
CREATE POLICY "product_badge_assignments_public_read"
  ON public.product_badge_assignments FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.product_badges TO anon, authenticated;
GRANT SELECT ON public.product_badge_assignments TO anon, authenticated;
GRANT ALL ON public.product_badges TO service_role;
GRANT ALL ON public.product_badge_assignments TO service_role;
GRANT ALL ON public.coupons TO service_role;
GRANT ALL ON public.coupon_redemptions TO service_role;

INSERT INTO public.product_badges (id, name, label, active, sort_order, tone)
VALUES
  ('new', 'New', 'NEW', true, 10, 'teal'),
  ('bestseller', 'Bestseller', 'BESTSELLER', true, 20, 'ink'),
  ('limited', 'Limited', 'LIMITED', true, 30, 'sale'),
  ('trending', 'Trending', 'TRENDING', true, 40, 'default'),
  ('sale', 'Sale', 'SALE', true, 50, 'sale'),
  ('featured', 'Featured', 'FEATURED', true, 60, 'teal'),
  ('sold-out', 'Sold Out', 'SOLD OUT', true, 70, 'ink')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.coupons (code, name, type, value, active)
SELECT 'ISTEFADA100', 'Istefada ₹100 off each item', 'per_item_fixed', 100, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.coupons WHERE upper(code) = 'ISTEFADA100'
);
