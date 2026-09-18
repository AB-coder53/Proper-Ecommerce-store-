-- AB Collection commerce: customers, addresses, wishlist, cart, orders
-- Idempotent. Run in Supabase SQL editor if tables are missing.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Customers ----------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  alternate_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique
  ON public.customers (lower(email));

CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers (phone);

-- ---------- Addresses ----------
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx
  ON public.customer_addresses (customer_id);

-- ---------- Wishlist ----------
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlist_customer_idx ON public.wishlist_items (customer_id);

-- ---------- Cart ----------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id, size, color)
);

CREATE INDEX IF NOT EXISTS cart_customer_idx ON public.cart_items (customer_id);

-- ---------- Orders ----------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  alternate_phone text,
  address_line1 text NOT NULL,
  address_line2 text,
  address_city text NOT NULL,
  address_state text NOT NULL,
  address_pincode text NOT NULL,
  subtotal integer NOT NULL,
  shipping_cost integer NOT NULL DEFAULT 0,
  discount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status text NOT NULL DEFAULT 'placed'
    CHECK (order_status IN (
      'placed', 'confirmed', 'processing', 'packed', 'shipped',
      'out_for_delivery', 'delivered', 'cancelled', 'failed', 'returned'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_email_idx ON public.orders (lower(customer_email));
CREATE INDEX IF NOT EXISTS orders_number_idx ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (order_status);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_image text,
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price integer NOT NULL,
  line_total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);

-- ---------- RLS ----------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- No public policies: all access via service role from Next.js API routes.
-- This keeps customer data private (passwords, orders, phones).

COMMENT ON TABLE public.customers IS 'Storefront customer accounts (bcrypt password_hash). Accessed via service role only.';
COMMENT ON TABLE public.orders IS 'Purchase orders with frozen prices at purchase time (amounts in INR rupees).';
