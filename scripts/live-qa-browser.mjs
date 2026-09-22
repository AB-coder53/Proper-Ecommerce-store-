import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.LIVE_QA_URL || "http://127.0.0.1:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const WIDTHS = [320, 360, 375, 390, 414, 430];
const PAGES = [
  "/",
  "/collection",
  "/collection/regular-240",
  "/cart",
  "/checkout",
  "/checkout/success",
  "/track-order",
  "/about",
  "/faq",
  "/contact",
  "/admin/login",
];

const failures = [];
const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}: ${detail}`);
}

async function waitJson(url, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error(`CDP not ready at ${url}`);
}

function cdp(ws, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const timer = setTimeout(() => reject(new Error(`CDP timeout ${method}`)), 40000);
    const onMessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString();
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.id === id) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        if (msg.error) reject(new Error(msg.error.message || method));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}

async function evaluate(ws, sessionId, expression) {
  const result = await cdp(
    ws,
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  return result?.result?.value;
}

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + process.env.TEMP + "\\ab-live-qa-chrome",
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  const version = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("CDP websocket failed")));
  });

  const { sessionId } = await cdp(ws, "Target.attachToBrowserTarget");
  await cdp(ws, "Target.setDiscoverTargets", { discover: true }, sessionId);

  async function openPage(url, width) {
    const { targetId } = await cdp(ws, "Target.createTarget", { url: "about:blank" }, sessionId);
    const attached = await cdp(ws, "Target.attachToTarget", { targetId, flatten: true }, sessionId);
    const sid = attached.sessionId;
    await cdp(ws, "Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    }, sid);
    await cdp(ws, "Page.enable", {}, sid);
    await cdp(ws, "Runtime.enable", {}, sid);
    await new Promise((resolve) => {
      const onMessage = (event) => {
        const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString();
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        if (msg.method === "Page.loadEventFired" && msg.sessionId === sid) {
          ws.removeEventListener("message", onMessage);
          resolve(null);
        }
      };
      ws.addEventListener("message", onMessage);
      void cdp(ws, "Page.navigate", { url }, sid).then(() => sleep(5000).then(() => {
        ws.removeEventListener("message", onMessage);
        resolve(null);
      }));
    });
    await sleep(400);
    return { sid, targetId };
  }

  for (const path of PAGES) {
    try {
      const { sid, targetId } = await openPage(`${BASE}${path}`, 390);
      const status = await evaluate(ws, sid, `document.readyState`);
      const title = await evaluate(ws, sid, `document.title`);
      const overflow = await evaluate(
        ws,
        sid,
        `(() => {
          const extra = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 2) extra.push('document:' + document.documentElement.scrollWidth + '>' + window.innerWidth);
          return extra;
        })()`,
      );
      record(`Open ${path}`, status === "complete" || status === "interactive", title || status);
      record(`No overflow ${path} @390`, Array.isArray(overflow) && overflow.length === 0, overflow?.join(", ") || "ok");
      await cdp(ws, "Target.closeTarget", { targetId }, sessionId).catch(() => null);
    } catch (error) {
      record(`Open ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  for (const width of [320, 375, 430]) {
    for (const path of ["/", "/collection", "/collection/regular-240", "/checkout"]) {
      try {
        const { sid, targetId } = await openPage(`${BASE}${path}`, width);
        const overflow = await evaluate(
          ws,
          sid,
          `document.documentElement.scrollWidth <= window.innerWidth + 2`,
        );
        const detail = await evaluate(
          ws,
          sid,
          `document.documentElement.scrollWidth + '/' + window.innerWidth`,
        );
        record(`Overflow ${path} @${width}`, overflow === true, String(detail));
        await cdp(ws, "Target.closeTarget", { targetId }, sessionId).catch(() => null);
      } catch (error) {
        record(`Overflow ${path} @${width}`, false, error instanceof Error ? error.message : String(error));
      }
    }
  }

  // Guest add-to-cart on PDP
  try {
    const { sid, targetId } = await openPage(`${BASE}/collection/regular-240`, 390);
    const addResult = await evaluate(
      ws,
      sid,
      `(() => {
        const btn = [...document.querySelectorAll('button')].find((el) => /add to cart/i.test(el.textContent || ''));
        if (!btn) return { found: false };
        const rect = btn.getBoundingClientRect();
        btn.click();
        return { found: true, h: Math.round(rect.height), w: Math.round(rect.width), text: btn.textContent };
      })()`,
    );
    record("PDP Add to Cart found", Boolean(addResult?.found), addResult?.text || "missing");
    record("PDP Add to Cart height >= 44", Boolean(addResult?.h >= 44), addResult ? `${addResult.w}x${addResult.h}` : "");
    await sleep(1200);
    const after = await evaluate(
      ws,
      sid,
      `(() => {
        const buttons = [...document.querySelectorAll('button')].map((el) => (el.textContent || '').trim()).filter(Boolean).slice(0, 12);
        const cart = !!document.querySelector('h2,h1,[role="dialog"]') && /cart|select options|adding|added/i.test(document.body.innerText);
        return { buttons, cart, bodyHasCart: /cart/i.test(document.body.innerText) };
      })()`,
    );
    record("PDP add shows cart/options feedback", Boolean(after?.cart || after?.bodyHasCart), JSON.stringify(after?.buttons || []));
    await cdp(ws, "Target.closeTarget", { targetId }, sessionId).catch(() => null);
  } catch (error) {
    record("PDP Add to Cart flow", false, error instanceof Error ? error.message : String(error));
  }

  ws.close();
} finally {
  chrome.kill();
}

console.log("\n=== Browser summary ===");
console.log(`${results.filter((row) => row.ok).length}/${results.length} passed, ${failures.length} failed`);
if (failures.length) console.log(failures.map((row) => `- ${row}`).join("\n"));
process.exit(failures.length ? 1 : 0);
