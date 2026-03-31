# Admin Exchange Rate API

**Admin-only.** Returns a live exchange-rate ratio using Anthropic.

## 1) Get exchange ratio

**GET** `/api/v1/admin/rate`

### Query parameters

| Param | Type | Required | Description |
|--------|------|----------|-------------|
| `from` | string | Yes | Currency code to convert **from** (e.g. `USD`, `INR`, `AED`). |
| `to` | string | Yes | Currency code to convert **to** (e.g. `USD`, `INR`, `AED`). |

### Auth header

`Authorization: Bearer <admin_token>`

### Response (200)

```json
{
  "success": true,
  "from": "INR",
  "to": "USD",
  "ratio": 0.011924,
  "source": "live"
}
```

### How to use `ratio`

The backend asks the model to return the ratio as a single decimal:

`amount_in_to = amount_in_from * ratio`

Example:
`5000 INR * 0.011924 = 59.62 USD`

### Notes

- `ratio` is parsed from Anthropic output.
- If live rate fetching fails, the API will return a **static fallback** ratio and set `"source": "static"`.
- Keep the request params uppercase (backend also uppercases them).

### Typical admin cart flow (non-USD)

1. Call **`GET /api/v1/admin/rate?from=USD&to=INR`** (or `to=AED`).
2. Show `ratio` in the UI.
3. Send the **same** `ratio` in **`POST /api/v1/admin/cart`** or **`PATCH /api/v1/admin/cart/:id`** with `currency: "INR"` (or `"AED"`). The cart service does **not** re-fetch the rate; see `API_ADMIN_CART_CURRENCY.md`.

