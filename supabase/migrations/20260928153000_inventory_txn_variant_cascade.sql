-- Stock history was blocking product edits and deletes.
-- inventory_transactions.variant_id used ON DELETE RESTRICT, so removing a
-- product (which cascades to product_variants) or dropping a colour/size
-- failed while any ledger row still pointed at that variant.
-- Orders keep their own line-item snapshot; this ledger can follow the variant.

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_variant_id_fkey;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_variant_id_fkey
  FOREIGN KEY (variant_id)
  REFERENCES public.product_variants (id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
