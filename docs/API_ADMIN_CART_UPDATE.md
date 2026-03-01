# Admin Cart – Update cart API

**Admin-only.** Update an existing cart by ID. The **client cannot be changed**. You can update cart-level pricing (discount %, management fee %), and/or sync line items: update price/quantity/notes/proof of work, add new influencers, or remove selected influencers.

**Get cart first:** Use **GET** `/api/v1/admin/cart/:id` to load the cart and refill your form, then send **PATCH** with the updated data.

**Auth:** `Authorization: Bearer <admin_token>`.

---

## Update cart

**PATCH** `/api/v1/admin/cart/:id`

**Path:** `id` – cart UUID.

**Request body:** All fields optional. Omit `items` to only update discount/fee and recalc totals from existing items.

| Field                 | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| `discountPercent`     | number/string | No | Discount % (0–100). |
| `managementFeePercent`| number/string | No | Management fee % (0–100). |
| `items`               | array  | No       | Full desired set of line items. See below. |

**When `items` is provided:** The list is the full desired set. Each element is either:

- **Update existing line:** include `id` (cart_item UUID). Optional: `quantity`, `price`, `notes`, `proofOfWork`. Omitted fields keep current value.
- **Add new line:** include `influencerId`, `quantity`, `price`. Optional: `notes`, `proofOfWork`. Do not include `id`.

Any current cart item whose `id` is **not** in the `items` list is **removed** (that influencer line is dropped from the cart).

**When `items` is omitted:** Existing items are unchanged; only `discountPercent` / `managementFeePercent` are applied and subtotal/discount/fee/total are recalculated.

---

### Item shape in `items`

**To update an existing line (include `id`):**

| Field        | Type     | Required | Description |
|--------------|----------|----------|-------------|
| `id`         | string   | Yes      | Cart item UUID (from list/GET). |
| `quantity`   | number   | No       | Positive integer. |
| `price`      | number/string | No | Unit price (normalized like create). |
| `notes`      | string   | No       | Notes for this line. Pass `null` to clear. |
| `proofOfWork`| string[] | No       | List of proof-of-work URLs. Pass `[]` or `null` to clear. |

**To add a new line (no `id`, include `influencerId`):**

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `influencerId`| string   | Yes      | Influencer UUID. |
| `quantity`    | number   | Yes      | Positive integer. |
| `price`       | number/string | Yes | Unit price. |
| `notes`       | string   | No       | Optional notes. |
| `proofOfWork` | string[]| No       | Optional proof-of-work URLs. |

---

### Example 1: Only update pricing (keep all items)

```json
PATCH /api/v1/admin/cart/cart-uuid
{
  "discountPercent": 10,
  "managementFeePercent": 15
}
```

Existing items unchanged; subtotal/discount/fee/total recalculated.

---

### Example 2: Update price and notes on one line, add proof of work

```json
PATCH /api/v1/admin/cart/cart-uuid
{
  "items": [
    { "id": "cart-item-uuid-1", "price": 180, "notes": "Updated campaign scope" },
    { "id": "cart-item-uuid-2", "quantity": 2, "proofOfWork": ["https://example.com/proof1", "https://example.com/proof2"] }
  ]
}
```

Only the two listed items are kept/updated; any other existing items are removed. Omitted fields on an existing item (e.g. `quantity` on first item) keep current value.

---

### Example 3: Remove one influencer, add another

Send the full desired `items` list: include all lines you want to **keep** (with their `id` and any updates), and add new lines with `influencerId` (no `id`). Omit any current item `id` to remove that line.

```json
PATCH /api/v1/admin/cart/cart-uuid
{
  "items": [
    { "id": "existing-cart-item-uuid-1", "quantity": 1, "price": "200.00" },
    {
      "influencerId": "new-influencer-uuid",
      "quantity": 1,
      "price": 150,
      "notes": "New addition"
    }
  ]
}
```

Here the first line is kept (and optionally updated); the second is a new influencer. Any other existing cart items are removed.

---

## Success (200)

Returns the updated cart in the same shape as the list endpoint (id, clientId, status, pricing, client, items with id, influencerId, quantity, price, notes, proofOfWork).

---

## Errors

| Status | Meaning |
|--------|---------|
| 400    | Bad request (e.g. invalid item id, missing required field for new item, invalid quantity). |
| 404    | Cart not found, or influencer not found (for a new item). |

Response body: `{ "error": "message" }`.
