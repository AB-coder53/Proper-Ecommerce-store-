import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type { Order } from "@/lib/commerce-types";
import {
  eventForOrderStatus,
  notificationVars,
  renderNotification,
  type NotificationChannel,
  type NotificationEventType,
  type OrderNotification,
} from "@/lib/notifications";
import { SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { isMissingTableError } from "@/lib/store-config.shared";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import type { SupabaseClient } from "@supabase/supabase-js";

const DATA_PATH = path.join(process.cwd(), "data", "order-notifications.json");
let useFileStore: boolean | null = null;

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function notificationsDisabled() {
  return process.env["ORDER_NOTIFY_DISABLED"] === "1";
}

function canFallback(error: unknown) {
  const err = error as { message?: string };
  return (
    isMissingTableError(error) ||
    /order_notifications/i.test(err.message ?? "") ||
    /SUPABASE_SERVICE_ROLE_KEY|Missing Supabase/i.test(err.message ?? "")
  );
}

async function withDbOrFile<T>(dbFn: () => Promise<T>, fileFn: () => Promise<T>): Promise<T> {
  if (useFileStore === true) return fileFn();
  try {
    const result = await dbFn();
    useFileStore = false;
    return result;
  } catch (error) {
    const err = error as { status?: number };
    if (err.status === 409) throw error;
    if (useFileStore === false && !canFallback(error)) throw error;
    if (canFallback(error)) {
      useFileStore = true;
      return fileFn();
    }
    throw error;
  }
}

async function readStore(): Promise<{ notifications: OrderNotification[] }> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const data = JSON.parse(raw) as { notifications?: OrderNotification[] };
    return { notifications: data.notifications ?? [] };
  } catch {
    return { notifications: [] };
  }
}

