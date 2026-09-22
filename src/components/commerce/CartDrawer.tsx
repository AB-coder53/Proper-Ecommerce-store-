"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { ColorSwatchRow } from "@/components/site/ColorSwatchRow";
import { ProductImage } from "@/components/site/ProductImage";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildDisplayCartLines,
  linePricing,
  qualifyingBundles,
  validateDisplayCartLines,
  type DisplayCartLine,
} from "@/lib/cart-display";
import { availableStock, quantityCap, stockStatusLabel } from "@/lib/inventory";
import { CART_MAX_QUANTITY } from "@/lib/commerce-constants";
import { formatInr } from "@/lib/price";
import { resolveIstefadaDiscount } from "@/lib/istefada-offer";
import type { BundleOfferView } from "@/lib/store-offers";

export function CartDrawer() {
  const router = useRouter();
  const {
    customer,
    cart,
    guestCart,
    cartDrawerOpen,
    closeCart,
    cartCount,
    openAuth,
    updateCartQuantity,
    updateCartVariant,
    removeFromCart,
  } = useCommerce();
  const { products } = useCatalog();
  const { hasOffer, promoCode, discountInr } = useIstefadaOffer();
  const [bundles, setBundles] = useState<BundleOfferView[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fetchedBundles = useRef(false);

  useEffect(() => {
    if (!cartDrawerOpen || fetchedBundles.current) return;
    fetchedBundles.current = true;
    void fetch("/api/bundles")
      .then((res) => res.json())
      .then((data: { bundles?: BundleOfferView[] }) => setBundles(data.bundles ?? []))
      .catch(() => setBundles([]));
  }, [cartDrawerOpen]);

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
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = hasOffer ? resolveIstefadaDiscount(promoCode, lines) : 0;
  const total = Math.max(0, subtotal - discount);
  const appliedBundles = qualifyingBundles(
    bundles,
    lines.map((line) => line.productId),
  );

  const checkout = () => {
    closeCart();
    if (!customer) {
      openAuth({ type: "checkout" });
      return;
    }
    router.push("/checkout");
  };

  return (
    <Sheet open={cartDrawerOpen} onOpenChange={(open) => (open ? undefined : closeCart())}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-[min(100%,26rem)] flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle className="font-display text-2xl">Cart</SheetTitle>
          <SheetDescription>
            {cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"}` : "Your cart is empty."}
          </SheetDescription>
        </SheetHeader>
        <p className="sr-only" aria-live="polite">
          {cartCount ? `${cartCount} items in your cart.` : "Your cart is empty."}
        </p>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {lines.length ? (
            <ul className="space-y-4">
              {lines.map((line) => (
                <CartDrawerItem
                  key={line.key}
                  line={line}
                  issue={issueByKey[line.key]}
                  hasOffer={hasOffer}
                  busy={busyKey === line.key}
                  onBusy={setBusyKey}
                  onQuantity={updateCartQuantity}
                  onVariant={updateCartVariant}
                  onRemove={removeFromCart}
                />
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Browse the collection and add your favourites.
            </p>
          )}

          {appliedBundles.length ? (
            <div className="mt-6 space-y-3">
              {appliedBundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="rounded-2xl border border-teal/30 bg-accent px-4 py-3"
                >
                  <p className="text-xs font-semibold tracking-[0.12em] text-teal uppercase">
                    Bundle offer applied
                  </p>
                  <p className="mt-1 text-sm font-medium">{bundle.title}</p>
                  {bundle.savings > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Save {bundle.savingsLabel} ({bundle.savingsPercent}%) when you check out this
                      set.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          {lines.length ? (
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatInr(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-teal">
                  <span>
                    Istefada ₹{discountInr} × {cartCount}
                  </span>
                  <span className="font-semibold">-{formatInr(discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-teal">{formatInr(total)}</span>
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            disabled={!lines.length || issues.length > 0}
            onClick={checkout}
            className="h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
          >
            Checkout
          </Button>
          {issues.length ? (
            <p className="mt-3 text-center text-xs text-destructive">
              Update unavailable quantities before checking out.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartDrawerItem({
  line,
  issue,
  hasOffer,
  busy,
  onBusy,
  onQuantity,
  onVariant,
  onRemove,
}: {
  line: DisplayCartLine;
  issue?: { message: string } | undefined;
  hasOffer: boolean;
  busy: boolean;
  onBusy: (key: string | null) => void;
  onQuantity: (itemId: string, quantity: number) => Promise<{ ok: boolean; error?: string }>;
  onVariant: (
    itemId: string,
    size: string,
    color: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onRemove: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const priced = linePricing(line, hasOffer);
  const colors = line.product?.colors ?? [];
  const sizes = line.product?.sizes ?? [];
  const stock = availableStock(line.product, line.color, line.size, CART_MAX_QUANTITY);
  const maxQty = quantityCap(stock);
  const [qty, setQty] = useState(line.quantity);

  useEffect(() => {
    setQty(line.quantity);
  }, [line.quantity]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    if (busy) return;
    onBusy(line.key);
    await fn();
    onBusy(null);
  };

  const changeQty = (next: number) => {
    const clamped = Math.max(0, Math.min(maxQty || 0, next));
    setQty(clamped || 0);
    void onQuantity(line.key, clamped);
  };

  return (
    <li className="flex min-w-0 gap-3 rounded-2xl border border-border p-3">
      <ProductImage
        src={line.image}
        alt=""
        width={192}
        height={192}
        sizes="96px"
        className="size-20 shrink-0 rounded-xl object-cover object-top sm:size-24"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-semibold break-words">{line.name}</h3>
          <button
            type="button"
            aria-label={`Remove ${line.name}`}
            disabled={busy}
            onClick={() => void run(() => onRemove(line.key))}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {colors.length ? (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Colour</p>
              <ColorSwatchRow
                colors={colors}
                selected={line.color}
                disabled={busy || colors.length < 2}
                label={`Colour for ${line.name}`}
                onSelect={
                  colors.length > 1
                    ? (color) => void run(() => onVariant(line.key, line.size, color))
                    : undefined
                }
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Colour: {line.color}</p>
          )}
          {sizes.length > 1 ? (
            <label className="min-w-0 text-xs text-muted-foreground">
              Size
              <select
                value={line.size}
                disabled={busy}
                aria-label={`Size for ${line.name}`}
                onChange={(event) =>
                  void run(() => onVariant(line.key, event.target.value, line.color))
                }
                className="mt-1 h-11 w-full min-w-0 rounded-full border border-border bg-background px-3 text-sm text-foreground"
              >
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">Size: {line.size}</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div
            className="inline-flex items-center gap-1 rounded-full border border-border px-1 py-1"
            aria-label={`Quantity for ${line.name}`}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={busy}
              onClick={() => changeQty(qty - 1)}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-6 text-center text-sm font-medium" aria-live="polite">
              {qty !== line.quantity || busy ? (
                <Loader2 className="mx-auto size-3.5 animate-spin" />
              ) : (
                qty
              )}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={busy || qty >= maxQty}
              onClick={() => changeQty(qty + 1)}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="text-right">
            {hasOffer && priced.savings > 0 ? (
              <>
                <p className="text-xs text-muted-foreground line-through">
                  {formatInr(priced.originalLine)}
                </p>
                <p className="text-sm font-semibold text-teal">
                  {formatInr(priced.discountedLine)}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-teal">{formatInr(line.lineTotal)}</p>
            )}
            <p className="text-xs text-muted-foreground">{formatInr(line.unitPrice)} each</p>
          </div>
        </div>
        {issue ? <p className="mt-2 text-xs text-destructive">{issue.message}</p> : null}
        {!issue && line.product?.variants?.length ? (
          <p className="mt-2 text-xs text-muted-foreground">{stockStatusLabel(stock)}</p>
        ) : null}
        {hasOffer && priced.savings > 0 ? (
          <p className="mt-2 text-xs text-teal">You save {formatInr(priced.savings)}</p>
        ) : null}
      </div>
    </li>
  );
}
