-- Allow admin-added client reviews that are not tied to a store order.
ALTER TABLE public.product_reviews ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE public.product_reviews ALTER COLUMN order_id DROP NOT NULL;
