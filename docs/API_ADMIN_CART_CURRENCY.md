# Admin Cart Currency (USD / INR / AED)

Use this with the **currency dropdown** in the admin panel. **Influencer `sellPrice` is always stored in USD.** The cart/proposal default is **USD** with **no FX conversion**.

The backend **does not** call a live rate service when creating or updating carts. You **must** pass `ratio` from the frontend whenever `currency` is **INR** or **AED**, using the **same** number you showed the user (typically from `GET /api/v1/admin/rate?from=USD&to=INR` or `...&to=AED`).

**Auth:** `Authorization: Bearer <admin_token>`

---

## Pricing rules

| `currency` | `ratio` | Line unit price |
|--------------|---------|------------------|
| `USD` (or omitted → USD) | Omitted | Each line: `items[].price` if sent, else `influencer.sellPrice` (no multiplier). |
| `USD` | Sent | Each line: `sellPrice × ratio` (optional markup); item `price` ignored when ratio is used. |
| `INR` or `AED` | **Required** | Each line: `sellPrice_USD × ratio`. Item `price` ignored. |

**Formula (non-USD):** `amount_in_cart_currency = sellPrice_USD * ratio`

Use the admin **rate** endpoint so frontend and backend share one number. Example: if `GET ...?from=USD&to=INR` returns `ratio: 83.5`, then a `sellPrice` of `100` USD becomes `8350.00` INR per unit on the line.

---

## Allowed `currency` values

`USD`, `INR`, `AED`

---

## 1) Create cart

**POST** `/api/v1/admin/cart`

### Body

| Field | Required | Notes |
|-------|----------|--------|
| `clientId` | Yes | Client UUID. |
| `currency` | No | Defaults to `USD`. |
| `ratio` | **Yes if `currency` is INR or AED** | Same value as on the UI / from rate API. |
| `ratio` | No if `USD` | Omit for “use sell price as-is” or explicit line prices. |
| `discountPercent`, `managementFeePercent` | No | Same as main cart docs. |
| `items` | Yes | At least one line. |

### Item shape

| Field | Required | Notes |
|-------|----------|--------|
| `influencerId` | Yes | |
| `quantity` | Yes | Positive number. |
| `price` | No | For **USD** without `ratio`: optional; if omitted, uses `sellPrice`. For **INR/AED**, ignored (prices come from `sellPrice × ratio`). |

### Example: USD (no conversion)

```json
{
  "clientId": "client-uuid",
  "currency": "USD",
  "items": [
    { "influencerId": "inf-uuid-1", "quantity": 1 }
  ]
}
```

### Example: INR (frontend supplies `ratio`)

1. Frontend: `GET /api/v1/admin/rate?from=USD&to=INR` → e.g. `{ "ratio": 83.5 }`
2. Frontend: send that `ratio` on create:

```json
{
  "clientId": "client-uuid",
  "currency": "INR",
  "ratio": 83.5,
  "items": [
    { "influencerId": "inf-uuid-1", "quantity": 1 }
  ]
}
```

If `currency` is `INR` or `AED` and `ratio` is missing, the API returns **400**.

---

## 2) Update cart

**PATCH** `/api/v1/admin/cart/:id`

### Changing currency

- **To USD:** You may omit `ratio`; backend recalculates lines as `sellPrice × 1` (back to USD amounts).
- **To INR or AED:** You **must** send `ratio` (same rule as create). Otherwise **400**.

If you only change discount/fee and do **not** change `currency`, you do not need to resend `ratio`.

### Example: switch cart to INR

```json
{
  "currency": "INR",
  "ratio": 83.5,
  "discountPercent": 0,
  "managementFeePercent": 15
}
```

---

## Related

- Rate endpoint: **`docs/API_ADMIN_RATE.md`**
- Full cart CRUD: **`docs/API_ADMIN_CART_CREATE.md`**, **`docs/API_ADMIN_CART_UPDATE.md`**
