"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUY_NOW_KEY } from "@/lib/commerce-constants";
import type { CartItemInput, CustomerAddress, Order } from "@/lib/commerce-types";
import { formatInr, parsePriceInr } from "@/lib/price";

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") === "buy_now" ? "buy_now" : "cart";
  const { customer, cart, openAuth, loading } = useCommerce();
  const { products } = useCatalog();

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
  const [error, setError] = useState("");

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
      const product = products.find((p) => p.id === buyNow.productId);
      const unitPrice = parsePriceInr(product?.price);
      return [
        {
          name: product?.name ?? buyNow.productId,
          image: product?.image ?? "",
          size: buyNow.size,
          color: buyNow.color,
          quantity: buyNow.quantity,
          unitPrice,
          lineTotal: unitPrice * buyNow.quantity,
        },
      ];
    }
    return cart.map((line) => ({
      name: line.productName,
      image: line.productImage,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    }));
  }, [mode, buyNow, products, cart]);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    setSubmitting(true);
    setError("");
    try {
      const payload =
        useNewAddress || !selectedAddressId
          ? {
              mode,
              buyNow: mode === "buy_now" ? buyNow : undefined,
              alternatePhone,
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
              buyNow: mode === "buy_now" ? buyNow : undefined,
              alternatePhone,
              addressId: selectedAddressId,
            };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || "Could not place order.");
        return;
      }
      sessionStorage.removeItem(BUY_NOW_KEY);
      router.push(`/checkout/success?order=${encodeURIComponent(data.order.orderNumber)}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
      <h1 className="font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">Checkout</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Confirm your details and delivery address to place the order.
      </p>

      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-3xl border border-border p-6">
            <h2 className="font-display text-2xl font-bold">Customer details</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{customer.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium break-all">{customer.email}</dd>
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

          <section className="rounded-3xl border border-border p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold">Delivery address</h2>
              {addresses.length ? (
                <button
                  type="button"
                  className="text-xs font-semibold tracking-[0.1em] text-teal uppercase"
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

        <aside className="h-fit rounded-3xl border border-border bg-sand p-6">
          <h2 className="font-display text-2xl font-bold">Order</h2>
          <ul className="mt-4 space-y-4">
            {lines.map((line) => (
              <li key={`${line.name}-${line.size}-${line.color}`} className="flex gap-3 text-sm">
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
                  <p className="mt-1 font-semibold text-teal">{formatInr(line.lineTotal)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-teal">{formatInr(subtotal)}</span>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            disabled={submitting}
            className="mt-6 h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Place Order"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Payment is prepaid at confirmation. No charge is taken on this page yet.
          </p>
        </aside>
      </form>
    </div>
  );
}
