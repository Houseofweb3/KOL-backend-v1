# Wipe database API

Single admin endpoint to delete **all data** from the application database. Use only in development/staging or when explicitly intended (e.g. reset environment).

---

## Admin: Wipe all data

**POST** `/api/v1/admin/database/wipe`

**Auth:** `Authorization: Bearer <admin_token>` (admin auth required).

**Body:** None.

**Success (200):**

```json
{
  "success": true,
  "message": "All application data has been deleted.",
  "tablesTruncated": 8
}
```

**Behaviour:**

- Truncates all application tables (deletes every row).
- Tables affected: `billing_info`, `proposal_links`, `cart_items`, `carts`, `clients`, `influencers`, `otps`, `users`.
- Uses PostgreSQL `TRUNCATE ... RESTART IDENTITY CASCADE` so foreign keys are respected and sequences (if any) are reset.
- Does **not** drop tables or schema; with `synchronize: true`, tables remain and the app can be used normally after wipe.

**Errors:**

- **401** – Missing or invalid admin token.
- **500** – Database error (e.g. connection or permission).

**Warning:** This is a destructive operation. Restrict use to dev/staging or protect the route in production (e.g. feature flag or disable in prod).
