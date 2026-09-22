import { LEGAL_CONTACT } from "@/lib/legal/contact";
import { formatInr } from "@/lib/price";
import { SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Order } from "@/lib/commerce-types";

export function invoiceHtml(order: Order) {
  const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber}`;
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.productName)}</strong>
          <div class="muted">${escapeHtml(item.sku || item.productId)}</div>
        </td>
        <td>${escapeHtml(item.color)}</td>
        <td>${escapeHtml(item.size)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatInr(item.unitPrice)}</td>
        <td class="num">${formatInr(item.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoiceNumber}</title>
  <style>
    body { font-family: Georgia, serif; color: #111; padding: 32px; }
    h1 { margin: 0; font-size: 28px; }
    .muted { color: #666; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #ddd; font-size: 14px; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: 280px; }
    .totals td { border: 0; }
    .actions { margin-top: 24px; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <h1>${escapeHtml(SITE_NAME)}</h1>
  <p class="muted">${escapeHtml(SITE_URL)} · ${escapeHtml(LEGAL_CONTACT.email)} · ${escapeHtml(LEGAL_CONTACT.phone)}</p>
  <p class="muted">${escapeHtml(SITE_EMAIL)}</p>
  <h2>Invoice ${escapeHtml(invoiceNumber)}</h2>
  <p>
    Order #${escapeHtml(order.orderNumber)}<br />
    Date ${escapeHtml(new Date(order.createdAt).toLocaleString("en-IN"))}<br />
    Payment ${escapeHtml(order.paymentStatus)} · ${escapeHtml(order.paymentMethod || "prepaid")}
  </p>
  <p>
    <strong>Bill to</strong><br />
    ${escapeHtml(order.customerName)}<br />
    ${escapeHtml(order.customerEmail)}<br />
    ${escapeHtml(order.customerPhone)}<br />
    ${escapeHtml(order.addressLine1)}${order.addressLine2 ? `, ${escapeHtml(order.addressLine2)}` : ""}<br />
    ${escapeHtml(order.addressCity)}, ${escapeHtml(order.addressState)} ${escapeHtml(order.addressPincode)}
  </p>
  <table>
    <thead>
      <tr>
        <th>Item</th><th>Colour</th><th>Size</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td class="num">${formatInr(order.subtotal)}</td></tr>
    <tr><td>Shipping</td><td class="num">${formatInr(order.shippingCost)}</td></tr>
    ${order.couponDiscount ? `<tr><td>Coupon ${escapeHtml(order.promoCode || "")}</td><td class="num">-${formatInr(order.couponDiscount)}</td></tr>` : ""}
    ${order.bundleDiscount ? `<tr><td>Bundle savings</td><td class="num">-${formatInr(order.bundleDiscount)}</td></tr>` : ""}
    ${!order.couponDiscount && !order.bundleDiscount && order.discount ? `<tr><td>Discount</td><td class="num">-${formatInr(order.discount)}</td></tr>` : ""}
    <tr><td>Tax</td><td class="num">${formatInr(0)}</td></tr>
    <tr><td><strong>Grand total</strong></td><td class="num"><strong>${formatInr(order.totalAmount)}</strong></td></tr>
  </table>
  <p class="muted">This invoice reflects the prices and discounts recorded at purchase.</p>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
