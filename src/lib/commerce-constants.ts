export const CUSTOMER_COOKIE_NAME = "ab_customer_session";
export const GUEST_CART_KEY = "ab_guest_cart";
export const BUY_NOW_KEY = "ab_buy_now";
export const AUTH_INTENT_KEY = "ab_auth_intent";
export const IMPORTED_CUSTOMER_PASSWORD = "!imported";

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Order Placed",
  confirmed: "Order Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Payment Pending",
  paid: "Paid",
  failed: "Payment Failed",
  refunded: "Refunded",
};

export const SHIPPING_COST_INR = 0;
export const CART_MAX_QUANTITY = 20;
export const TRACKING_COOKIE_NAME = "ab_order_track";
