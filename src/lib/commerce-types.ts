import { z } from "zod";

import { ORDER_STATUSES } from "@/lib/commerce-constants";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(10).max(15),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(100),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(15),
  alternatePhone: z.string().trim().max(15).optional().or(z.literal("")),
});

export const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(40).default("Home"),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  isDefault: z.boolean().default(true),
});

export const cartItemInputSchema = z.object({
  productId: z.string().trim().min(1).max(80),
  size: z.string().trim().min(1).max(10),
  color: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const checkoutSchema = z.object({
  addressId: z.string().uuid().optional(),
  address: addressSchema.omit({ id: true }).optional(),
  alternatePhone: z.string().trim().max(15).optional().or(z.literal("")),
  mode: z.enum(["cart", "buy_now"]).default("cart"),
  buyNow: cartItemInputSchema.optional(),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(200),
});

export const orderStatusSchema = z.enum([...ORDER_STATUSES, "cancelled", "failed", "returned"] as [
  string,
  ...string[],
]);

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CustomerPublic = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  alternatePhone: string | null;
  status: string;
  createdAt: string;
};

export type CustomerAddress = {
  id: string;
  customerId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartLine = {
  id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  productName: string;
  productImage: string;
  unitPrice: number;
  priceLabel: string;
  lineTotal: number;
};

export type WishlistItem = {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  priceLabel: string;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  alternatePhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string;
  addressState: string;
  addressPincode: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type CustomerAdminRow = CustomerPublic & {
  totalOrders: number;
  totalSpent: number;
  defaultAddress: CustomerAddress | null;
};
