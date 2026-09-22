import "server-only";

import { listCustomersAdmin, listAllOrders } from "@/lib/commerce.server";
import { getProducts } from "@/lib/catalog.server";
import { listVariantsForProducts } from "@/lib/inventory.server";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

export async function exportOrdersCsv() {
  const orders = await listAllOrders();
  return toCsv(
    [
      "order_number",
      "order_date",
      "customer_name",
      "customer_email",
      "order_status",
      "payment_status",
      "subtotal",
      "discount",
      "shipping",
      "tax",
      "total",
      "currency",
      "promo_code",
    ],
    orders.map((order) => [
      order.orderNumber,
      order.createdAt,
      order.customerName,
      order.customerEmail,
      order.orderStatus,
      order.paymentStatus,
      order.subtotal,
      order.discount,
      order.shippingCost,
      0,
      order.totalAmount,
      "INR",
      order.promoCode ?? "",
    ]),
  );
}

export async function exportCustomersCsv() {
  const customers = await listCustomersAdmin();
  return toCsv(
    ["name", "email", "phone", "orders", "total_spent", "status", "joined"],
    customers.map((customer) => [
      customer.fullName,
      customer.email,
      customer.phone,
      customer.totalOrders,
      customer.totalSpent,
      customer.status,
      customer.createdAt,
    ]),
  );
}

export async function exportProductsCsv() {
  const products = await getProducts();
  return toCsv(
    ["product_id", "name", "sku", "category", "price", "compare_at_price", "status", "created_date"],
    products.map((product) => [
      product.id,
      product.name,
      product.id,
      product.fabric,
      product.price,
      product.compareAtPrice ?? "",
      product.featured ? "featured" : "active",
      "",
    ]),
  );
}

export async function exportInventoryCsv() {
  const products = await getProducts();
  const variants = await listVariantsForProducts(products.map((row) => row.id));
  const names = new Map(products.map((row) => [row.id, row.name]));
  return toCsv(
    ["product", "product_id", "sku", "color", "size", "stock", "status"],
    variants.map((variant) => [
      names.get(variant.productId) ?? variant.productId,
      variant.productId,
      variant.sku,
      variant.color,
      variant.size,
      variant.stock,
      variant.stock <= 0 ? "out_of_stock" : variant.stock <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock",
    ]),
  );
}
