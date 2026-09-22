-- Admin-configured bundle offers and shipping/delivery estimate settings.

CREATE TABLE IF NOT EXISTS public.bundle_offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  product_ids TEXT[] NOT NULL DEFAULT '{}',
  show_on_product_ids TEXT[] NOT NULL DEFAULT '{}',
  bundle_price INTEGER NOT NULL CHECK (bundle_price > 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bundle_offers_active_idx
  ON public.bundle_offers (active, deleted_at, sort_order);

CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN NOT NULL DEFAULT true,
  processing_min_days INTEGER NOT NULL DEFAULT 2,
  processing_max_days INTEGER NOT NULL DEFAULT 3,
  handling_days INTEGER NOT NULL DEFAULT 0,
  shipping_min_days INTEGER NOT NULL DEFAULT 5,
  shipping_max_days INTEGER NOT NULL DEFAULT 7,
  business_days_only BOOLEAN NOT NULL DEFAULT true,
  product_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.shipping_settings (
  id,
  enabled,
  processing_min_days,
  processing_max_days,
  handling_days,
  shipping_min_days,
  shipping_max_days,
  business_days_only,
  product_rules
) VALUES (
  'default',
  true,
  2,
  3,
  0,
  5,
  7,
  true,
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS bundle_offers_set_updated_at ON public.bundle_offers;
CREATE TRIGGER bundle_offers_set_updated_at
  BEFORE UPDATE ON public.bundle_offers
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS shipping_settings_set_updated_at ON public.shipping_settings;
CREATE TRIGGER shipping_settings_set_updated_at
  BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.bundle_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bundle_offers_public_read" ON public.bundle_offers;
CREATE POLICY "bundle_offers_public_read"
  ON public.bundle_offers
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "shipping_settings_public_read" ON public.shipping_settings;
CREATE POLICY "shipping_settings_public_read"
  ON public.shipping_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.bundle_offers TO anon, authenticated;
GRANT SELECT ON public.shipping_settings TO anon, authenticated;
GRANT ALL ON public.bundle_offers TO service_role;
GRANT ALL ON public.shipping_settings TO service_role;
