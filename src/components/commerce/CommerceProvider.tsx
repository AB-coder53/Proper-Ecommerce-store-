"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthModal } from "@/components/commerce/AuthModal";
import { AUTH_INTENT_KEY, BUY_NOW_KEY, GUEST_CART_KEY } from "@/lib/commerce-constants";
import type { CartItemInput, CartLine, CustomerPublic, WishlistItem } from "@/lib/commerce-types";

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
  addToCart: (item: CartItemInput, opts?: { silent?: boolean }) => Promise<void>;
  buyNow: (item: CartItemInput) => Promise<void>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
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

function guestLineKey(item: CartItemInput) {
  return `${item.productId}__${item.size}__${item.color}`;
}

export function useCommerce() {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [guestCart, setGuestCart] = useState<CartItemInput[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);

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
    async (item: CartItemInput, opts?: { silent?: boolean }) => {
      if (!customer) {
        const next = [...readGuestCart()];
        const idx = next.findIndex((row) => guestLineKey(row) === guestLineKey(item));
        if (idx >= 0) {
          next[idx] = {
            ...next[idx]!,
            quantity: Math.min(20, next[idx]!.quantity + item.quantity),
          };
        } else {
          next.push(item);
        }
        writeGuestCart(next);
        setGuestCart(next);
        if (!opts?.silent) toast.success("Added to cart");
        return;
      }

      const res = await fetch("/api/customer/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = (await res.json()) as { items?: CartLine[]; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not add to cart");
        return;
      }
      setCart(data.items ?? []);
      if (!opts?.silent) toast.success("Added to cart");
    },
    [customer],
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
      if (!customer) {
        // guest cart ids are synthetic keys
        const next = readGuestCart()
          .map((row) => (guestLineKey(row) === itemId ? { ...row, quantity } : row))
          .filter((row) => row.quantity > 0);
        writeGuestCart(next);
        setGuestCart(next);
        return;
      }
      const res = await fetch("/api/customer/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setQuantity", itemId, quantity }),
      });
      const data = (await res.json()) as { items?: CartLine[]; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not update cart");
        return;
      }
      setCart(data.items ?? []);
    },
    [customer],
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      if (!customer) {
        const next = readGuestCart().filter((row) => guestLineKey(row) !== itemId);
        writeGuestCart(next);
        setGuestCart(next);
        return;
      }
      const res = await fetch("/api/customer/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", itemId }),
      });
      const data = (await res.json()) as { items?: CartLine[]; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not remove item");
        return;
      }
      setCart(data.items ?? []);
    },
    [customer],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!customer) {
        openAuth({ type: "wishlist", productId });
        return;
      }
      const exists = wishlist.some((w) => w.productId === productId);
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
      }

      if (intent?.type === "buy_now") {
        sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(intent.item));
        closeAuth();
        router.push(intent.redirect || "/checkout?mode=buy_now");
        return;
      }

      if (intent?.type === "checkout") {
        closeAuth();
        router.push("/checkout");
        return;
      }

      if (intent?.type === "generic" && intent.redirect) {
        closeAuth();
        router.push(intent.redirect);
        return;
      }

      closeAuth();
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
      removeFromCart,
      toggleWishlist,
      moveWishlistToCart,
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
      removeFromCart,
      toggleWishlist,
      moveWishlistToCart,
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
