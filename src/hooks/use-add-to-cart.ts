"use client";

import { useCallback, useRef, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import type { CartItemInput } from "@/lib/commerce-types";

export type AddToCartStatus = "idle" | "adding" | "added" | "error";

export function useAddToCart() {
  const { addToCart } = useCommerce();
  const [status, setStatus] = useState<AddToCartStatus>("idle");
  const [error, setError] = useState("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  const run = useCallback(
    async (item: CartItemInput) => {
      if (busyRef.current) return { ok: false as const, error: "Adding…" };
      busyRef.current = true;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setStatus("adding");
      setError("");
      const result = await addToCart(item);
      if (result.ok) {
        setStatus("added");
        resetTimer.current = setTimeout(() => setStatus("idle"), 1600);
      } else {
        setStatus("error");
        setError(result.error || "Unable to add this item to your cart. Please try again.");
        resetTimer.current = setTimeout(() => setStatus("idle"), 2200);
      }
      busyRef.current = false;
      return result;
    },
    [addToCart],
  );

  return { status, error, run, isBusy: status === "adding" };
}

export function addToCartLabel(status: AddToCartStatus) {
  if (status === "adding") return "Adding...";
  if (status === "added") return "Added ✓";
  if (status === "error") return "Try again";
  return "Add to Cart";
}
