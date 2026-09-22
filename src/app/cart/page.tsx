"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { ColorSwatchRow } from "@/components/site/ColorSwatchRow";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/price";
import { istefadaUnitOff, resolveIstefadaDiscount } from "@/lib/istefada-offer";
import { buildDisplayCartLines, validateDisplayCartLines } from "@/lib/cart-display";
import { availableStock, quantityCap } from "@/lib/inventory";
import { CART_MAX_QUANTITY } from "@/lib/commerce-constants";

export default function CartPage() {
  const router = useRouter();
  const {
    customer,
    cart,
    guestCart,
    openAuth,
    updateCartQuantity,
    updateCartVariant,
    removeFromCart,
  } = useCommerce();
  const { products, refresh } = useCatalog();
  const { hasOffer, promoCode, discountInr } = useIstefadaOffer();

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  const lines = useMemo(
    () =>
      buildDisplayCartLines({
        customer: Boolean(customer),
        cart,
        guestCart,
        products,
      }),
    [customer, cart, guestCart, products],
  );
  const issues = useMemo(() => validateDisplayCartLines(lines, products), [lines, products]);
  const issueByKey = useMemo(
    () => Object.fromEntries(issues.map((issue) => [issue.key, issue])),
    [issues],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  );
  const itemCount = useMemo(() => lines.reduce((n, line) => n + line.quantity, 0), [lines]);
  const discount = hasOffer ? resolveIstefadaDiscount(promoCode, lines) : 0;
  const total = Math.max(0, subtotal - discount);

  const checkout = () => {
    if (issues.length) return;
    if (!customer) {
      openAuth({ type: "checkout" });
      return;
    }
    router.push("/checkout");
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        Your Cart
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {lines.length ? `${lines.length} item(s) in your bag.` : "Your cart is empty."}
      </p>

      {!lines.length ? (
        <div className="mt-10 rounded-3xl border border-border bg-sand p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Browse the collection and add your favourites.
          </p>
          <Button
            asChild
            className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
          >
            <Link href="/collection">Shop Collection</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            {lines.map((line) => {
              const stock = availableStock(line.product, line.color, line.size, CART_MAX_QUANTITY);
              const maxQty = quantityCap(stock);
              const issue = issueByKey[line.key];
              return (
                <article
                  key={line.key}
                  className="flex gap-4 rounded-3xl border border-border bg-background p-4"
                >
                  <img
                    src={line.image}
                    alt={line.name}
                    className="size-24 rounded-2xl object-cover object-top sm:size-28"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">{line.name}</h2>
                        <ColorSwatchRow
                          colors={line.product?.colors ?? [line.color]}
                          selected={line.color}
                          label={`Colour for ${line.name}`}
                          onSelect={
                            (line.product?.colors?.length ?? 0) > 1
                              ? (color) => void updateCartVariant(line.key, line.size, color)
                              : undefined
                          }
                          className="mt-1.5 -ml-1"
                        />
                        <p className="mt-1 text-sm text-muted-foreground">Size {line.size}</p>
                        <p className="mt-2 text-sm font-semibold text-teal">
                          {hasOffer ? (
                            <span className="flex flex-col">
                              <span className="text-xs font-normal text-muted-foreground line-through">
                                {formatInr(line.unitPrice)}
                              </span>
                              <span>
                                {formatInr(line.unitPrice - istefadaUnitOff(line.unitPrice))}
                              </span>
                            </span>
                          ) : (
                            formatInr(line.unitPrice)
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove"
                        onClick={() => void removeFromCart(line.key)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-border px-2 py-1">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => void updateCartQuantity(line.key, line.quantity - 1)}
                        className="rounded-full p-1 hover:bg-muted"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-medium">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={line.quantity >= maxQty}
                        onClick={() => void updateCartQuantity(line.key, line.quantity + 1)}
                        className="rounded-full p-1 hover:bg-muted disabled:opacity-40"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    {issue ? (
                      <p className="mt-2 text-xs text-destructive">{issue.message}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-sand p-6">
            <h2 className="font-display text-2xl font-bold">Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatInr(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">Free</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-teal">
                  <span>
                    Istefada ₹{discountInr} × {itemCount}
                  </span>
                  <span className="font-semibold">-{formatInr(discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-teal">{formatInr(total)}</span>
              </div>
            </div>
            <Button
              onClick={checkout}
              disabled={issues.length > 0}
              className="mt-6 h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
            >
              Checkout
            </Button>
            {issues.length ? (
              <p className="mt-3 text-center text-xs text-destructive">
                Update unavailable quantities before checking out.
              </p>
            ) : null}
            {!customer ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Guest carts are saved on this device. Login to sync across devices.
              </p>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
