"use client";

import { useEffect, useState, type RefObject } from "react";

export function useInView(ref: RefObject<Element | null>, active = true) {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, active]);

  return inView;
}
