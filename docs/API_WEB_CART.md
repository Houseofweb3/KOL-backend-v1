# Web Cart API – Frontend Integration

**Use this doc in your frontend repo:** Give this file (or its contents) to your frontend or AI to integrate the cart API. It describes where the API lives, how to call it, payload types, and response shapes.

---

## Overview

- **Purpose:** Let logged-in clients get their cart, **create a cart with multiple items in one request**, add influencers (by id + quantity), remove by influencer id, and update quantity (or remove when quantity ≤ 0). For the **create cart (multi-item)** API, see **`API_WEB_CART_CREATE.md`**.
- **Auth:** Every cart endpoint is **protected**. You must send the **client JWT** from the web client auth flow (see `API_WEB_CLIENT_AUTH.md`). Client id is taken from the token; you never send `clientId` in the payload.
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
  price: string;        // decimal as string, e.g. "99.00" (sellPrice at add time)
}

// Full cart response (returned by get, add, remove, update)
export interface CartDTO {
  id: string;           // cart uuid
  clientId: string;
  items: CartItemDTO[];
}

// Request payload: add to cart
export interface AddToCartPayload {
  influencerId: string;  // required
  quantity?: number;     // optional, default 1
}

// Request payload: remove from cart
export interface RemoveFromCartPayload {
  influencerId: string;  // required
}

// Request payload: update cart item (set quantity; ≤ 0 removes item)
export interface UpdateCartPayload {
  influencerId: string;  // required
  quantity: number;      // required; use 0 to remove
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
| Get cart | GET | `/api/v1/web/cart` | — | `CartDTO` |
| **Create cart (multi-item)** | POST | `/api/v1/web/cart/create` | `{ items: [{ influencerId, quantity }, ...] }` | `CartDTO` — see **API_WEB_CART_CREATE.md** |
| Add to cart | POST | `/api/v1/web/cart/add` | `AddToCartPayload` | `CartDTO` |
| Remove from cart | POST | `/api/v1/web/cart/remove` | `RemoveFromCartPayload` | `CartDTO` |
| Update cart item | POST | `/api/v1/web/cart/update` | `UpdateCartPayload` | `CartDTO` |

---

## 1. Get cart

**GET** `{API_BASE}/api/v1/web/cart`

Returns the current client’s cart. If the client has no cart yet, the backend creates one and returns it (with empty `items`).

**Request:** No body. No query params required.

**Success (200):**

```json
{
  "id": "cart-uuid",
  "clientId": "client-uuid",
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

## 2. Add to cart

**POST** `{API_BASE}/api/v1/web/cart/add`

Adds an influencer to the cart (or increases quantity if already in cart). Price is taken from the influencer’s **sellPrice** at add time and stored per line.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `influencerId` | string (UUID) | Yes | Influencer to add. Must exist and not be deleted; must have `sellPrice` set. |
| `quantity` | number | No | Default `1`. Must be a positive number. |

**Example request body:**

```json
{
  "influencerId": "influencer-uuid-here",
  "quantity": 1
}
```

**Success (200):** Returns the updated cart (`CartDTO`).

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "influencerId is required" }` | Missing `influencerId` |
| 400 | `{ "error": "quantity must be a positive number" }` | quantity ≤ 0 or not a number |
| 404 | `{ "error": "Influencer not found" }` | Influencer id not in DB or deleted |
| 400 | `{ "error": "Influencer sellPrice is not configured" }` | Influencer has no sell price |
| 401 | `{ "success": false, "message": "..." }` | No/invalid/expired token (see API_WEB_CLIENT_AUTH) |
| 500 | `{ "error": "<message>" }` | Server error |

**Example (fetch):**

```ts
const res = await fetch(`${API_BASE}/api/v1/web/cart/add`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ influencerId, quantity: quantity ?? 1 }),
});
const cart: CartDTO = await res.json();
if (!res.ok) throw new Error((cart as ApiError).error);
// use cart
```

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

## 4. Update cart item

**POST** `{API_BASE}/api/v1/web/cart/update`

Sets the quantity for one influencer in the cart. If **quantity ≤ 0**, that line is **removed** (same effect as remove).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `influencerId` | string (UUID) | Yes | Influencer line to update. |
| `quantity` | number | Yes | New quantity. Use `0` (or negative) to remove the line. |

**Example request body (change quantity):**

```json
{
  "influencerId": "influencer-uuid-here",
  "quantity": 3
}
```

**Example request body (remove by setting quantity to 0):**

```json
{
  "influencerId": "influencer-uuid-here",
  "quantity": 0
}
```

**Success (200):** Returns the updated cart (`CartDTO`).

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "influencerId is required" }` | Missing `influencerId` |
| 400 | `{ "error": "quantity must be a number" }` | quantity not a number |
| 404 | `{ "error": "Cart not found" }` | Client has no cart yet |
| 404 | `{ "error": "Cart item not found" }` | That influencer is not in the cart |
| 401 | `{ "success": false, "message": "..." }` | No/invalid/expired token |
| 500 | `{ "error": "<message>" }` | Server error |

**Example (fetch):**

```ts
const res = await fetch(`${API_BASE}/api/v1/web/cart/update`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ influencerId, quantity }),
});
const cart: CartDTO = await res.json();
if (!res.ok) throw new Error((cart as ApiError).error);
```

---

## Quick reference

| Action | Method | URL | Body |
|--------|--------|-----|------|
| Get cart | GET | `/api/v1/web/cart` | — |
| Add to cart | POST | `/api/v1/web/cart/add` | `{ influencerId, quantity? }` |
| Remove from cart | POST | `/api/v1/web/cart/remove` | `{ influencerId }` |
| Update item (or remove) | POST | `/api/v1/web/cart/update` | `{ influencerId, quantity }` |

**Base:** `{API_BASE}/api/v1/web/cart`  
**Example API_BASE:** `http://localhost:3002`  
**Auth:** `Authorization: Bearer <client_token>` on every request.

---

## Integration flow

1. **Login:** Use web client auth (signup or send-otp + verify-otp) and store `token` (and optionally `client`). See `API_WEB_CLIENT_AUTH.md`.
2. **Cart:** Use the same `token` for all cart calls. Client id is inferred from the token; do not send `clientId` in any payload.
3. **Influencer ids:** Get influencer ids from the list influencers API (`GET /api/v1/web/influencer`), then use those ids in add/remove/update.
4. **On 401/403:** Clear token and redirect to login (same as other protected web routes).

Use this document so your frontend or AI can integrate the cart API correctly.
