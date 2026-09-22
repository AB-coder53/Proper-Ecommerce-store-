import type { Product } from "@/lib/catalog-types";
import { productHasPurchasableStock } from "@/lib/inventory";
import { badgeToneClass, type ProductBadge } from "@/lib/promotions";
import { cn } from "@/lib/utils";

export function productDisplayBadges(product: Product): ProductBadge[] {
  const soldOut = !productHasPurchasableStock(product);
  const assigned = (product.badges ?? []).filter((badge) => {
    if (!badge.active) return false;
    if (badge.id === "sold-out" || /sold\s*out/i.test(badge.label)) return soldOut;
    return true;
  });
  if (soldOut && !assigned.some((badge) => badge.id === "sold-out" || /sold\s*out/i.test(badge.label))) {
    assigned.push({
      id: "sold-out",
      name: "Sold Out",
      label: "SOLD OUT",
      active: true,
      sortOrder: 999,
      tone: "ink",
    });
  }
  if (!assigned.length && product.badge?.trim() && !soldOut) {
    assigned.push({
      id: "legacy",
      name: product.badge,
      label: product.badge,
      active: true,
      sortOrder: 0,
      tone: "default",
    });
  }
  return assigned.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ProductBadgeList({ product, className }: { product: Product; className?: string }) {
  const badges = productDisplayBadges(product);
  if (!badges.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={cn(
            "rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] uppercase shadow-sm",
            badgeToneClass(badge.tone),
          )}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
