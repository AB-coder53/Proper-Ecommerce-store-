-- Unique checkout session key so repeated Place Order / retries create one order.
-- Idempotent.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_id_uidx
  ON public.orders (checkout_id)
  WHERE checkout_id IS NOT NULL;
