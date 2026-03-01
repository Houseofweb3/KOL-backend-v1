# Admin Cart – Create cart (proposal) API

**Admin-only.** Create or replace a cart (proposal) for a client: select client, add influencer line items with quantity/price/notes/proof of work, set discount % and management fee %. Backend computes subtotal, discount amount, management fee amount, and total.

**Auth:** `Authorization: Bearer <admin_token>`.

---

## Create cart

**POST** `/api/v1/admin/cart`

**Request body:**

| Field                 | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| `clientId`            | string | Yes      | Client UUID (from client select API). |
| `discountPercent`     | number/string | No | Discount % (0–100). Default `0`. |
| `managementFeePercent`| number/string | No | Management fee % (0–100). Default `15`. |
| `items`               | array  | Yes      | At least one line item (see below). |

**Each item in `items`:**

| Field          | Type    | Required | Description |
|----------------|---------|----------|-------------|
| `influencerId`| string  | Yes      | Influencer UUID (from influencer select API). |
| `quantity`    | number  | Yes      | Positive integer. |
| `price`       | number/string | Yes | Unit price (e.g. 200 or "200"). Can include $ or commas; backend normalizes. |
| `notes`       | string  | No       | Optional notes for this line. |
| `proofOfWork` | string[]| No       | Optional list of proof-of-work URLs. |

**Example body:**

```json
{
  "clientId": "client-uuid-here",
  "discountPercent": 0,
  "managementFeePercent": 15,
  "items": [
    {
      "influencerId": "influencer-uuid-1",
      "quantity": 1,
      "price": 200,
      "notes": "Single tweet campaign",
      "proofOfWork": ["https://example.com/proof1"]
    },
    {
      "influencerId": "influencer-uuid-2",
      "quantity": 2,
      "price": "150.00"
    }
  ]
}
```

---

## Success (201 Created)

Returns the created/updated cart with the same shape as the list endpoint (including pricing summary and items with notes/proofOfWork).

```json
{
  "id": "cart-uuid",
  "clientId": "client-uuid",
  "status": "generate",
  "createdAt": "2026-03-01T12:00:00.000Z",
  "subtotal": "500.00",
  "discountPercent": "0",
  "discountAmount": "0.00",
  "managementFeePercent": "15",
  "managementFeeAmount": "75.00",
  "total": "575.00",
  "client": {
    "id": "client-uuid",
    "name": "Client Name",
    "email": "client@example.com"
  },
  "items": [
    {
      "id": "cart-item-uuid-1",
      "influencerId": "influencer-uuid-1",
      "quantity": 1,
      "price": "200.00",
      "notes": "Single tweet campaign",
      "proofOfWork": ["https://example.com/proof1"]
    },
    {
      "id": "cart-item-uuid-2",
      "influencerId": "influencer-uuid-2",
      "quantity": 2,
      "price": "150.00",
      "notes": null,
      "proofOfWork": null
    }
  ]
}
```

**Computation:**

- **Subtotal** = sum of (`quantity` × `price`) for all items.
- **Discount amount** = subtotal × (`discountPercent` / 100).
- **After discount** = subtotal − discount amount.
- **Management fee amount** = after discount × (`managementFeePercent` / 100).
- **Total** = after discount + management fee amount.

---

## Error responses

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "clientId is required" }` | Missing clientId. |
| 400 | `{ "error": "items array is required and must contain at least one entry" }` | Missing or empty items. |
| 400 | `{ "error": "items[0]: influencerId is required" }` | Item missing influencerId. |
| 400 | `{ "error": "items[0]: quantity must be a positive number" }` | Invalid quantity. |
| 404 | `{ "error": "Client not found" }` | clientId not found or client deleted. |
| 404 | `{ "error": "Influencer not found: <id>" }` | One of the influencer ids not found or deleted. |
| 401/403 | — | Invalid or missing admin token. |
| 500 | `{ "error": "<message>" }` | Server error. |

---

## Behaviour

- **One cart per client:** If the client already has a cart, it is **replaced** (existing items removed, new items and pricing set). Otherwise a new cart is created.
- **Status:** New or updated cart has status `generate`.
- **Price:** Backend normalizes price (strips `$`, commas) before saving. Store as decimal in DB.

---

## Cart-related entities (reference)

| Entity        | Table         | Main fields |
|---------------|---------------|-------------|
| **Cart**      | `carts`       | id, client_id, status, subtotal, discount_percent, discount_amount, management_fee_percent, management_fee_amount, total |
| **CartItem**  | `cart_items`  | id, cart_id, influencer_id, quantity, price, notes, proof_of_work (jsonb array) |

Use with **Client** (id, name, email) and **Influencer** (id, name, platform, sellPrice, etc.) for select dropdowns. See `API_ADMIN_CART_SELECT_APIS.md`.
