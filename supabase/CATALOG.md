# Supabase catalogue setup

1. Open your Supabase project → **SQL Editor**
2. Paste and run: `supabase/migrations/20260812100000_products_collections.sql`
3. Add the service role key to `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
```

Find it under **Project Settings → API → service_role**.

## Tables

### `products`

| Column                                           | Type          | Notes                     |
| ------------------------------------------------ | ------------- | ------------------------- |
| id                                               | text PK       | slug e.g. `oversized-240` |
| name, fabric, image, tagline, description, price | text          |                           |
| images, details, colors, sizes                   | text[]        |                           |
| badge                                            | text nullable |                           |
| featured                                         | boolean       | homepage featured         |
| sort_order                                       | int           | display order             |
| created_at / updated_at                          | timestamptz   | auto                      |

### `collections`

| Column                  | Type                  | Notes                        |
| ----------------------- | --------------------- | ---------------------------- |
| id                      | text PK               | slug e.g. `oversized`        |
| title, image, tint      | text                  |                              |
| product_id              | text FK → products.id | nullable, SET NULL on delete |
| sort_order              | int                   |                              |
| created_at / updated_at | timestamptz           | auto                         |

## Security

- Public (`anon`) can **SELECT** only
- Admin create/update/delete uses **service_role** via Next.js API routes
