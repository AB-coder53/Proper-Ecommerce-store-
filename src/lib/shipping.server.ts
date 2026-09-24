import "server-only";

import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import {
  estimateDelivery,
  shippingSettingsSchema,
  type DeliveryEstimate,
  type ShippingSettings,
} from "@/lib/shipping";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

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

async function loadSettings(): Promise<ShippingSettings> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("shipping_settings" as never)
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Shipping settings row is missing in Supabase.");
  return mapRow(data as ShippingRow);
}

const SHIPPING_CACHE_TAG = "shipping";

export const getShippingSettings = cache(
  unstable_cache(loadSettings, ["shipping-settings"], {
    revalidate: 60,
    tags: [SHIPPING_CACHE_TAG],
  }),
);

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
  revalidateTag(SHIPPING_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/collection");
  revalidatePath("/admin/shipping");
  return parsed;
}
