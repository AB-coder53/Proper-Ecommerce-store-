"use client";

import { useCallback, useEffect, useState } from "react";

import type { Order } from "@/lib/commerce-types";
import type { GuestOrderTracking } from "@/lib/order-tracking";

const POLL_MS = 8000;

function useLiveRefresh(refresh: () => Promise<void>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, refresh]);
}

export function useLiveOrders(enabled = true) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { orders?: Order[] };
        setOrders(data.orders ?? []);
      }
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setOrders([]);
      setReady(false);
    }
  }, [enabled]);

  useLiveRefresh(refresh, enabled);

  return { orders, ready, refresh };
}

export function useLiveOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!orderId) return;
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const data = (await res.json()) as { order?: Order; error?: string };
    if (!res.ok || !data.order) {
      setOrder((current) => {
        if (!current) setError("Order not found.");
        return current;
      });
      return;
    }
    setError("");
    setOrder(data.order);
  }, [orderId]);

  useLiveRefresh(refresh, Boolean(orderId));

  return { order, error, refresh };
}

export function useLiveGuestTracking(enabled: boolean) {
  const [tracking, setTracking] = useState<GuestOrderTracking | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/orders/track", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tracking?: GuestOrderTracking | null };
    if (data.tracking) setTracking(data.tracking);
  }, []);

  useLiveRefresh(refresh, enabled);

  return { tracking, setTracking, refresh };
}
