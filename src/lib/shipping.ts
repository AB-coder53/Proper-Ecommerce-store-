import { z } from "zod";

export const shippingProductRuleSchema = z.object({
  productId: z.string().trim().min(1).max(80),
  extraMinDays: z.number().int().min(0).max(60).default(0),
  extraMaxDays: z.number().int().min(0).max(60).default(0),
});

export const shippingSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  processingMinDays: z.number().int().min(0).max(60),
  processingMaxDays: z.number().int().min(0).max(60),
  handlingDays: z.number().int().min(0).max(60),
  shippingMinDays: z.number().int().min(0).max(60),
  shippingMaxDays: z.number().int().min(0).max(60),
  businessDaysOnly: z.boolean().default(true),
  productRules: z.array(shippingProductRuleSchema).max(200).default([]),
});

export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type ShippingProductRule = z.infer<typeof shippingProductRuleSchema>;

export type DeliveryEstimate = {
  available: boolean;
  label: string;
  startLabel?: string;
  endLabel?: string;
};

/** Published Shipping Policy defaults (2–3 processing, 5–7 transit). */
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  enabled: true,
  processingMinDays: 2,
  processingMaxDays: 3,
  handlingDays: 0,
  shippingMinDays: 5,
  shippingMaxDays: 7,
  businessDaysOnly: true,
  productRules: [],
};

export const DELIVERY_UNAVAILABLE_LABEL =
  "Delivery date will be confirmed after your order is placed.";

function istCalendarDate(from = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(from);
  return new Date(`${ymd}T12:00:00.000Z`);
}

function addConfiguredDays(start: Date, days: number, businessDaysOnly: boolean): Date {
  const date = new Date(start.getTime());
  if (days <= 0) return date;
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (!businessDaysOnly || date.getUTCDay() !== 0) remaining -= 1;
  }
  return date;
}

function formatIstDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function settingsAreUsable(settings: ShippingSettings | null | undefined): boolean {
  if (!settings?.enabled) return false;
  const min = settings.handlingDays + settings.processingMinDays + settings.shippingMinDays;
  const max = settings.handlingDays + settings.processingMaxDays + settings.shippingMaxDays;
  return min >= 0 && max >= min;
}

export function estimateDelivery(
  settings: ShippingSettings | null | undefined,
  productId?: string,
  from = new Date(),
): DeliveryEstimate {
  if (!settingsAreUsable(settings) || !settings) {
    return { available: false, label: DELIVERY_UNAVAILABLE_LABEL };
  }

  const rule = productId
    ? settings.productRules.find((row) => row.productId === productId)
    : undefined;
  const extraMin = rule?.extraMinDays ?? 0;
  const extraMax = rule?.extraMaxDays ?? extraMin;

  const minDays =
    settings.handlingDays + settings.processingMinDays + settings.shippingMinDays + extraMin;
  const maxDays =
    settings.handlingDays + settings.processingMaxDays + settings.shippingMaxDays + extraMax;

  if (maxDays < minDays) {
    return { available: false, label: DELIVERY_UNAVAILABLE_LABEL };
  }

  const start = istCalendarDate(from);
  const earliest = addConfiguredDays(start, minDays, settings.businessDaysOnly);
  const latest = addConfiguredDays(start, maxDays, settings.businessDaysOnly);
  const startLabel = formatIstDate(earliest);
  const endLabel = formatIstDate(latest);

  if (startLabel === endLabel) {
    return {
      available: true,
      label: `Expected Delivery: ${startLabel}`,
      startLabel,
      endLabel,
    };
  }

  return {
    available: true,
    label: `Estimated Delivery: ${startLabel} – ${endLabel}`,
    startLabel,
    endLabel,
  };
}
