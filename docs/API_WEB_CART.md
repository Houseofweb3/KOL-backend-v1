# Web Cart API – Frontend Integration

**Use this doc in your frontend repo:** Give this file (or its contents) to your frontend or AI to integrate the cart API. Cart has three operations: **get** (list), **create** (set cart with items), **remove** (remove one item).

---

## Overview

- **Purpose:** Logged-in clients can **get** their cart (list), **create** a cart with multiple items, and **remove** an item by influencer id. For full create-cart payload, see **`API_WEB_CART_CREATE.md`**.
- **Auth:** Every cart endpoint is **protected**. Send the **client JWT** from the web client auth flow (see `API_WEB_CLIENT_AUTH.md`). Client id is taken from the token; you never send `clientId` in the payload.
- **Base path:** `{API_BASE}/api/v1/web/cart`

---

## Base URL & Auth

| Item | Value |
|------|--------|
| **Base path** | `/api/v1/web/cart` |
| **Full base example** | `http://localhost:3002/api/v1/web/cart` |
| **Auth** | Required: `Authorization: Bearer <client_token>` |

**Obtain token:** Use the web client auth flow (signup or send-otp + verify-otp) as in `API_WEB_CLIENT_AUTH.md`. Store the returned `token` and send it on every cart request.

**Headers for all cart requests:**

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your_client_token>` |

---

## TypeScript types (copy into frontend)

```ts
// One line item in the cart (influencer + quantity + price snapshot)
export interface CartItemDTO {
  id: string;           // cart item uuid
  influencerId: string;
  quantity: number;
  price: string;        // decimal as string, e.g. "99.00" (sellPrice at create time)
}

// Full cart response (returned by get, create, remove)
export interface CartDTO {
  id: string;           // cart uuid
  clientId: string;
  status: string;       // 'generate' | 'send' | 'approved'; default 'generate'
  items: CartItemDTO[];
}

// Request payload: remove from cart
export interface RemoveFromCartPayload {
  influencerId: string;  // required
}

// Error response (all error statuses)
export interface ApiError {
  error: string;
}
```

---

## Endpoints summary

| Action | Method | Path | Body | Response |
|--------|--------|------|------|----------|
| Get cart (list) | GET | `/api/v1/web/cart` | — | `CartDTO` |
| Create cart | POST | `/api/v1/web/cart/create` | `{ items: [...] }` | `CartDTO` — see **API_WEB_CART_CREATE.md** |
| Remove from cart | POST | `/api/v1/web/cart/remove` | `{ influencerId }` | `CartDTO` |

---

## 1. Get cart (list)

**GET** `{API_BASE}/api/v1/web/cart`

Returns the current client’s cart. If the client has no cart yet, the backend creates one and returns it (with empty `items`).

**Request:** No body. No query params required.

**Success (200):**

```json
{
  "id": "cart-uuid",
  "clientId": "client-uuid",
  "status": "generate",
  "items": [
    {
      "id": "cart-item-uuid",
      "influencerId": "influencer-uuid",
      "quantity": 2,
      "price": "150.00"
    }
  ]
}
```

**Example (fetch):**

```ts
const res = await fetch(`${API_BASE}/api/v1/web/cart`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});
const cart: CartDTO = await res.json();
if (!res.ok) throw new Error((cart as ApiError).error);
```

---

## 2. Create cart

**POST** `{API_BASE}/api/v1/web/cart/create`

Creates or replaces the cart with the given items (and optional campaign details). Full payload and types: **`API_WEB_CART_CREATE.md`**.

**Request body (summary):** `items` (array of `{ influencerId, quantity }`). Client id and cart id are set by the backend.

**Success (200):** Returns the cart (`CartDTO`).

---

## 3. Remove from cart

**POST** `{API_BASE}/api/v1/web/cart/remove`

Removes one influencer (all quantity for that influencer) from the cart.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `influencerId` | string (UUID) | Yes | Influencer to remove from cart. |

**Example request body:**

```json
{
  "influencerId": "influencer-uuid-here"
}
```

**Success (200):** Returns the updated cart (`CartDTO`).

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "influencerId is required" }` | Missing `influencerId` |
| 404 | `{ "error": "Cart not found" }` | Client has no cart yet |
| 404 | `{ "error": "Cart item not found" }` | That influencer is not in the cart |
| 401 | `{ "success": false, "message": "..." }` | No/invalid/expired token |
| 500 | `{ "error": "<message>" }` | Server error |

**Example (fetch):**

```ts
const res = await fetch(`${API_BASE}/api/v1/web/cart/remove`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ influencerId }),
});
const cart: CartDTO = await res.json();
if (!res.ok) throw new Error((cart as ApiError).error);
```

---

## Quick reference

| Action | Method | URL | Body |
|--------|--------|-----|------|
| Get cart | GET | `/api/v1/web/cart` | — |
| Create cart | POST | `/api/v1/web/cart/create` | `{ items: [...] }` |
| Remove from cart | POST | `/api/v1/web/cart/remove` | `{ influencerId }` |

**Base:** `{API_BASE}/api/v1/web/cart`  
**Example API_BASE:** `http://localhost:3002`  
**Auth:** `Authorization: Bearer <client_token>` on every request.

---

## Integration flow

1. **Login:** Use web client auth (signup or send-otp + verify-otp) and store `token` (and optionally `client`). See `API_WEB_CLIENT_AUTH.md`.
2. **Cart:** Use the same `token` for all cart calls. Client id is inferred from the token; do not send `clientId` in any payload.
3. **Influencer ids:** Get influencer ids from the list influencers API (`GET /api/v1/web/influencer`), then use those ids in create (items) and remove.
4. **On 401/403:** Clear token and redirect to login (same as other protected web routes).

Use this document so your frontend or AI can integrate the cart API correctly.
