"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { OrderProcessingOverlay } from "@/components/commerce/OrderProcessingScreen";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildDisplayCartLines,
  displayLineFromInput,
  formatCartIssue,
  validateDisplayCartLines,
  type CartIssue,
  type DisplayCartLine,
} from "@/lib/cart-display";
import { loadCashfreeCheckout } from "@/lib/cashfree-checkout";
import { BUY_NOW_KEY, CHECKOUT_DRAFT_KEY } from "@/lib/commerce-constants";
import type {
  CartItemInput,
  CartLine,
  CheckoutInput,
  CustomerAddress,
  Order,
} from "@/lib/commerce-types";
import type { Product } from "@/lib/catalog-types";
import { formatInr } from "@/lib/price";
import { istefadaUnitOff, resolveIstefadaDiscount } from "@/lib/istefada-offer";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") === "buy_now" ? "buy_now" : "cart";
  const {
    customer,
    cart,
    guestCart,
    openAuth,
    loading,
    applySuccessfulOrder,
    refreshSession,
    openCart,
  } = useCommerce();
  const { products, refresh: refreshCatalog } = useCatalog();
  const { hasOffer, promoCode } = useIstefadaOffer();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState("");
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [buyNow, setBuyNow] = useState<CartItemInput | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<CartIssue[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponQuote, setCouponQuote] = useState<{
    ok: boolean;
    code: string;
    discount: number;
    error?: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const priceSnapshot = useRef<Record<string, number>>({});
  const checkoutIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "",
  );
  const submittingRef = useRef(false);

  useEffect(() => {
    if (mode === "buy_now") {
      try {
        const raw = sessionStorage.getItem(BUY_NOW_KEY);
        setBuyNow(raw ? (JSON.parse(raw) as CartItemInput) : null);
      } catch {
        setBuyNow(null);
      }
    }
  }, [mode]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!customer) return;
    setAlternatePhone(customer.alternatePhone ?? "");
    void (async () => {
      const res = await fetch("/api/customer/addresses");
      if (!res.ok) return;
      const data = (await res.json()) as { addresses: CustomerAddress[] };
      setAddresses(data.addresses);
      const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
      if (def) {
        setSelectedAddressId(def.id);
        setUseNewAddress(false);
      } else {
        setUseNewAddress(true);
      }
    })();
  }, [customer]);

  const lines = useMemo(() => {
    if (mode === "buy_now" && buyNow) {
      return [displayLineFromInput(buyNow, products)];
    }
    return buildDisplayCartLines({
      customer: Boolean(customer),
      cart,
      guestCart,
      products,
    });
  }, [mode, buyNow, customer, cart, guestCart, products]);

  useEffect(() => {
    if (!lines.length || Object.keys(priceSnapshot.current).length) return;
    priceSnapshot.current = Object.fromEntries(lines.map((line) => [line.key, line.unitPrice]));
  }, [lines]);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const istefadaDiscount = hasOffer ? resolveIstefadaDiscount(promoCode, lines) : 0;
  const previewDiscount = couponQuote?.ok ? couponQuote.discount : istefadaDiscount;
  const previewCode = couponQuote?.ok ? couponQuote.code : hasOffer ? promoCode : "";
  const total = Math.max(0, subtotal - previewDiscount);

  const applyCoupon = async () => {
    if (couponBusy) return;
    setCouponBusy(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput,
          lines: lines.map((line) => ({
            productId: line.productId,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await readJsonBody<{
        ok: boolean;
        code: string;
        discount: number;
        error?: string;
      }>(res);
      if (!res.ok) {
        setCouponQuote({
          ok: false,
          code: couponInput,
          discount: 0,
          error: apiErrorMessage(data, "Could not validate coupon."),
        });
        return;
      }
      setCouponQuote(data);
    } catch {
      setCouponQuote({
        ok: false,
        code: couponInput,
        discount: 0,
        error: "Could not validate coupon.",
      });
    } finally {
      setCouponBusy(false);
    }
  };

  const collectFreshLines = async (): Promise<{
    displayLines: DisplayCartLine[];
    freshProducts: Product[];
    foundIssues: CartIssue[];
  }> => {
    const [catalogRes, cartRes] = await Promise.all([
      fetch("/api/catalog?live=1", { cache: "no-store" }),
      customer && mode !== "buy_now" ? fetch("/api/customer/cart") : Promise.resolve(null),
    ]);
    const catalogData = catalogRes.ok
      ? ((await catalogRes.json()) as { products?: Product[] })
      : { products };
    const freshProducts = catalogData.products ?? products;

    let displayLines: DisplayCartLine[];
    if (mode === "buy_now" && buyNow) {
      displayLines = [displayLineFromInput(buyNow, freshProducts)];
    } else if (customer) {
      const cartData =
        cartRes && cartRes.ok
          ? ((await cartRes.json()) as { items?: CartLine[] })
          : { items: cart };
      displayLines = buildDisplayCartLines({
        customer: true,
        cart: cartData.items ?? cart,
        guestCart: [],
        products: freshProducts,
      });
    } else {
      displayLines = buildDisplayCartLines({
        customer: false,
        cart: [],
        guestCart,
        products: freshProducts,
      });
    }

    const foundIssues = validateDisplayCartLines(displayLines, freshProducts);
    for (const line of displayLines) {
      const previousPrice = priceSnapshot.current[line.key];
      if (previousPrice != null && previousPrice !== line.unitPrice) {
        foundIssues.push({
          key: `${line.key}-price`,
          productId: line.productId,
          name: line.name,
          size: line.size,
          color: line.color,
          type: "price",
          message: `The price of ${line.name} has changed. Please review your cart before continuing.`,
        });
      }
    }
    priceSnapshot.current = Object.fromEntries(
      displayLines.map((line) => [line.key, line.unitPrice]),
    );
    return { displayLines, freshProducts, foundIssues };
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setIssues([]);
    let placed = false;
    try {
      const { foundIssues } = await collectFreshLines();
      if (foundIssues.length) {
        await refreshCatalog(true);
        await refreshSession();
        setIssues(foundIssues);
        setError(
          foundIssues.some((issue) => issue.type !== "price")
            ? "Some items in your cart are no longer available."
            : "Please review the updated prices before continuing.",
        );
        return;
      }
      const submittedPromo = couponQuote?.ok
        ? couponQuote.code
        : couponInput.trim() || (hasOffer ? promoCode : undefined);
      const checkoutId = checkoutIdRef.current || undefined;
      const payload: CheckoutInput =
        useNewAddress || !selectedAddressId
          ? {
              mode,
              ...(mode === "buy_now" && buyNow ? { buyNow } : {}),
              alternatePhone,
              ...(submittedPromo ? { promoCode: submittedPromo } : {}),
              ...(checkoutId ? { checkoutId } : {}),
              address: {
                label,
                line1,
                line2,
                city,
                state,
                pincode,
                isDefault: addresses.length === 0,
              },
            }
          : {
              mode,
              ...(mode === "buy_now" && buyNow ? { buyNow } : {}),
              alternatePhone,
              addressId: selectedAddressId,
              ...(submittedPromo ? { promoCode: submittedPromo } : {}),
              ...(checkoutId ? { checkoutId } : {}),
            };

      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(payload));

      const payRes = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const payData = await readJsonBody<{
        skipPayment?: boolean;
        alreadyPaid?: boolean;
        paymentSessionId?: string;
        cashfreeOrderId?: string;
        mode?: "sandbox" | "production";
        error?: string;
      }>(payRes);
      if (!payRes.ok) {
        setError(apiErrorMessage(payData, "Could not start payment. Your cart is unchanged."));
        return;
      }

      const place = async (cashfreeOrderId?: string) => {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, ...(cashfreeOrderId ? { cashfreeOrderId } : {}) }),
        });
        const data = await readJsonBody<{ order?: Order; error?: string }>(res);
        if (!res.ok || !data.order) {
          if (res.status === 409 && typeof crypto !== "undefined" && "randomUUID" in crypto) {
            checkoutIdRef.current = crypto.randomUUID();
          }
          throw Object.assign(
            new Error(apiErrorMessage(data, "Could not place order. Your cart is unchanged.")),
            { status: res.status },
          );
        }
        sessionStorage.removeItem(BUY_NOW_KEY);
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        await applySuccessfulOrder(data.order, mode);
        router.push(
          `/checkout/success?order=${encodeURIComponent(data.order.orderNumber)}${
            data.order.paymentStatus === "paid" ? "&paid=1" : ""
          }`,
        );
      };

      if (payData.skipPayment) {
        await place();
        placed = true;
        return;
      }

      if (payData.alreadyPaid && payData.cashfreeOrderId) {
        await place(payData.cashfreeOrderId);
        placed = true;
        return;
      }

      if (!payData.paymentSessionId || !payData.cashfreeOrderId) {
        setError("Could not start Cashfree checkout. Try again.");
        return;
      }

      setPaying(true);
      const cashfree = await loadCashfreeCheckout(
        payData.mode === "production" ? "production" : "sandbox",
      );
      const result = await cashfree.checkout({
        paymentSessionId: payData.paymentSessionId,
        redirectTarget: "_modal",
      });
      setPaying(false);
      if (result?.error?.message) {
        setError(result.error.message);
        return;
      }
      await place(payData.cashfreeOrderId);
      placed = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
      if (!placed) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Sign in to checkout</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Create an account or log in to place your order.
        </p>
        <Button
          onClick={() => {
            if (mode === "buy_now" && buyNow) {
              openAuth({ type: "buy_now", item: buyNow, redirect: "/checkout?mode=buy_now" });
            } else {
              openAuth({ type: "checkout" });
            }
          }}
          className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          Login / Signup
        </Button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Nothing to checkout</h1>
        <Button
          asChild
          className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          <a href="/collection">Browse Collection</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      {submitting && !paying ? <OrderProcessingOverlay /> : null}
      <h1 className="font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">Checkout</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Confirm your details, then pay securely with Cashfree.
      </p>

      <form
        onSubmit={submit}
        aria-busy={submitting}
        className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
      >
        <div className="min-w-0 space-y-8">
          <section className="min-w-0 rounded-3xl border border-border p-4 sm:p-6">
            <h2 className="font-display text-2xl font-bold">Customer details</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Name</dt>
                <dd className="min-w-0 break-words text-right font-medium">{customer.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Email</dt>
                <dd className="min-w-0 break-all text-right font-medium">{customer.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Primary phone</dt>
                <dd className="font-medium">{customer.phone}</dd>
              </div>
            </dl>
            <div className="mt-5">
              <Label htmlFor="alt-phone">Alternate contact number (optional)</Label>
              <Input
                id="alt-phone"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="mt-1.5 h-11 rounded-full"
                placeholder="Optional"
              />
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-border p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold">Delivery address</h2>
              {addresses.length ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center text-xs font-semibold tracking-[0.1em] text-teal uppercase"
                  onClick={() => setUseNewAddress((v) => !v)}
                >
                  {useNewAddress ? "Use saved" : "New address"}
                </button>
              ) : null}
            </div>

            {!useNewAddress && addresses.length ? (
              <div className="mt-4 space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`block cursor-pointer rounded-2xl border p-4 text-sm ${
                      selectedAddressId === address.id ? "border-foreground" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <p className="font-semibold">{address.label}</p>
                    <p className="mt-1 text-muted-foreground">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {address.city}, {address.state} {address.pincode}
                    </p>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="mt-1.5 h-11 rounded-full"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input
                    id="line1"
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="mt-1.5 h-11 rounded-full"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line2">Address line 2</Label>
                  <Input
                    id="line2"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="mt-1.5 h-11 rounded-full"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 h-11 rounded-full"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1.5 h-11 rounded-full"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">PIN code</Label>
                  <Input
                    id="pincode"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="mt-1.5 h-11 rounded-full"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit min-w-0 rounded-3xl border border-border bg-sand p-4 sm:p-6">
          <h2 className="font-display text-2xl font-bold">Order</h2>
          <ul className="mt-4 space-y-4">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-3 text-sm">
                <img
                  src={line.image}
                  alt=""
                  className="size-16 rounded-xl object-cover object-top"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-muted-foreground">
                    {line.color} · {line.size} · Qty {line.quantity}
                  </p>
                  <p className="mt-1 font-semibold text-teal">
                    {hasOffer ? (
                      <span className="flex flex-col">
                        <span className="text-xs font-normal text-muted-foreground line-through">
                          {formatInr(line.lineTotal)}
                        </span>
                        <span>
                          {formatInr(
                            (line.unitPrice - istefadaUnitOff(line.unitPrice)) * line.quantity,
                          )}
                        </span>
                      </span>
                    ) : (
                      formatInr(line.lineTotal)
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value);
                  setCouponQuote(null);
                }}
                placeholder="Coupon code"
                className="h-11 rounded-full"
              />
              <Button
                type="button"
                variant="outline"
                disabled={couponBusy || !couponInput.trim()}
                onClick={() => void applyCoupon()}
                className="h-11 shrink-0 rounded-full"
              >
                {couponBusy ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
            {couponQuote && !couponQuote.ok ? (
              <p className="text-xs text-destructive">
                {couponQuote.error || "This coupon is not valid."}
              </p>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>Free</span>
            </div>
            {previewDiscount > 0 ? (
              <div className="flex justify-between text-teal">
                <span>{previewCode || "Discount"}</span>
                <span>-{formatInr(previewDiscount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-teal">{formatInr(total)}</span>
            </div>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {issues.length ? (
            <>
              <ul className="mt-3 space-y-2 text-sm text-destructive" role="alert">
                {issues.map((issue) => (
                  <li
                    key={`${issue.key}-${issue.type}`}
                    className="rounded-2xl border border-destructive/30 bg-background px-3 py-2"
                  >
                    <p className="font-medium">{formatCartIssue(issue)}</p>
                    <p className="mt-1 text-xs leading-relaxed">{issue.message}</p>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                onClick={openCart}
                className="mt-3 h-11 w-full rounded-full text-xs font-semibold tracking-[0.12em] uppercase"
              >
                Review cart
              </Button>
            </>
          ) : null}
          <Button
            type="submit"
            disabled={submitting}
            className="mt-6 h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {paying ? "Waiting for payment..." : "Confirming payment..."}
              </>
            ) : (
              `Pay ${formatInr(total)}`
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Prepaid via Cashfree. UPI, cards, and netbanking. Inventory is reserved only after
            payment succeeds.
          </p>
        </aside>
      </form>
    </div>
  );
}
