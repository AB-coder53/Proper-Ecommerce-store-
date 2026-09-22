import "server-only";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";

import { isMissingTableError } from "@/lib/store-config.shared";
import {
  DEFAULT_SHIPPING_SETTINGS,
  estimateDelivery,
  shippingSettingsSchema,
  type DeliveryEstimate,
  type ShippingSettings,
} from "@/lib/shipping";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

const FALLBACK_PATH = path.join(process.cwd(), "data", "shipping-settings.json");

type ShippingRow = {
  enabled: boolean;
  processing_min_days: number;
  processing_max_days: number;
  handling_days: number;
  shipping_min_days: number;
  shipping_max_days: number;
  business_days_only: boolean;
  product_rules: unknown;
};

function mapRow(row: ShippingRow): ShippingSettings {
  return shippingSettingsSchema.parse({
    enabled: row.enabled,
    processingMinDays: row.processing_min_days,
    processingMaxDays: row.processing_max_days,
    handlingDays: row.handling_days,
    shippingMinDays: row.shipping_min_days,
    shippingMaxDays: row.shipping_max_days,
    businessDaysOnly: row.business_days_only,
    productRules: row.product_rules ?? [],
  });
}

function canUseFileFallback(error: unknown) {
  return (
    isMissingTableError(error) ||
    (error instanceof Error && /SUPABASE_SERVICE_ROLE_KEY|Missing Supabase/.test(error.message))
  );
}

async function readFallback(): Promise<ShippingSettings> {
  try {
    const raw = await fs.readFile(FALLBACK_PATH, "utf8");
    return shippingSettingsSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_SHIPPING_SETTINGS;
  }
}

async function writeFallback(settings: ShippingSettings) {
  await fs.writeFile(FALLBACK_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

async function loadSettings(): Promise<ShippingSettings> {
  try {
    const supabase = getSupabaseReadClient();
    const { data, error } = await supabase
      .from("shipping_settings" as never)
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    if (!data) return readFallback();
    return mapRow(data as ShippingRow);
  } catch (error) {
    if (canUseFileFallback(error)) return readFallback();
    throw error;
  }
}

export const getShippingSettings = cache(loadSettings);

export async function getDeliveryEstimate(productId?: string): Promise<DeliveryEstimate> {
  const settings = await getShippingSettings();
  return estimateDelivery(settings, productId);
}

export async function saveShippingSettings(input: ShippingSettings) {
  const parsed = shippingSettingsSchema.parse(input);
  if (parsed.processingMaxDays < parsed.processingMinDays) {
    throw new Error("Processing max days must be at least the minimum.");
  }
  if (parsed.shippingMaxDays < parsed.shippingMinDays) {
    throw new Error("Shipping max days must be at least the minimum.");
  }

  try {
    const supabase = getSupabaseWriteClient();
    const { error } = await supabase.from("shipping_settings" as never).upsert({
      id: "default",
      enabled: parsed.enabled,
      processing_min_days: parsed.processingMinDays,
      processing_max_days: parsed.processingMaxDays,
      handling_days: parsed.handlingDays,
      shipping_min_days: parsed.shippingMinDays,
      shipping_max_days: parsed.shippingMaxDays,
      business_days_only: parsed.businessDaysOnly,
      product_rules: parsed.productRules,
    } as never);
    if (error) throw error;
    revalidatePath("/", "layout");
    revalidatePath("/collection");
    revalidatePath("/admin/shipping");
    return parsed;
  } catch (error) {
    if (!canUseFileFallback(error)) {
      throw error instanceof Error ? error : new Error("Could not save shipping settings");
    }
    await writeFallback(parsed);
    revalidatePath("/", "layout");
    revalidatePath("/collection");
    revalidatePath("/admin/shipping");
    return parsed;
  }
}
