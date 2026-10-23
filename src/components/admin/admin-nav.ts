import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Gift,
  Layers,
  LayoutDashboard,
  Package,
  Plus,
  Warehouse,
  ShoppingBag,
  Star,
  Ticket,
  Truck,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
      { href: "/admin/collections", label: "Collections", icon: Layers },
      { href: "/admin/badges", label: "Badges", icon: Award },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/shipping", label: "Shipping", icon: Truck },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/coupons", label: "Coupons", icon: Ticket },
      { href: "/admin/bundles", label: "Bundles", icon: Gift },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
];

export const ADMIN_CREATE_ACTIONS: AdminNavItem[] = [
  { href: "/admin/products/new", label: "New product", icon: Plus },
  { href: "/admin/collections/new", label: "New collection", icon: Plus },
  { href: "/admin/bundles/new", label: "New bundle", icon: Plus },
  { href: "/admin/orders/new", label: "New order", icon: Plus },
];

const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_NAV.flatMap((group) =>
    group.items.map((item) => [item.href.split("/").pop()!, item.label]),
  ),
);

export function isAdminNavActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function adminBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return [{ label: "Dashboard" }];

  const crumbs: { label: string; href?: string }[] = [{ label: "Dashboard", href: "/admin" }];
  let href = "";
  parts.forEach((part, index) => {
    href += `/${part}`;
    if (part === "admin") return;
    const isLast = index === parts.length - 1;
    const label = part === "new" ? "New" : (SECTION_LABELS[part] ?? (isLast ? "Edit" : part));
    crumbs.push(isLast ? { label } : { label, href });
  });
  return crumbs;
}
