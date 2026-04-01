# Admin Exchange Rate API

**Admin-only.** Returns an exchange-rate ratio using **Alpha Vantage** (`CURRENCY_EXCHANGE_RATE`) when `ALPHA_VANTAGE_API_KEY` is set, otherwise falls back to **static** rates for supported pairs.

## Setup

Add a free API key to `.env` (get one at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)):

```env
ALPHA_VANTAGE_API_KEY=your_key_here
```

If the key is missing or Alpha Vantage errors (rate limit, invalid key, etc.), the response still returns **200** with `"source": "static"` when a static pair exists.

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
  "from": "USD",
  "to": "INR",
  "ratio": 93.5,
  "source": "live"
}
```

`source` is `"live"` when Alpha Vantage succeeded, or `"static"` when the live call failed and a built-in fallback was used.

### How to use `ratio`

`amount_in_to = amount_in_from * ratio`

Example: `100 USD * 93.5 = 9350 INR`

### Notes

- Alpha Vantage free tier has **request limits**; heavy polling may return a note and trigger static fallback.
- If live fetch fails and there is **no** static rate for that pair, the API returns an error (503).
- Keep query params uppercase (backend uppercases them).

### Typical admin cart flow (non-USD)

1. Call **`GET /api/v1/admin/rate?from=USD&to=INR`** (or `to=AED`).
2. Show `ratio` in the UI.
3. Send the **same** `ratio` in **`POST /api/v1/admin/cart`** or **`PATCH /api/v1/admin/cart/:id`** with `currency: "INR"` (or `"AED"`). See `API_ADMIN_CART_CURRENCY.md`.
