import { estimateDelivery, type ShippingSettings } from "@/lib/shipping";
import type { Order, OrderItem } from "@/lib/commerce-types";

export type GuestOrderTracking = {
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  expectedDelivery: string | null;
  destination: string | null;
  items: {
    productName: string;
    productImage: string | null;
    color: string;
    size: string;
    quantity: number;
  }[];
};

const CLOSED = new Set(["delivered", "cancelled", "failed", "returned"]);

export function isTrackableStatus(status: string) {
  return !CLOSED.has(status);
}

export function expectedDeliveryForOrder(
  order: {
    orderStatus: string;
    createdAt: string;
    items: { productId?: string }[];
  },
  settings: ShippingSettings | null | undefined,
) {
  if (order.orderStatus === "delivered") return "Delivered";
  if (CLOSED.has(order.orderStatus)) return null;
  const estimate = estimateDelivery(settings, order.items[0]?.productId, new Date(order.createdAt));
  return estimate.label;
}

export function toGuestOrderTracking(
  order: Order,
  settings: ShippingSettings | null | undefined,
): GuestOrderTracking {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    expectedDelivery: expectedDeliveryForOrder(order, settings),
    destination: order.addressCity ? `Delivering to ${order.addressCity}` : null,
    items: order.items.map((item: OrderItem) => ({
      productName: item.productName,
      productImage: item.productImage,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
    })),
  };
}

export function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function orderItemCount(order: Pick<Order, "items">) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}
