-- Product reviews and idempotent order notification log.
-- Idempotent.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url text;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  variant_id text,
  color text,
  size text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text NOT NULL,
  customer_name text,
  customer_email text,
  order_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_purchase boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id, order_id)
);

CREATE INDEX IF NOT EXISTS product_reviews_product_idx
  ON public.product_reviews (product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_reviews_customer_idx
  ON public.product_reviews (customer_id);
CREATE INDEX IF NOT EXISTS product_reviews_order_idx
  ON public.product_reviews (order_id);
CREATE INDEX IF NOT EXISTS product_reviews_status_idx
  ON public.product_reviews (status);

CREATE TABLE IF NOT EXISTS public.order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid,
  event_type text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id text,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_type, channel)
);

CREATE INDEX IF NOT EXISTS order_notifications_order_idx
  ON public.order_notifications (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_notifications_event_idx
  ON public.order_notifications (event_type, status);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.product_reviews;
CREATE POLICY "Service role full access"
  ON public.product_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.order_notifications;
CREATE POLICY "Service role full access"
  ON public.order_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
