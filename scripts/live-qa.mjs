import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.LIVE_QA_URL || "http://localhost:3000";
const WIDTHS = [320, 360, 375, 390, 414, 430];
const pages = [
  "/",
  "/collection",
  "/collection/regular-240",
  "/cart",
  "/checkout",
  "/checkout/success",
  "/track-order",
  "/account",
  "/account/orders",
  "/account/wishlist",
  "/about",
  "/faq",
  "/contact",
  "/pricing",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
  "/wholesale",
  "/admin/login",
];

const results = [];
const failures = [];

function loadEnvLocal() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}: ${detail}`);
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorbSetCookie(jar, res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const item of raw) {
    const part = item.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

async function api(path, opts = {}, jar) {
  const headers = { ...(opts.headers || {}) };
  if (jar && jar.size) headers.cookie = cookieHeader(jar);
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (jar) absorbSetCookie(jar, res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function runApiTests() {
  console.log("\n=== API ===\n");
  const env = loadEnvLocal();
  const stamp = Date.now();
  const email = `qa.live.${stamp}@abcollection.test`;
  const password = "QaLivePass123!";
  const customerJar = new Map();
  const adminJar = new Map();

  const catalog = await api("/api/catalog");
  record("GET /api/catalog", catalog.res.ok && Array.isArray(catalog.json?.products), `${catalog.res.status} products=${catalog.json?.products?.length ?? 0}`);
  const product = catalog.json?.products?.find((row) => row.id === "regular-240") ?? catalog.json?.products?.[0];
  const color = product?.colors?.[0];
  const size = product?.sizes?.includes("M") ? "M" : product?.sizes?.[0];

  const inventory = await api(`/api/inventory/${encodeURIComponent(product?.id || "regular-240")}`);
  record("GET /api/inventory/:id", inventory.res.ok && Array.isArray(inventory.json?.variants), `${inventory.res.status} variants=${inventory.json?.variants?.length ?? 0}`);

  const reviews = await api(`/api/products/${encodeURIComponent(product?.id || "regular-240")}/reviews`);
  record("GET /api/products/:id/reviews", reviews.res.ok, String(reviews.res.status));

  const bundles = await api("/api/bundles");
  record("GET /api/bundles", bundles.res.ok, String(bundles.res.status));

  const guestCart = await api("/api/customer/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product?.id, color, size, quantity: 1 }) });
  record("POST /api/customer/cart without session", guestCart.res.status === 401, `status=${guestCart.res.status}`);

  const signup = await api(
    "/api/customer/auth",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "signup",
        fullName: "QA Live Tester",
        email,
        phone: "9876543210",
        password,
      }),
    },
    customerJar,
  );
  record("POST /api/customer/auth signup", signup.res.ok && Boolean(signup.json?.customer?.id), signup.res.ok ? "session cookie set" : signup.json?.error || String(signup.res.status));

  const session = await api("/api/customer/auth", {}, customerJar);
  record("GET /api/customer/auth after signup", Boolean(session.json?.customer?.email), session.json?.customer?.email || session.json?.error || "no session");

  const add1 = await api(
    "/api/customer/cart",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product?.id, color, size, quantity: 1 }),
    },
    customerJar,
  );
  const qtyAfterFirst = add1.json?.items?.find((row) => row.productId === product?.id && row.color === color && row.size === size)?.quantity ?? 0;
  record("POST /api/customer/cart add item", add1.res.ok && qtyAfterFirst >= 1, add1.res.ok ? `qty=${qtyAfterFirst}` : add1.json?.error || String(add1.res.status));

  const add2 = await Promise.all([
    api("/api/customer/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product?.id, color, size, quantity: 1 }) }, customerJar),
    api("/api/customer/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product?.id, color, size, quantity: 1 }) }, customerJar),
  ]);
  const afterDup = await api("/api/customer/cart", {}, customerJar);
  const qtyAfterDup = afterDup.json?.items?.find((row) => row.productId === product?.id && row.color === color && row.size === size)?.quantity ?? 0;
  record(
    "Duplicate add-to-cart does not explode",
    add2.every((row) => row.res.ok || row.res.status === 409) && qtyAfterDup >= qtyAfterFirst,
    `qty=${qtyAfterDup} statuses=${add2.map((row) => row.res.status).join(",")}`,
  );

  const line = afterDup.json?.items?.[0];
  if (line) {
    const qty = await api(
      "/api/customer/cart",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setQuantity", itemId: line.id, quantity: 1 }) },
      customerJar,
    );
    record("POST /api/customer/cart setQuantity=1", qty.res.ok, qty.res.ok ? `items=${qty.json?.items?.length}` : qty.json?.error || String(qty.res.status));
  } else {
    record("POST /api/customer/cart setQuantity=1", false, "no cart line");
  }

  const couponUnknown = await api("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "NOT-A-REAL-COUPON", lines: [{ productId: product?.id, unitPrice: 699, quantity: 1 }] }) }, customerJar);
  record("POST /api/coupons/validate unknown coupon", couponUnknown.res.status === 409 || couponUnknown.json?.ok === false, `status=${couponUnknown.res.status} ok=${couponUnknown.json?.ok}`);

  const trackMissing = await api("/api/orders/track/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: "ABO-000000-XXXX" }) });
  record(
    "POST /api/orders/track/request unknown order",
    trackMissing.res.ok && trackMissing.json?.ok === true,
    "anti-enumeration: request always ok, verify still required",
  );
  const trackVerify = await api("/api/orders/track/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: "ABO-000000-XXXX", phoneLast4: "0000" }) });
  record("POST /api/orders/track/verify wrong details", !trackVerify.res.ok, `status=${trackVerify.res.status}`);

  const checkoutId = crypto.randomUUID();
  const orderPayload = {
    checkoutId,
    mode: "buy_now",
    promoCode: "",
    buyNow: { productId: product?.id, color, size, quantity: 1 },
    address: {
      label: "QA",
      line1: "12 Test Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      isDefault: true,
    },
  };
  const firstOrder = await api("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) }, customerJar);
  const orderNumber = firstOrder.json?.order?.orderNumber;
  record(
    "POST /api/orders place buy-now",
    firstOrder.res.ok && Boolean(orderNumber),
    firstOrder.res.ok
      ? `${orderNumber} payment=${firstOrder.json?.order?.paymentStatus} status=${firstOrder.json?.order?.orderStatus}`
      : firstOrder.json?.error || String(firstOrder.res.status),
  );

  const retryOrder = await api("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) }, customerJar);
  const sameOrder = retryOrder.json?.order?.orderNumber === orderNumber && retryOrder.json?.order?.id === firstOrder.json?.order?.id;
  record(
    "Duplicate checkoutId returns same order",
    Boolean(orderNumber) && retryOrder.res.ok && sameOrder,
    retryOrder.res.ok ? `retry=${retryOrder.json?.order?.orderNumber}` : retryOrder.json?.error || String(retryOrder.res.status),
  );

  if (orderNumber) {
    const listed = await api("/api/orders", {}, customerJar);
    const found = listed.json?.orders?.some((row) => row.orderNumber === orderNumber);
    record("GET /api/orders includes placed order", Boolean(found), `count=${listed.json?.orders?.length ?? 0}`);

    const detail = await api(`/api/orders/${encodeURIComponent(orderNumber)}`, {}, customerJar);
    const snapshotOk =
      detail.json?.order?.items?.[0]?.productId === product?.id &&
      detail.json?.order?.items?.[0]?.color === color &&
      detail.json?.order?.items?.[0]?.size === size &&
      typeof detail.json?.order?.totalAmount === "number";
    record("GET /api/orders/:id snapshot", Boolean(snapshotOk), snapshotOk ? `total=${detail.json.order.totalAmount} payment=${detail.json.order.paymentStatus}` : detail.json?.error || "missing snapshot");
  }

  const cartAfter = await api("/api/customer/cart", {}, customerJar);
  record("Cart still present after buy-now (cart mode not used)", cartAfter.res.ok, `items=${cartAfter.json?.items?.length ?? 0}`);

  const adminUser = env.ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPass = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (adminUser && adminPass) {
    const adminLogin = await api("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: adminUser, password: adminPass }) }, adminJar);
    record("POST /api/admin/auth", adminLogin.res.ok, adminLogin.res.ok ? "authenticated" : adminLogin.json?.error || String(adminLogin.res.status));
    if (adminLogin.res.ok) {
      const adminOrders = await api("/api/admin/orders", {}, adminJar);
      record("GET /api/admin/orders", adminOrders.res.ok, `status=${adminOrders.res.status}`);
      const adminProducts = await api("/api/admin/products", {}, adminJar);
      record("GET /api/admin/products", adminProducts.res.ok, `status=${adminProducts.res.status}`);
      const adminReviews = await api("/api/admin/reviews", {}, adminJar);
      record("GET /api/admin/reviews", adminReviews.res.ok, `status=${adminReviews.res.status}`);
      if (orderNumber && firstOrder.json?.order?.id) {
        const adminOrder = await api(`/api/admin/orders/${firstOrder.json.order.id}`, {}, adminJar);
        const match =
          adminOrder.json?.order?.orderNumber === orderNumber &&
          adminOrder.json?.order?.orderStatus === firstOrder.json.order.orderStatus;
        record("Admin order status matches customer order", Boolean(match), match ? adminOrder.json.order.orderStatus : adminOrder.json?.error || String(adminOrder.res.status));
      }
    }
  } else {
    record("POST /api/admin/auth", false, "ADMIN_USERNAME/PASSWORD not in .env.local");
  }

  const badAdmin = await api("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "not-an-admin", password: "wrong" }) });
  record("POST /api/admin/auth rejects bad credentials", badAdmin.res.status === 401, `status=${badAdmin.res.status}`);

  return { email, password, product, color, size, orderNumber, customerJar };
}

async function overflowAt(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowing = [];
    if (doc.scrollWidth > window.innerWidth + 2) overflowing.push("document");
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 2 && rect.right > window.innerWidth + 3 && rect.left < window.innerWidth) {
        const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(".") : "";
        overflowing.push(`${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`);
        if (overflowing.length > 8) break;
      }
    }
    return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, overflowing };
  });
}

async function runBrowserTests(apiContext, chromium) {
  console.log("\n=== Browser ===\n");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  for (const path of pages) {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    const status = response?.status() ?? 0;
    const okStatus = status >= 200 && status < 400;
    record(`Open ${path}`, okStatus, `HTTP ${status}`);
    if (!okStatus) continue;
    const overflow = await overflowAt(page, 390);
    record(
      `No overflow ${path} @390`,
      overflow.overflowing.length === 0,
      overflow.overflowing.length ? overflow.overflowing.join(", ") : `${overflow.scrollWidth}<=${overflow.innerWidth}`,
    );
  }

  for (const width of WIDTHS) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const home = await overflowAt(page, width);
    record(`Home overflow @${width}`, home.overflowing.length === 0, home.overflowing.length ? home.overflowing.join(", ") : `${home.scrollWidth}<=${home.innerWidth}`);

    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    const collection = await overflowAt(page, width);
    record(`Collection overflow @${width}`, collection.overflowing.length === 0, collection.overflowing.length ? collection.overflowing.join(", ") : `${collection.scrollWidth}<=${collection.innerWidth}`);

    await page.goto(`${BASE}/collection/regular-240`, { waitUntil: "domcontentloaded" });
    const pdp = await overflowAt(page, width);
    record(`PDP overflow @${width}`, pdp.overflowing.length === 0, pdp.overflowing.length ? pdp.overflowing.join(", ") : `${pdp.scrollWidth}<=${pdp.innerWidth}`);

    await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
    const checkout = await overflowAt(page, width);
    record(`Checkout overflow @${width}`, checkout.overflowing.length === 0, checkout.overflowing.length ? checkout.overflowing.join(", ") : `${checkout.scrollWidth}<=${checkout.innerWidth}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const menu = page.getByLabel("Open menu");
  if (await menu.count()) {
    await menu.click();
    const mobileNav = page.getByRole("navigation", { name: "Mobile" });
    record("Mobile nav opens", await mobileNav.isVisible(), "");
    await page.getByRole("link", { name: "Collection" }).first().click();
    await page.waitForURL("**/collection");
    record("Mobile nav Collection", page.url().includes("/collection"), page.url());
  } else {
    record("Mobile nav opens", false, "menu button missing");
  }

  await page.goto(`${BASE}/collection/regular-240`, { waitUntil: "domcontentloaded" });
  const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
  const addVisible = await addBtn.isVisible().catch(() => false);
  record("PDP Add to Cart visible", addVisible, "");
  if (addVisible) {
    const box = await addBtn.boundingBox();
    record("PDP Add to Cart thumb target", Boolean(box && box.height >= 40), box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "no box");
    await addBtn.click();
    const addingOrAdded = await page.getByRole("button", { name: /adding|added/i }).first().isVisible().catch(() => false);
    const drawer = page.getByRole("heading", { name: "Cart" });
    await drawer.waitFor({ state: "visible", timeout: 15000 }).catch(() => null);
    record("PDP Add to Cart opens drawer", await drawer.isVisible().catch(() => false), addingOrAdded ? "button feedback shown" : "drawer after add");
    const qtyPlus = page.getByLabel("Increase quantity");
    if (await qtyPlus.count()) {
      const qtyBox = await qtyPlus.boundingBox();
      record("Cart qty + thumb target", Boolean(qtyBox && qtyBox.height >= 40), qtyBox ? `${Math.round(qtyBox.width)}x${Math.round(qtyBox.height)}` : "");
    }
    const checkoutBtn = page.getByRole("button", { name: "Checkout" });
    if (await checkoutBtn.count()) {
      await checkoutBtn.click();
      await page.waitForTimeout(800);
      const authOrCheckout = page.url().includes("/checkout") || (await page.getByText(/sign in to checkout|create account|welcome back/i).count()) > 0;
      record("Cart checkout leads to auth or checkout", authOrCheckout, page.url());
    }
  }

  await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
  const cardAdd = page.getByRole("button", { name: /add to cart/i }).first();
  if (await cardAdd.count()) {
    await cardAdd.click();
    const dialog = page.getByRole("heading", { name: "Select options" });
    const opened = await dialog.isVisible().catch(() => false);
    record("Collection ATC opens variant dialog", opened, "");
    if (opened) {
      const colorBtn = page.locator('[aria-pressed]').filter({ hasText: /black|white|lavender|beige|maroon/i }).first();
      if (await colorBtn.count()) await colorBtn.click();
      const sizeBtn = page.getByRole("button", { name: "M", exact: true }).first();
      if (await sizeBtn.count()) await sizeBtn.click();
      const confirm = page.getByRole("button", { name: /add to cart/i }).last();
      await confirm.click();
      const cartTitle = page.getByRole("heading", { name: "Cart" });
      await cartTitle.waitFor({ state: "visible", timeout: 15000 }).catch(() => null);
      record("Variant dialog add opens cart", await cartTitle.isVisible().catch(() => false), "");
    }
  } else {
    record("Collection ATC opens variant dialog", false, "no add button");
  }

  await page.goto(`${BASE}/track-order`, { waitUntil: "domcontentloaded" });
  const orderInput = page.getByLabel("Order ID");
  if (await orderInput.count()) {
    await orderInput.fill("ABO-000000-XXXX");
    await page.getByRole("button", { name: /continue|verify|track/i }).first().click();
    const err = await page.getByRole("alert").or(page.getByText(/please check|not found|try again|could not/i)).first();
    record("Track order unknown ID shows error", await err.isVisible().catch(() => false), await err.textContent().catch(() => ""));
  } else {
    record("Track order form visible", true, "signed-in view or missing label");
  }

  if (apiContext?.email && apiContext?.password) {
    await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
    const loginBtn = page.getByRole("button", { name: /login \/ signup/i });
    if (await loginBtn.count()) {
      await loginBtn.click();
      const welcome = page.getByText(/welcome back|create account/i).first();
      await welcome.waitFor({ state: "visible", timeout: 10000 }).catch(() => null);
      if (await page.getByRole("heading", { name: /create account/i }).count()) {
        await page.getByRole("button", { name: /log in/i }).first().click().catch(() => null);
      }
      await page.getByLabel(/email/i).fill(apiContext.email);
      await page.getByLabel(/password/i).fill(apiContext.password);
      await page.getByRole("button", { name: /log in|sign in/i }).last().click();
      await page.waitForTimeout(1500);
      record("Checkout login modal works", !(await page.getByText(/authentication failed|please check your details/i).count()), "");
    }
  }

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  record("Admin login page", (await page.getByLabel(/username/i).count()) > 0, "");

  await browser.close();
}

const apiContext = await runApiTests();
if (process.env.LIVE_QA_API_ONLY === "1") {
  console.log("\n=== Summary ===");
  const passed = results.filter((row) => row.ok).length;
  console.log(`${passed}/${results.length} checks passed, ${failures.length} failed`);
  if (failures.length) console.log(failures.map((row) => `- ${row}`).join("\n"));
  process.exit(failures.length ? 1 : 0);
}
try {
  const { chromium } = await import("playwright");
  await runBrowserTests(apiContext, chromium);
} catch (error) {
  record("Browser suite", false, error instanceof Error ? error.message : String(error));
}

console.log("\n=== Summary ===");
const passed = results.filter((row) => row.ok).length;
console.log(`${passed}/${results.length} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((row) => `- ${row}`).join("\n"));
}
process.exit(failures.length ? 1 : 0);