async function writeStore(notifications: OrderNotification[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify({ notifications }, null, 2)}\n`, "utf8");
}

function mapRow(row: Record<string, unknown>): OrderNotification {
  return {
    id: String(row["id"]),
    orderId: String(row["order_id"] ?? row["orderId"]),
    customerId:
      (row["customer_id"] as string | null) ?? (row["customerId"] as string | null) ?? null,
    eventType: String(row["event_type"] ?? row["eventType"]),
    channel: String(row["channel"]),
    status: String(row["status"]),
    providerMessageId:
      (row["provider_message_id"] as string | null) ??
      (row["providerMessageId"] as string | null) ??
      null,
    error: (row["error"] as string | null) ?? null,
    sentAt: (row["sent_at"] as string | null) ?? (row["sentAt"] as string | null) ?? null,
    createdAt: String(row["created_at"] ?? row["createdAt"]),
  };
}

async function claimSlot(
  order: Order,
  eventType: NotificationEventType,
  channel: NotificationChannel,
): Promise<OrderNotification | null> {
  const now = new Date().toISOString();
  const pending: OrderNotification = {
    id: randomUUID(),
    orderId: order.id,
    customerId: order.customerId,
    eventType,
    channel,
    status: "pending",
    providerMessageId: null,
    error: null,
    sentAt: null,
    createdAt: now,
  };
  return withDbOrFile(
    async () => {
      const { data, error } = await db()
        .from("order_notifications")
        .insert({
          id: pending.id,
          order_id: pending.orderId,
          customer_id: pending.customerId,
          event_type: eventType,
          channel,
          status: "pending",
          payload: { orderNumber: order.orderNumber },
        })
        .select("*")
        .maybeSingle();
      if (error && /duplicate|unique/i.test(error.message)) return null;
      if (error) throw error;
      return data ? mapRow(data as Record<string, unknown>) : null;
    },
    async () => {
      const store = await readStore();
      if (
        store.notifications.some(
          (row) =>
            row.orderId === order.id && row.eventType === eventType && row.channel === channel,
        )
      ) {
        return null;
      }
      store.notifications.unshift(pending);
      await writeStore(store.notifications);
      return pending;
    },
  );
}

async function markResult(
  id: string,
  result: { status: "sent" | "failed"; providerMessageId?: string | null; error?: string | null },
) {
  const sentAt = result.status === "sent" ? new Date().toISOString() : null;
  await withDbOrFile(
    async () => {
      const { error } = await db()
        .from("order_notifications")
        .update({
          status: result.status,
          provider_message_id: result.providerMessageId ?? null,
          error: result.error ?? null,
          sent_at: sentAt,
        })
        .eq("id", id);
      if (error) throw error;
    },
    async () => {
      const store = await readStore();
      const row = store.notifications.find((item) => item.id === id);
      if (!row) return;
      row.status = result.status;
      row.providerMessageId = result.providerMessageId ?? null;
      row.error = result.error ?? null;
      row.sentAt = sentAt;
      await writeStore(store.notifications);
    },
  );
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  replyTo?: string,
) {
  const resend = await sendEmailViaResend(to, subject, text, html, replyTo);
  if (resend.ok) return resend;
  const fallback = await sendEmailViaFormSubmit(to, subject, text, replyTo);
  if (fallback.ok) return fallback;
  return resend.error ? resend : fallback;
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  text: string,
  html: string,
  replyTo?: string,
) {
  const key = process.env["RESEND_API_KEY"]?.trim();
  if (!key) {
    return { ok: false as const, error: "Email provider is not configured.", id: null };
  }
  const from =
    process.env["ORDER_NOTIFY_FROM"]?.trim() || `${SITE_NAME} <noreply@abcollection.co.in>`;
  const payload: Record<string, unknown> = { from, to: [to], subject, text, html };
  if (replyTo?.trim()) payload["reply_to"] = replyTo.trim();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) {
    return {
      ok: false as const,
      error: body.message || `Email send failed (${response.status}).`,
      id: null,
    };
  }
  return { ok: true as const, error: null, id: body.id ?? null };
}

async function sendEmailViaFormSubmit(to: string, subject: string, text: string, replyTo?: string) {
  const payload: Record<string, string> = {
    _subject: subject,
    _template: "box",
    _captcha: "false",
    message: text,
  };
  if (replyTo?.trim()) {
    payload["_replyto"] = replyTo.trim();
    payload["email"] = replyTo.trim();
  }
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: SITE_URL,
      Referer: `${SITE_URL}/contact`,
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    success?: string | boolean;
    message?: string;
  };
  const ok =
    response.ok &&
    (body.success === true ||
      body.success === "true" ||
      /confirm|activat|sent|thank/i.test(body.message ?? ""));
  if (!ok) {
    return {
      ok: false as const,
      error: body.message || `Email send failed (${response.status}).`,
      id: null,
    };
  }
  return { ok: true as const, error: null, id: "formsubmit" };
}

async function sendWhatsApp(to: string, text: string) {
  const token = process.env["WHATSAPP_ACCESS_TOKEN"]?.trim();
  const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"]?.trim();
  if (!token || !phoneId) {
    return { ok: false as const, error: "WhatsApp is not configured.", id: null };
  }
  const digits = to.replace(/\D/g, "").replace(/^0/, "91");
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "text",
      text: { body: text },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    return {
      ok: false as const,
      error: body.error?.message || `WhatsApp send failed (${response.status}).`,
      id: null,
    };
  }
  return { ok: true as const, error: null, id: body.messages?.[0]?.id ?? null };
}

export async function notifyOrderEvent(order: Order, eventType: NotificationEventType) {
  if (eventType === "order_placed") {
    const itemLines = order.items
      .map(
        (item) =>
          `${item.quantity} × ${item.productName} (${item.color}, ${item.size}) — ₹${item.lineTotal}`,
      )
      .join("\n");
    await notifyStoreInquiry({
      type: "order",
      subject: `New order ${order.orderNumber} — ${order.customerName}`,
      replyTo: order.customerEmail,
      lines: [
        `New store order ${order.orderNumber}`,
        `Customer: ${order.customerName}`,
        `Email: ${order.customerEmail}`,
        `Phone: ${order.customerPhone}`,
        `Address: ${order.addressLine1}${order.addressLine2 ? `, ${order.addressLine2}` : ""}`,
        `${order.addressCity}, ${order.addressState} ${order.addressPincode}`,
        `Total: ₹${order.totalAmount}`,
        `Status: ${order.orderStatus} / ${order.paymentStatus}`,
        "",
        "Items:",
        itemLines || "None",
      ],
    });
  }

  if (notificationsDisabled()) return;
  const vars = notificationVars({
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    orderTotal: order.totalAmount,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.expectedDelivery,
  });
  const message = renderNotification(eventType, vars);
  const channels: NotificationChannel[] = ["email"];
  if (process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]) {
    channels.push("whatsapp");
  }

  for (const channel of channels) {
    try {
      const slot = await claimSlot(order, eventType, channel);
      if (!slot) continue;
      const result =
        channel === "email"
          ? await sendEmail(order.customerEmail, message.subject, message.text, message.html)
          : await sendWhatsApp(order.customerPhone, message.text);
      await markResult(slot.id, {
        status: result.ok ? "sent" : "failed",
        providerMessageId: result.id,
        error: result.error,
      });
    } catch (error) {
      console.error("[notify]", eventType, channel, error);
    }
  }
}

export async function notifyStoreInquiry(input: {
  type: string;
  subject: string;
  lines: string[];
  replyTo?: string;
}) {
  const text = [`${SITE_NAME} website inquiry (${input.type})`, "", ...input.lines].join("\n");
  const html = `<p style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br/>")}</p>`;
  const result = input.replyTo?.trim()
    ? await sendEmail(SITE_EMAIL, input.subject, text, html, input.replyTo.trim())
    : await sendEmail(SITE_EMAIL, input.subject, text, html);
  if (!result.ok) {
    console.error("[inquiry-mail]", input.type, result.error);
  }
  return result;
}

export async function notifyOrderChanges(previous: Order, next: Order) {
  try {
    if (previous.orderStatus !== next.orderStatus) {
      const event = eventForOrderStatus(next.orderStatus);
      if (event) await notifyOrderEvent(next, event);
    }
    if (previous.paymentStatus !== "paid" && next.paymentStatus === "paid") {
      await notifyOrderEvent(next, "payment_confirmed");
    }
    const trackingBecameAvailable =
      !previous.trackingNumber?.trim() && Boolean(next.trackingNumber?.trim());
    if (
      trackingBecameAvailable &&
      previous.orderStatus === "shipped" &&
      next.orderStatus === "shipped"
    ) {
      await notifyOrderEvent(next, "tracking_available");
    }
  } catch (error) {
    console.error("[notify] order change", error);
  }
}

export async function listOrderNotifications(orderId: string): Promise<OrderNotification[]> {
  return withDbOrFile(
    async () => {
      const { data, error } = await db()
        .from("order_notifications")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    },
    async () => (await readStore()).notifications.filter((row) => row.orderId === orderId),
  );
}
