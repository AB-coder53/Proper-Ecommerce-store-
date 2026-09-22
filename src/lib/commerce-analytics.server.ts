import "server-only";

import { listAllOrders } from "@/lib/commerce.server";
import { getProducts } from "@/lib/catalog.server";
import { listVariantsForProducts } from "@/lib/inventory.server";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { listCouponRedemptions } from "@/lib/promotions.server";
import type { CommerceAnalytics } from "@/lib/analytics.types";

const EXCLUDED = new Set(["cancelled", "failed", "returned"]);

export async function getCommerceAnalytics(
  from: Date,
  to: Date,
  previousFrom: Date,
): Promise<CommerceAnalytics> {
  const [orders, products, redemptions] = await Promise.all([
    listAllOrders(),
    getProducts(),
    listCouponRedemptions(),
  ]);
  const variants = await listVariantsForProducts(products.map((row) => row.id));
  const names = new Map(products.map((row) => [row.id, row.name]));

  const inRange = orders.filter((order) => {
    const time = Date.parse(order.createdAt);
    return time >= from.getTime() && time <= to.getTime();
  });
  const previous = orders.filter((order) => {
    const time = Date.parse(order.createdAt);
    return time >= previousFrom.getTime() && time < from.getTime();
  });
  const sales = inRange.filter((order) => !EXCLUDED.has(order.orderStatus));
  const previousSales = previous.filter((order) => !EXCLUDED.has(order.orderStatus));
  const revenue = sales.reduce((sum, order) => sum + order.totalAmount, 0);
  const previousRevenue = previousSales.reduce((sum, order) => sum + order.totalAmount, 0);

  const productStats = new Map<string, { name: string; units: number; revenue: number }>();
  const sizeStats = new Map<string, { units: number; revenue: number }>();
  const colourStats = new Map<string, { units: number; revenue: number }>();
  for (const order of sales) {
    for (const item of order.items) {
      const product = productStats.get(item.productId) ?? {
        name: item.productName || names.get(item.productId) || item.productId,
        units: 0,
        revenue: 0,
      };
      product.units += item.quantity;
      product.revenue += item.lineTotal;
      productStats.set(item.productId, product);
      if (item.size) {
        const size = sizeStats.get(item.size) ?? { units: 0, revenue: 0 };
        size.units += item.quantity;
        size.revenue += item.lineTotal;
        sizeStats.set(item.size, size);
      }
      if (item.color) {
        const colour = colourStats.get(item.color) ?? { units: 0, revenue: 0 };
        colour.units += item.quantity;
        colour.revenue += item.lineTotal;
        colourStats.set(item.color, colour);
      }
    }
  }

  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of sales) {
    const date = order.createdAt.slice(0, 10);
    const current = dailyMap.get(date) ?? { revenue: 0, orders: 0 };
    current.revenue += order.totalAmount;
    current.orders += 1;
    dailyMap.set(date, current);
  }

  const orderIds = new Set(sales.map((order) => order.id));
  const couponStats = new Map<string, { usage: number; discount: number }>();
  for (const row of redemptions) {
    if (!orderIds.has(row.orderId)) continue;
    const current = couponStats.get(row.code) ?? { usage: 0, discount: 0 };
    current.usage += 1;
    current.discount += row.discount;
    couponStats.set(row.code, current);
  }

  const lowStock = variants
    .filter((row) => row.stock > 0 && row.stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 12)
    .map((row) => ({
      product: names.get(row.productId) ?? row.productId,
      color: row.color,
      size: row.size,
      stock: row.stock,
    }));

  return {
    revenue,
    previousRevenue,
    orders: sales.length,
    previousOrders: previousSales.length,
    aov: sales.length ? Math.round(revenue / sales.length) : 0,
    conversionRate: null,
    productViews: 0,
    addToCart: 0,
    checkoutStarted: 0,
    topProducts: [...productStats.values()].sort((a, b) => b.units - a.units).slice(0, 8),
    sizes: [...sizeStats.entries()]
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => b.units - a.units),
    colours: [...colourStats.entries()]
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => b.units - a.units),
    lowStock,
    outOfStock: variants.filter((row) => row.stock <= 0).length,
    totalUnits: variants.reduce((sum, row) => sum + row.stock, 0),
    coupons: [...couponStats.entries()]
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((a, b) => b.usage - a.usage),
    daily: [...dailyMap.entries()]
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
