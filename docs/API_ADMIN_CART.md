# Admin Cart API – List and create carts

**Admin-only.** List all carts (with pricing summary and items) or **create/replace** a cart (proposal) for a client. For **create**, see **`API_ADMIN_CART_CREATE.md`** for payload and behaviour.

---

## List carts (all data)

**GET** `/api/v1/admin/cart`

**Auth:** `Authorization: Bearer <admin_token>` (admin login). See admin auth docs.

**Query parameters:**

| Param   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `page`  | number | No       | Page number (default `1`). |
| `limit`| number | No       | Items per page (default `10`, max `100`). |
| `search` | string | No     | Search by client **name** or **email** (case-insensitive). |
| `status` | string | No     | Filter by cart status: `generate`, `send`, or `approved`. |

**Success (200):**

```json
{
  "carts": [
    {
      "id": "cart-uuid",
      "clientId": "client-uuid",
      "status": "generate",
      "createdAt": "2026-03-01T12:00:00.000Z",
      "subtotal": "200.00",
      "discountPercent": "0",
      "discountAmount": "0.00",
      "managementFeePercent": "15",
      "managementFeeAmount": "30.00",
      "total": "230.00",
      "client": {
        "id": "client-uuid",
        "name": "Client Name",
        "email": "client@example.com"
      },
      "items": [
        {
          "id": "cart-item-uuid",
          "influencerId": "influencer-uuid",
          "quantity": 2,
          "price": "150.00",
          "notes": null,
          "proofOfWork": null
        }
      ]
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Example:**

```bash
GET /api/v1/admin/cart?page=1&limit=10
GET /api/v1/admin/cart?search=john
GET /api/v1/admin/cart?status=send
GET /api/v1/admin/cart?page=2&limit=20&search=acme&status=approved
```

---

## Get cart by ID (for edit / refill)

**GET** `/api/v1/admin/cart/:id`

**Auth:** `Authorization: Bearer <admin_token>`.

**Path:** `id` – cart UUID.

**Success (200):** Single cart object (same shape as one element of the list `carts` array): `id`, `clientId`, `status`, `createdAt`, `subtotal`, `discountPercent`, `discountAmount`, `managementFeePercent`, `managementFeeAmount`, `total`, `client`, `items` (each with `id`, `influencerId`, `quantity`, `price`, `notes`, `proofOfWork`). Use this to refill the edit form, then submit **PATCH** `/api/v1/admin/cart/:id` to update.

**Not found (404):** `{ "error": "Cart not found" }`.

**Example:**

```bash
GET /api/v1/admin/cart/ba1eef61-c376-48d0-ab0d-0ec6bab0062f
```

---

**Create cart:** **POST** `/api/v1/admin/cart` – body: `clientId`, `discountPercent?`, `managementFeePercent?`, `items: [{ influencerId, quantity, price, notes?, proofOfWork? }]`. See **`API_ADMIN_CART_CREATE.md`**.

**Update cart:** **PATCH** `/api/v1/admin/cart/:id` – client cannot be changed; update pricing (discount/fee) and/or sync items (update price/notes/proofOfWork, add/remove influencers). See **`API_ADMIN_CART_UPDATE.md`**.

---

## Delete cart

**DELETE** `/api/v1/admin/cart/:id`

**Auth:** `Authorization: Bearer <admin_token>` (admin only).

**Path:** `id` – cart UUID.

**Success (204):** No body. Cart and all its items are deleted.

**Not found (404):** `{ "error": "Cart not found" }`.

**Example:**

```bash
DELETE /api/v1/admin/cart/ba1eef61-c376-48d0-ab0d-0ec6bab0062f
```

---

**Cart-related entities:** `Cart` (carts: id, client_id, status, subtotal, discount_percent, discount_amount, management_fee_percent, management_fee_amount, total), `CartItem` (cart_items: id, cart_id, influencer_id, quantity, price, notes, proof_of_work jsonb). See entity files under `src/entity/`.

**Folder structure (admin cart):**

- `src/routes/v1/admin/cart.routes.ts` – GET `/`, GET `/:id`, POST `/`, PATCH `/:id`, DELETE `/:id`
- `src/controllers/v1/admin/cart.controller.ts` – listCartsController, getCartController, createCartController, updateCartController, deleteCartController
- `src/services/v1/admin/cart.service.ts` – listCarts, getCart, createCart, updateCart, deleteCart
