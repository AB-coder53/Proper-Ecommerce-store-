import "server-only";

import { z } from "zod";

import type { ReservationResult } from "@/lib/api-types";
import { getProducts } from "@/lib/catalog.server";
import { PRODUCT_SPECS } from "@/lib/product-specs";
import { makeReservationId, normalizeMobile } from "@/lib/reservation-utils";
import { appendValues, getValues } from "@/lib/sheets.server";

const itemSchema = z.object({
  productName: z.string().trim().min(1).max(80),
  size: z.string().trim().min(1).max(10),
  colour: z.string().trim().min(1).max(40),
});

export const reservationSchema = z.object({
  reservationId: z
    .string()
    .trim()
    .regex(/^AB-\d{6}-[A-Z0-9]{4}$/, "Invalid reservation reference")
    .optional(),
  fullName: z.string().trim().min(2, "Please enter your name").max(100),
  mobile: z.string().trim().min(10).max(20),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  whatsappOptIn: z.boolean(),
  termsAccepted: z.literal(true),
  items: z.array(itemSchema).min(1, "Select at least one product").max(10),
});

export type ReservationInput = z.input<typeof reservationSchema>;
export type { ReservationResult };

export async function createReservation(
  data: z.infer<typeof reservationSchema>,
): Promise<ReservationResult> {
  const mobile = normalizeMobile(data.mobile);
  if (!mobile) throw new Error("Enter a valid 10-digit Indian mobile number");

  const products = await getProducts();
  const items = data.items.map((item) => {
    const product = products.find((p) => p.name === item.productName);
    if (!product) throw new Error("Unknown product selected");
    if (!product.sizes.includes(item.size)) throw new Error("Unavailable size selected");
    if (!product.colors.includes(item.colour)) throw new Error("Unavailable colour selected");
    return {
      name: product.name,
      spec: PRODUCT_SPECS[product.name] ?? product.fabric,
      size: item.size,
      colour: item.colour,
    };
  });

  const existing = await getValues("Reservations!A2:D");
  const match = existing.find((row) => normalizeMobile(row[3] ?? "") === mobile);
  if (match) return { status: "duplicate", reservationId: match[0] ?? null };

  const reservationId = data.reservationId ?? makeReservationId();

  const itemRows = await getValues("'Reservation Items'!A2:A");
  const itemsAlreadyWritten = itemRows.some((row) => row[0] === reservationId);

  if (!itemsAlreadyWritten) {
    await appendValues(
      "'Reservation Items'!A:E",
      items.map((i) => [reservationId, i.name, i.spec, i.size, i.colour]),
    );
  }

  await appendValues("Reservations!A:J", [
    [
      reservationId,
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      data.fullName,
      mobile,
      data.email || "",
      data.city || "",
      data.whatsappOptIn ? "Yes" : "No",
      "Yes",
      "Registered",
      "",
    ],
  ]);

  return { status: "created", reservationId };
}
