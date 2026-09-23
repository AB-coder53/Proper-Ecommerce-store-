"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCatalog } from "@/components/site/CatalogProvider";
import {
  AUTH_INTENT_KEY,
  BUY_NOW_KEY,
  CART_MAX_QUANTITY,
  GUEST_CART_KEY,
} from "@/lib/commerce-constants";
import { guestLineKey } from "@/lib/cart-display";
import { availableStock, quantityCap, stockShortageMessage } from "@/lib/inventory";
import { safeInternalPath } from "@/lib/safe-redirect";
import type {
  CartItemInput,
  CartLine,
  CustomerPublic,
  Order,
  WishlistItem,
} from "@/lib/commerce-types";

const AuthModal = dynamic(
  () => import("@/components/commerce/AuthModal").then((mod) => mod.AuthModal),
  { ssr: false },
);

type AuthIntent =
  | { type: "buy_now"; item: CartItemInput; redirect?: string }
  | { type: "wishlist"; productId: string }
  | { type: "checkout" }
  | { type: "generic"; redirect?: string }
  | null;

type CommerceContextValue = {
  customer: CustomerPublic | null;
  loading: boolean;
  cart: CartLine[];
  guestCart: CartItemInput[];
  cartCount: number;
  wishlist: WishlistItem[];
  wishlistIds: Set<string>;
  authOpen: boolean;
  openAuth: (intent?: AuthIntent) => void;
  closeAuth: () => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  addToCart: (
    item: CartItemInput,
    opts?: { silent?: boolean; skipDrawer?: boolean },
  ) => Promise<{ ok: boolean; error?: string }>;
  buyNow: (item: CartItemInput) => Promise<void>;
  updateCartQuantity: (
    itemId: string,
    quantity: number,
  ) => Promise<{ ok: boolean; error?: string }>;
  updateCartVariant: (
    itemId: string,
    size: string,
    color: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  removeFromCart: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
  applySuccessfulOrder: (order: Order, mode: "cart" | "buy_now") => Promise<void>;
  cartDrawerOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  moveWishlistToCart: (productId: string, size: string, color: string) => Promise<void>;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

function readGuestCart(): CartItemInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as CartItemInput[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartItemInput[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function useCommerce() {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { products, refresh: refreshCatalog } = useCatalog();
  const [customer, setCustomer] = useState<CustomerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [guestCart, setGuestCart] = useState<CartItemInput[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const addLocks = useRef(new Set<string>());
  const wishlistLocks = useRef(new Set<string>());
  const qtyLocks = useRef(new Map<string, Promise<unknown>>());
  const pendingQty = useRef(new Map<string, number>());
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const openCart = useCallback(() => setCartDrawerOpen(true), []);
  const closeCart = useCallback(() => setCartDrawerOpen(false), []);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/customer/auth");
    const data = (await res.json()) as { customer: CustomerPublic | null };
    setCustomer(data.customer);
    if (data.customer) {
      const [cartRes, wishRes] = await Promise.all([
        fetch("/api/customer/cart"),
        fetch("/api/customer/wishlist"),
      ]);
      const cartData = (await cartRes.json()) as { items: CartLine[] };
      const wishData = (await wishRes.json()) as { items: WishlistItem[] };
      setCart(cartData.items ?? []);
      setWishlist(wishData.items ?? []);
    } else {
      setCart([]);
      setWishlist([]);
    }
  }, []);

  useEffect(() => {
    setGuestCart(readGuestCart());
    void (async () => {
      try {
        await refreshSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshSession]);

  const openAuth = useCallback((intent: AuthIntent = { type: "generic" }) => {
    setAuthIntent(intent);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
    }
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    setAuthIntent(null);
    if (typeof window !== "undefined") sessionStorage.removeItem(AUTH_INTENT_KEY);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/customer/auth", { method: "DELETE" });
    setCustomer(null);
    setCart([]);
    setWishlist([]);
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }, [router]);

  const addToCart = useCallback(
    async (item: CartItemInput, opts?: { silent?: boolean; skipDrawer?: boolean }) => {
      const lockKey = guestLineKey(item);
      if (addLocks.current.has(lockKey)) {
        return { ok: false, error: "Already adding this item." };
      }
      addLocks.current.add(lockKey);
      try {
        if (!customer) {
          const next = [...readGuestCart()];
          const product = products.find((row) => row.id === item.productId);
          const stock = availableStock(product, item.color, item.size, CART_MAX_QUANTITY);
          const existingQty = next.find((row) => guestLineKey(row) === lockKey)?.quantity ?? 0;
          if (stock <= 0 || existingQty + item.quantity > stock) {
            const error = stockShortageMessage({
              name: product?.name ?? item.productId,
              color: item.color,
              size: item.size,
              requested: existingQty + item.quantity,
              stock,
            });
            if (!opts?.silent) toast.error(error);
            return { ok: false, error };
          }
          const idx = next.findIndex((row) => guestLineKey(row) === lockKey);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx]!,
              quantity: Math.min(quantityCap(stock), next[idx]!.quantity + item.quantity),
            };
          } else {
            next.push({ ...item, quantity: Math.min(quantityCap(stock), item.quantity) });
          }
          writeGuestCart(next);
          setGuestCart(next);
          if (!opts?.silent) toast.success("Added to cart");
          if (!opts?.skipDrawer) openCart();
          return { ok: true };
        }

        const res = await fetch("/api/customer/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        const data = (await res.json()) as { items?: CartLine[]; error?: string };
        if (!res.ok) {
          const error = data.error || "Unable to add this item to your cart. Please try again.";
          if (!opts?.silent) toast.error(error);
          return { ok: false, error };
        }
        setCart(data.items ?? []);
        if (!opts?.silent) toast.success("Added to cart");
        if (!opts?.skipDrawer) openCart();
        return { ok: true };
      } catch {
        const error = "Unable to add this item to your cart. Please try again.";
        if (!opts?.silent) toast.error(error);
        return { ok: false, error };
      } finally {
        addLocks.current.delete(lockKey);
      }
    },
    [customer, openCart, products],
  );

  const buyNow = useCallback(
    async (item: CartItemInput) => {
      sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
      if (!customer) {
        openAuth({ type: "buy_now", item, redirect: "/checkout?mode=buy_now" });
        return;
      }
      router.push("/checkout?mode=buy_now");
    },
    [customer, openAuth, router],
  );

  const updateCartQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      pendingQty.current.set(itemId, quantity);
      const previous = qtyLocks.current.get(itemId) ?? Promise.resolve();
      let release: (value?: unknown) => void = () => undefined;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const queued = previous.then(() => gate);
      qtyLocks.current.set(itemId, queued);
      await previous.catch(() => undefined);
      const nextQty = pendingQty.current.get(itemId) ?? quantity;
      pendingQty.current.delete(itemId);
      const snapshot = cartRef.current;
      try {
        if (!customer) {
          const items = readGuestCart();
          const current = items.find((row) => guestLineKey(row) === itemId);
          if (current && nextQty > 0) {
            const product = products.find((row) => row.id === current.productId);
            const stock = availableStock(product, current.color, current.size, CART_MAX_QUANTITY);
            if (nextQty > stock) {
              const error = stockShortageMessage({
                name: product?.name ?? current.productId,
                color: current.color,
                size: current.size,
                requested: nextQty,
                stock,
              });
              toast.error(error);
              return { ok: false, error };
            }
          }
          const next = items
            .map((row) => (guestLineKey(row) === itemId ? { ...row, quantity: nextQty } : row))
            .filter((row) => row.quantity > 0);
          writeGuestCart(next);
          setGuestCart(next);
          return { ok: true };
        }
        setCart((current) =>
          current
            .map((line) =>
              line.id === itemId
                ? { ...line, quantity: nextQty, lineTotal: line.unitPrice * nextQty }
                : line,
            )
            .filter((line) => line.quantity > 0),
        );
        const res = await fetch("/api/customer/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setQuantity", itemId, quantity: nextQty }),
        });
        const data = (await res.json()) as { items?: CartLine[]; error?: string };
        if (!res.ok) {
          setCart(snapshot);
          toast.error(data.error || "Could not update quantity. Please try again.");
          return { ok: false, error: data.error || "Could not update quantity." };
        }
        setCart(data.items ?? []);
        return { ok: true };
      } catch {
        if (customer) setCart(snapshot);
        toast.error("Could not update quantity. Please try again.");
        return { ok: false, error: "Could not update quantity." };
      } finally {
        release();
        if (qtyLocks.current.get(itemId) === queued) {
          qtyLocks.current.delete(itemId);
        }
      }
    },
    [customer, products],
  );

  const updateCartVariant = useCallback(
    async (itemId: string, size: string, color: string) => {
      try {
        if (!customer) {
          const items = readGuestCart();
          const current = items.find((row) => guestLineKey(row) === itemId);
          if (!current) return { ok: false, error: "Cart item not found." };
          const product = products.find((row) => row.id === current.productId);
          const nextItem = { ...current, size, color };
          const nextKey = guestLineKey(nextItem);
          const without = items.filter((row) => guestLineKey(row) !== itemId);
          const existing = without.find((row) => guestLineKey(row) === nextKey);
          const mergedQty = (existing?.quantity ?? 0) + current.quantity;
          const stock = availableStock(product, color, size, CART_MAX_QUANTITY);
          if (stock <= 0 || mergedQty > stock) {
            const error = stockShortageMessage({
              name: product?.name ?? current.productId,
              color,
              size,
              requested: mergedQty,
              stock,
            });
            toast.error(error);
            return { ok: false, error };
          }
          const next = existing
            ? without.map((row) =>
                guestLineKey(row) === nextKey
                  ? {
                      ...row,
                      quantity: Math.min(quantityCap(stock), row.quantity + current.quantity),
                    }
                  : row,
              )
            : [...without, nextItem];
          writeGuestCart(next);
          setGuestCart(next);
          return { ok: true };
        }
        const res = await fetch("/api/customer/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setVariant", itemId, size, color }),
        });
        const data = (await res.json()) as { items?: CartLine[]; error?: string };
        if (!res.ok) {
          toast.error(data.error || "Could not update this variant.");
          return { ok: false, error: data.error || "Could not update this variant." };
        }
        setCart(data.items ?? []);
        return { ok: true };
      } catch {
        toast.error("Could not update this variant.");
        return { ok: false, error: "Could not update this variant." };
      }
    },
    [customer, products],
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      const snapshot = cartRef.current;
      try {
        if (!customer) {
          const next = readGuestCart().filter((row) => guestLineKey(row) !== itemId);
          writeGuestCart(next);
          setGuestCart(next);
          return { ok: true };
        }
        setCart((current) => current.filter((line) => line.id !== itemId));
        const res = await fetch("/api/customer/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", itemId }),
        });
        const data = (await res.json()) as { items?: CartLine[]; error?: string };
        if (!res.ok) {
          setCart(snapshot);
          toast.error(data.error || "Could not remove item");
          return { ok: false, error: data.error || "Could not remove item" };
        }
        setCart(data.items ?? []);
        return { ok: true };
      } catch {
        if (customer) setCart(snapshot);
        toast.error("Could not remove item");
        return { ok: false, error: "Could not remove item" };
      }
    },
    [customer, products],
  );

  const applySuccessfulOrder = useCallback(
    async (order: Order, mode: "cart" | "buy_now") => {
      void refreshCatalog(false);
      const ordered = new Set(
        (order.items ?? []).map((item) =>
          guestLineKey({ productId: item.productId, size: item.size, color: item.color }),
        ),
      );

      if (mode === "cart") {
        setCart([]);
        writeGuestCart([]);
        setGuestCart([]);
        closeCart();
        return;
      }

      const nextGuest = readGuestCart().filter((row) => !ordered.has(guestLineKey(row)));
      writeGuestCart(nextGuest);
      setGuestCart(nextGuest);
      if (customer) {
        const snapshot = cartRef.current;
        setCart(
          snapshot.filter(
            (line) =>
              !ordered.has(
                guestLineKey({ productId: line.productId, size: line.size, color: line.color }),
              ),
          ),
        );
        void Promise.all(
          snapshot
            .filter((line) =>
              ordered.has(
                guestLineKey({ productId: line.productId, size: line.size, color: line.color }),
              ),
            )
            .map((line) =>
              fetch("/api/customer/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "remove", itemId: line.id }),
              }).catch(() => undefined),
            ),
        );
      }
      closeCart();
    },
    [closeCart, customer, refreshCatalog],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!customer) {
        openAuth({ type: "wishlist", productId });
        return;
      }
      if (wishlistLocks.current.has(productId)) return;
      wishlistLocks.current.add(productId);
      const exists = wishlist.some((w) => w.productId === productId);
      try {
        const res = exists
          ? await fetch(`/api/customer/wishlist?productId=${encodeURIComponent(productId)}`, {
              method: "DELETE",
            })
          : await fetch("/api/customer/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId }),
            });
        const data = (await res.json()) as { items?: WishlistItem[]; error?: string };
        if (!res.ok) {
          toast.error(data.error || "Could not update wishlist");
          return;
        }
        setWishlist(data.items ?? []);
        toast.success(exists ? "Removed from wishlist" : "Added to wishlist");
      } catch {
        toast.error("Could not update wishlist");
      } finally {
        wishlistLocks.current.delete(productId);
      }
    },
    [customer, openAuth, wishlist],
  );

  const moveWishlistToCart = useCallback(
    async (productId: string, size: string, color: string) => {
      await addToCart({ productId, size, color, quantity: 1 });
      await toggleWishlist(productId);
    },
    [addToCart, toggleWishlist],
  );

  const handleAuthSuccess = useCallback(
    async (nextCustomer: CustomerPublic) => {
      setCustomer(nextCustomer);
      const intent =
        authIntent ||
        (typeof window !== "undefined"
          ? (JSON.parse(sessionStorage.getItem(AUTH_INTENT_KEY) || "null") as AuthIntent)
          : null);

      const guest = readGuestCart();
      if (guest.length) {
        await fetch("/api/customer/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "merge", items: guest }),
        });
        writeGuestCart([]);
        setGuestCart([]);
      }

      await refreshSession();

      if (intent?.type === "wishlist") {
        await fetch("/api/customer/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: intent.productId }),
        });
        await refreshSession();
        toast.success("Added to wishlist");
        closeAuth();
        router.push("/account/wishlist");
        return;
      }

      if (intent?.type === "buy_now") {
        sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(intent.item));
        closeAuth();
        router.push(safeInternalPath(intent.redirect, "/checkout?mode=buy_now"));
        return;
      }

      if (intent?.type === "checkout") {
        closeAuth();
        router.push("/checkout");
        return;
      }

      if (intent?.type === "generic") {
        closeAuth();
        router.push(safeInternalPath(intent.redirect, "/"));
        return;
      }

      closeAuth();
      router.push("/");
    },
    [authIntent, closeAuth, refreshSession, router],
  );

  const cartCount = customer
    ? cart.reduce((sum, line) => sum + line.quantity, 0)
    : guestCart.reduce((sum, line) => sum + line.quantity, 0);

  const wishlistIds = useMemo(() => new Set(wishlist.map((w) => w.productId)), [wishlist]);

  const value = useMemo(
    () => ({
      customer,
      loading,
      cart,
      guestCart,
      cartCount,
      wishlist,
      wishlistIds,
      authOpen,
      openAuth,
      closeAuth,
      refreshSession,
      logout,
      addToCart,
      buyNow,
      updateCartQuantity,
      updateCartVariant,
      removeFromCart,
      applySuccessfulOrder,
      toggleWishlist,
      moveWishlistToCart,
      cartDrawerOpen,
      openCart,
      closeCart,
    }),
    [
      customer,
      loading,
      cart,
      guestCart,
      cartCount,
      wishlist,
      wishlistIds,
      authOpen,
      openAuth,
      closeAuth,
      refreshSession,
      logout,
      addToCart,
      buyNow,
      updateCartQuantity,
      updateCartVariant,
      removeFromCart,
      applySuccessfulOrder,
      toggleWishlist,
      moveWishlistToCart,
      cartDrawerOpen,
      openCart,
      closeCart,
    ],
  );

  return (
    <CommerceContext.Provider value={value}>
      {children}
      <AuthModal
        open={authOpen}
        onOpenChange={(open) => (open ? setAuthOpen(true) : closeAuth())}
        onSuccess={handleAuthSuccess}
        guestCart={guestCart}
      />
    </CommerceContext.Provider>
  );
}
