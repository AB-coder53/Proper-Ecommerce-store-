# AB Collection Pre-Launch

Premium pre-launch landing page for AB Collection, built with Next.js.

**Live (Lovable)**: https://abcollection-prelaunch.lovable.app

## Development

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint

## Environment

Copy `.env` and set:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client Supabase
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — server Supabase (leads API)
- `LOVABLE_API_KEY` / `GOOGLE_SHEETS_API_KEY` / `RESERVATIONS_SHEET_ID` — Google Sheets via Lovable connector
- `LOVABLE_ASSET_ORIGIN` (optional) — origin used to proxy `/__l5e` product images
