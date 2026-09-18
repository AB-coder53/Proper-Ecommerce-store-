# Commerce (customers, cart, wishlist, orders)

## Setup

1. Run the SQL migration in Supabase:
   - `supabase/migrations/20260812120000_commerce.sql`
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env` / Vercel.
3. Optional: `CUSTOMER_SESSION_SECRET` (falls back to `ADMIN_SESSION_SECRET`).

If Supabase tables are missing, the app falls back to `data/commerce.json` (local only).

## Customer flows

- Guest browsing works without login.
- **Add to Cart** works for guests (localStorage) and merges after login.
- **Buy Now** / **Wishlist** require login/signup, then continue the action.
- Checkout uses profile name/email/phone; collects address + optional alternate phone.
- Order IDs look like `ABO-YYMMDD-XXXX`.
- Prices are frozen on the order at purchase time (INR integers).

## Admin

- `/admin/orders` — list + status updates
- `/admin/customers` — profiles + order history

## Public tracking

- Footer → **Track Your Order** (`/track-order`) requires Order ID + email.
