-- Variant-level inventory + atomic stock mutations + order snapshots.
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  color text NOT NULL,
  size text NOT NULL,
  sku text NOT NULL,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color, size),
  UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON public.product_variants (product_id);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  product_id text NOT NULL,
  sku text NOT NULL,
  color text NOT NULL,
  size text NOT NULL,
  delta integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text NOT NULL CHECK (
    reason IN (
      'ORDER_CONFIRMED',
      'ORDER_CANCELLED',
      'ORDER_REFUNDED',
      'ORDER_RELEASED',
      'ADMIN_ADJUSTMENT',
      'STOCK_RESTOCK'
    )
  ),
  order_id uuid,
  order_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_txn_order_reason_variant_idx
  ON public.inventory_transactions (order_id, reason, variant_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_txn_variant_idx ON public.inventory_transactions (variant_id);
CREATE INDEX IF NOT EXISTS inventory_txn_order_idx ON public.inventory_transactions (order_id);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku text;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_state text NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_inventory_state_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_inventory_state_check
      CHECK (inventory_state IN ('none', 'deducted', 'restored'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS product_variants_set_updated_at ON public.product_variants;
CREATE TRIGGER product_variants_set_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.apply_variant_stock_change(
  p_variant_id uuid,
  p_delta integer,
  p_reason text,
  p_order_id uuid DEFAULT NULL,
  p_order_number text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.product_variants%ROWTYPE;
  v_prev integer;
  v_new integer;
  v_existing uuid;
BEGIN
  IF p_delta = 0 THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'stock', 0);
  END IF;

  IF p_order_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.inventory_transactions
    WHERE order_id = p_order_id
      AND reason = p_reason
      AND variant_id = p_variant_id;
    IF FOUND THEN
      SELECT stock INTO v_prev FROM public.product_variants WHERE id = p_variant_id;
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'stock', COALESCE(v_prev, 0));
    END IF;
  END IF;

  SELECT * INTO v_row
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'variant_not_found', 'stock', 0);
  END IF;

  v_prev := v_row.stock;
  v_new := v_prev + p_delta;
  IF v_new < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_stock', 'stock', v_prev);
  END IF;

  UPDATE public.product_variants
  SET stock = v_new, updated_at = now()
  WHERE id = p_variant_id;

  INSERT INTO public.inventory_transactions (
    variant_id, product_id, sku, color, size, delta, previous_stock, new_stock,
    reason, order_id, order_number
  ) VALUES (
    v_row.id, v_row.product_id, v_row.sku, v_row.color, v_row.size, p_delta, v_prev, v_new,
    p_reason, p_order_id, p_order_number
  );

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'previous', v_prev, 'stock', v_new);
END;
$$;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;
GRANT ALL ON public.inventory_transactions TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_variant_stock_change(uuid, integer, text, uuid, text) TO service_role;

INSERT INTO public.product_variants (product_id, color, size, sku, stock)
SELECT
  p.id,
  btrim(c.color),
  btrim(s.size),
  lower(
    p.id
    || '--'
    || regexp_replace(lower(btrim(c.color)), '[^a-z0-9]+', '-', 'g')
    || '--'
    || regexp_replace(lower(btrim(s.size)), '[^a-z0-9]+', '-', 'g')
  ),
  10
FROM public.products p
CROSS JOIN LATERAL unnest(p.colors) AS c(color)
CROSS JOIN LATERAL unnest(p.sizes) AS s(size)
WHERE btrim(c.color) <> '' AND btrim(s.size) <> ''
ON CONFLICT (product_id, color, size) DO NOTHING;
 