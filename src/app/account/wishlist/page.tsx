"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { VariantSelectDialog } from "@/components/site/VariantSelectDialog";
import { Button } from "@/components/ui/button";
import { resolveDirectCartVariant } from "@/lib/product-variants";

export default function WishlistPage() {
  const { customer, loading, openAuth, wishlist, toggleWishlist, addToCart } = useCommerce();
  const { products } = useCatalog();
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/wishlist" });
  }, [customer, loading, openAuth]);

  if (!customer) return <div className="min-h-[40vh]" />;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        Wishlist
      </h1>

      {!wishlist.length ? (
        <div className="mt-10 rounded-3xl border border-border bg-sand p-8 text-center">
          <p className="text-sm text-muted-foreground">No saved pieces yet.</p>
          <Button
            asChild
            className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
          >
            <Link href="/collection">Browse Collection</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return (
              <article key={item.id} className="rounded-3xl border border-border p-4">
                <Link href={`/collection/${item.productId}`}>
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="aspect-[4/5] w-full rounded-2xl object-cover object-top"
                  />
                </Link>
                <h2 className="mt-4 font-semibold">{item.productName}</h2>
                <p className="mt-1 text-sm text-teal">{item.priceLabel}</p>
                <div className="mt-4 grid gap-2">
                  <Button
                    disabled={busy === item.productId}
                    onClick={() => {
                      if (!product) return;
                      const direct = resolveDirectCartVariant(product);
                      if (!direct) {
                        setPickerId(product.id);
                        return;
                      }
                      setBusy(item.productId);
                      void addToCart(direct).finally(() => setBusy(null));
                    }}
                    className="h-10 rounded-full bg-teal text-xs tracking-[0.12em] text-teal-foreground uppercase"
                  >
                    Move to Cart
                  </Button>
                  {product && pickerId === product.id ? (
                    <VariantSelectDialog
                      product={product}
                      open
                      onOpenChange={(open) => setPickerId(open ? product.id : null)}
                    />
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => void toggleWishlist(item.productId)}
                    className="h-10 rounded-full text-xs tracking-[0.12em] uppercase"
                  >
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
