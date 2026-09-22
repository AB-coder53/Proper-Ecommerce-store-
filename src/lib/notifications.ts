import { formatInr } from "@/lib/price";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { LEGAL_CONTACT } from "@/lib/legal/contact";

export const NOTIFICATION_EVENTS = [
  "order_placed",
  "order_confirmed",
  "payment_confirmed",
  "order_processing",
  "order_dispatched",
  "tracking_available",
  "out_for_delivery",
  "delivered",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationChannel = "email" | "whatsapp";
export type NotificationStatus = "pending" | "sent" | "failed";

export type OrderNotification = {
  id: string;
  orderId: string;
  customerId: string | null;
  eventType: NotificationEventType | string;
  channel: NotificationChannel | string;
  status: NotificationStatus | string;
  providerMessageId: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type NotificationVars = {
  customerName: string;
  orderNumber: string;
  orderTotal: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
  estimatedDelivery: string;
  supportEmail: string;
  supportPhone: string;
  siteName: string;
  siteUrl: string;
};

export function notificationVars(input: {
  customerName: string;
  orderNumber: string;
  orderTotal: number;
  trackingNumber?: string | null | undefined;
  carrier?: string | null | undefined;
  trackingUrl?: string | null | undefined;
  estimatedDelivery?: string | null | undefined;
}): NotificationVars {
  return {
    customerName: input.customerName,
    orderNumber: input.orderNumber,
    orderTotal: formatInr(input.orderTotal),
    trackingNumber: input.trackingNumber?.trim() || "",
    carrier: input.carrier?.trim() || "",
    trackingUrl: input.trackingUrl?.trim() || "",
    estimatedDelivery: input.estimatedDelivery?.trim() || "",
    supportEmail: LEGAL_CONTACT.email,
    supportPhone: LEGAL_CONTACT.phone,
    siteName: SITE_NAME,
    siteUrl: SITE_URL,
  };
}

const TEMPLATES: Record<NotificationEventType, { subject: string; text: string }> = {
  order_placed: {
    subject: "Your {{siteName}} order {{orderNumber}} has been placed",
    text: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been placed. Total: {{orderTotal}}.\n\nWe'll update you as it moves forward.\n\n{{siteName}}\n{{supportEmail}} · {{supportPhone}}",
  },
  order_confirmed: {
    subject: "Your order {{orderNumber}} has been confirmed",
    text: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been confirmed. Total: {{orderTotal}}.\n\n{{siteName}}",
  },
  payment_confirmed: {
    subject: "Payment received for order {{orderNumber}}",
    text: "Hi {{customerName}},\n\nPayment for order {{orderNumber}} has been successfully received. Total: {{orderTotal}}.\n\n{{siteName}}",
  },
  order_processing: {
    subject: "Your order {{orderNumber}} is being processed",
    text: "Hi {{customerName}},\n\nYour order {{orderNumber}} is now being processed.\n\n{{siteName}}",
  },
  order_dispatched: {
    subject: "Your order {{orderNumber}} has been dispatched",
    text: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been dispatched.{{trackingBlock}}\n\n{{siteName}}",
  },
  out_for_delivery: {
    subject: "Your order {{orderNumber}} is out for delivery",
    text: "Hi {{customerName}},\n\nYour order {{orderNumber}} is out for delivery.\n\n{{siteName}}",
  },
  tracking_available: {
    subject: "Tracking is available for order {{orderNumber}}",
    text: "Hi {{customerName}},\n\nTracking is now available for order {{orderNumber}}.{{trackingBlock}}\n\n{{siteName}}",
  },
  delivered: {
    subject: "Your order {{orderNumber}} has been delivered",
    text: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been delivered. We hope you love it — you can leave a review from your account once you're ready.\n\n{{siteName}}",
  },
};

export function eventForOrderStatus(status: string): NotificationEventType | null {
  if (status === "placed") return "order_placed";
  if (status === "confirmed") return "order_confirmed";
  if (status === "processing") return "order_processing";
  if (status === "shipped") return "order_dispatched";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  return null;
}

function applyVars(template: string, vars: NotificationVars) {
  const trackingBlock =
    vars.trackingNumber || vars.trackingUrl
      ? `\n\nCarrier: ${vars.carrier || "—"}\nTracking number: ${vars.trackingNumber || "—"}${
          vars.trackingUrl ? `\nTrack your order: ${vars.trackingUrl}` : ""
        }`
      : "";
  return template
    .replaceAll("{{trackingBlock}}", trackingBlock)
    .replaceAll("{{customerName}}", vars.customerName)
    .replaceAll("{{orderNumber}}", vars.orderNumber)
    .replaceAll("{{orderTotal}}", vars.orderTotal)
    .replaceAll("{{trackingNumber}}", vars.trackingNumber)
    .replaceAll("{{carrier}}", vars.carrier)
    .replaceAll("{{trackingUrl}}", vars.trackingUrl)
    .replaceAll("{{estimatedDelivery}}", vars.estimatedDelivery)
    .replaceAll("{{supportEmail}}", vars.supportEmail)
    .replaceAll("{{supportPhone}}", vars.supportPhone)
    .replaceAll("{{siteName}}", vars.siteName)
    .replaceAll("{{siteUrl}}", vars.siteUrl);
}

export function renderNotification(event: NotificationEventType, vars: NotificationVars) {
  const template = TEMPLATES[event];
  const subject = applyVars(template.subject, vars);
  const text = applyVars(template.text, vars);
  const html = `<p>${text.replaceAll("\n", "<br/>")}</p>`;
  return { subject, text, html };
}
