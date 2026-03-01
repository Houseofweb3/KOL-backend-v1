# Web Cart Create API – Create cart with multiple items

**Single API to create (or replace) the cart with one or more items.** Send an array of `influencerId` and `quantity`; the backend takes everything else (e.g. `price`) from the **Influencer** entity. Use this doc for frontend or AI integration.

---

## Overview

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path** | `/api/v1/web/cart/create` |
| **Auth** | Required: `Authorization: Bearer <client_token>` |
| **Purpose** | Set the client’s cart to exactly the given list of items (replaces existing cart contents). |

**Payload:** `items` (array of `influencerId` + `quantity`) only. **Price** for cart items is taken from the **Influencer** entity. **Client ID** and **Cart ID** are set by the backend and not sent in the payload.

---

## Base URL & headers

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <client_token>` |

**Full URL example:** `POST {API_BASE}/api/v1/web/cart/create`  
Example: `http://localhost:3002/api/v1/web/cart/create`

---

## TypeScript types (frontend)

```ts
/** One line in the create-cart request. Only influencerId and quantity are sent; price comes from Influencer. */
export interface CreateCartItemInput {
    influencerId: string;  // UUID of the influencer
    quantity: number;      // positive integer
}

/** Request body for POST /api/v1/web/cart/create */
export interface CreateCartPayload {
    items: CreateCartItemInput[];
}

/** One line item in the cart response (same as other cart APIs) */
export interface CartItemDTO {
    id: string;
    influencerId: string;
    quantity: number;
    price: string;  // decimal string, from Influencer.sellPrice at create time
}

/** Response: full cart (same as GET /cart, create, remove) */
export interface CartDTO {
    id: string;
    clientId: string;
    status: string;  // 'generate' | 'send' | 'approved'; default 'generate'
    items: CartItemDTO[];
}

/** Error response */
export interface ApiError {
    error: string;
}
```

---

## Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | Yes | Non-empty array of `{ influencerId, quantity }`. |

Each element:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `influencerId` | string (UUID) | Yes | Influencer id. Must exist, not deleted, and have `sellPrice` set. |
| `quantity` | number | Yes | Positive integer. |

**Example body:**

```json
{
  "items": [
    { "influencerId": "uuid-influencer-1", "quantity": 2 },
    { "influencerId": "uuid-influencer-2", "quantity": 1 }
  ]
}
```

---

## Success response (200)

Returns the cart after create/replace (same shape as other cart APIs).

```json
{
  "id": "cart-uuid",
  "clientId": "client-uuid",
  "status": "generate",
  "items": [
    {
      "id": "cart-item-uuid-1",
      "influencerId": "uuid-influencer-1",
      "quantity": 2,
      "price": "150.00"
    },
    {
      "id": "cart-item-uuid-2",
      "influencerId": "uuid-influencer-2",
      "quantity": 1,
      "price": "99.00"
    }
  ]
}
```

---

## Error responses

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "items array is required and must contain at least one entry" }` | Missing or empty `items`. |
| 400 | `{ "error": "items[0]: influencerId is required" }` | Entry at index `i` missing `influencerId`. |
| 400 | `{ "error": "items[0]: quantity must be a positive number" }` | Entry at index `i` has invalid/zero/negative quantity. |
| 404 | `{ "error": "Influencer not found: <id>" }` | One of the influencer ids does not exist or is deleted. |
| 400 | `{ "error": "Influencer sellPrice is not configured: <id>" }` | Influencer exists but has no sell price. |
| 401 | `{ "success": false, "message": "..." }` | No or invalid client token (see `API_WEB_CLIENT_AUTH.md`). |
| 500 | `{ "error": "<message>" }` | Server error. |

---

## Example `fetch` (create cart with multiple items)

```ts
const payload: CreateCartPayload = {
  items: [
    { influencerId: 'uuid-1', quantity: 2 },
    { influencerId: 'uuid-2', quantity: 1 },
  ],
};

const res = await fetch(`${API_BASE}/api/v1/web/cart/create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clientToken}`,
  },
  body: JSON.stringify(payload),
});

const data = await res.json();
if (!res.ok) throw new Error((data as ApiError).error);
const cart: CartDTO = data;
```

---

## Behaviour summary

- **Auth:** Client id is taken from the JWT; do not send `clientId` in the body.
- **Replace semantics:** Existing cart items are **replaced** by the given `items` list. The cart is not merged with previous contents.
- **Data from Influencer:** For each item the backend loads the Influencer, checks it exists and is not deleted, and uses its **sellPrice** for the cart line (required by `CartItem`). No other payload fields are needed for cart item creation.
- **Duplicate influencer ids:** If the same `influencerId` appears multiple times in `items`, multiple lines are created (one per entry). To have a single line per influencer, send one entry per influencer with the desired quantity.

Use this doc together with `API_WEB_CART.md` for get cart and remove from cart.
