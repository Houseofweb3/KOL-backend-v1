# Proposal link flow

One-time proposal links for clients: admin generates a link such as `https://www.ampli5.ai/proposals/{clientSlug}/{date}/{cartId}`, the client opens it, views cart data, submits billing info and confirms; the link is then invalidated.

---

## Admin: Create proposal link

**POST** `/api/v1/admin/cart/:id/proposal-link`

**Auth:** `Authorization: Bearer <admin_token>`.

**Path:** `id` – cart UUID.

**Success (201):**

```json
{
  "proposalLinkId": "uuid",
  "token": "eyJhbGc...",
  "url": "https://www.ampli5.ai/proposals/acme-corp/2026-04-01/cart-uuid",
  "path": {
    "clientSlug": "acme-corp",
    "date": "2026-04-01",
    "cartId": "cart-uuid"
  },
  "emailSent": true
}
```

- **url** – Client app URL shape: **`/proposals/{clientSlug}/{YYYY-MM-DD}/{cartId}`** (no query string).  
  - `clientSlug` – from client name (lowercase, URL-safe, max 80 chars).  
  - `date` – cart **`createdAt` in UTC** as `YYYY-MM-DD`.  
  - `cartId` – cart UUID.  
- **path** – Same segments as in **url** for admin UI without parsing. The full **url** is also sent in the client email.
- **emailSent** – `true` if the proposal link email was sent to the client; `false` if not (e.g. no email configured or send failed). If `false`, response may include **emailError**.
- **token** – JWT returned for **legacy** client URLs only (`GET/POST /api/v1/web/proposal/:token`); it is **not** appended to **url**.

The client receives an email with subject “Your proposal is ready – Ampli5” and a link to the proposal page.

**Errors:** 404 Cart not found.

---

## Web: Get proposal cart (readable path)

**GET** `/api/v1/web/proposal/slug/:clientSlug/:date/:cartId`

**Auth:** None. The path must match the cart (client name slug, cart `createdAt` date UTC, cart id), and there must be an **unused** proposal link row for that cart.

**Example:**  
`GET /api/v1/web/proposal/slug/acme-corp/2026-04-01/ba1eef61-c376-48d0-ab0d-0ec6bab0062f`

**Errors:** 400 if path does not match cart; 404 cart or proposal link not found; 410 link already used.

---

## Web: Get proposal cart (legacy — token only in path)

**GET** `/api/v1/web/proposal/:token`

**Auth:** None. Token in URL validates access.

**Path:** `token` – JWT from an old-style link (`/proposals/{token}` only).

**Success (200):**

```json
{
  "cart": {
    "id": "cart-uuid",
    "clientId": "client-uuid",
    "status": "generate",
    "createdAt": "...",
    "subtotal": "500.00",
    "discountPercent": "0",
    "discountAmount": "0.00",
    "managementFeePercent": "15",
    "managementFeeAmount": "75.00",
    "total": "575.00",
    "client": { "id": "...", "name": "...", "email": "..." },
    "items": [
      {
        "id": "cart-item-uuid",
        "influencerId": "...",
        "quantity": 1,
        "price": "200.00",
        "notes": null,
        "proofOfWork": null,
        "isApproved": false,
        "platform": "YouTube",
        "platformLink": "https://youtube.com/...",
        "inventory": "Video integration",
        "influencerName": "Creator Name"
      }
    ]
  }
}
```

Each **item** includes **`isApproved`** (boolean) for the client to set when submitting (accept/reject this influencer line). Influencer fields on each item: **`platform`**, **`platformLink`**, **`inventory`**, **`influencerName`** (from the linked influencer record).

**Errors:**
- 400 Invalid proposal token (bad JWT or payload).
- 404 Proposal link not found.
- 410 This proposal link has already been used.

---

## Web: Submit proposal (readable path)

**POST** `/api/v1/web/proposal/slug/:clientSlug/:date/:cartId/submit`

Same **body** as legacy submit. No query parameters.

---

## Web: Submit proposal (legacy — token in path)

**POST** `/api/v1/web/proposal/:token/submit`

**Auth:** None. Token in URL.

**Body:** Update cart item acceptance (per-influencer accept/reject), save billing information, and confirm. Cart status is set to **approved** (from `CartStatus` enum). Proposal link is then marked as used.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **items** | array | Yes | One entry per cart item. Each: `{ "id": "cart-item-uuid", "accepted": true \| false }`. Updates `cart_items.is_approved` for each item. |
| registeredCompanyName | string | Yes | Registered company name (as per entity). |
| registeredCompanyAddress | string | Yes | Registered company address. |
| authorizedSignatoryName | string | Yes | Authorized signatory name. |
| authorizedSignatoryDesignation | string | Yes | Authorized signatory designation. |
| officialEmailId | string | Yes | Official email for documentation. |
| phoneNumber | string | Yes | Phone number. |
| preferredPaymentMode | string | Yes | `"bank_transfer"` or `"crypto"`. |
| docusignProofLink | string | No | DocuSign/signature proof URL. |
| isTermsConfirmed | boolean | Yes | Must be `true` to submit. |

**Example payload:**

```json
{
  "items": [
    { "id": "cart-item-uuid-1", "accepted": true },
    { "id": "cart-item-uuid-2", "accepted": false }
  ],
  "registeredCompanyName": "Acme Ltd",
  "registeredCompanyAddress": "123 Street, City",
  "authorizedSignatoryName": "John Doe",
  "authorizedSignatoryDesignation": "Director",
  "officialEmailId": "legal@acme.com",
  "phoneNumber": "+1234567890",
  "preferredPaymentMode": "bank_transfer",
  "docusignProofLink": "https://...",
  "isTermsConfirmed": true
}
```

**Success (200):**

```json
{
  "success": true,
  "message": "Proposal confirmed successfully"
}
```

**After success:**
- Each **cart item** is updated with **`is_approved`** from `items[].accepted`.
- **Cart totals** (subtotal, discountAmount, managementFeeAmount, total) are **recalculated on the backend** using **only items where `is_approved` is true**. The cart’s discount and management fee percentages are applied to this accepted-items subtotal.
- **Cart** `status` is set to **`approved`** (from `CartStatus` enum).
- **Billing info** is saved in `billing_info` (one per cart).
- **Proposal link** is marked as used (`used_at` set); further slug or legacy token requests return 410 for GET/POST.

**Errors:** 400 (e.g. terms not confirmed), 404, 410 (link already used).

---

## Proposal PDF (download)

When the proposal PDF is generated (admin or client “download PDF”), **only cart items with `is_approved === true`** are included in the influencer table. Totals in the PDF (subtotal, discount, management fee, total) are computed from those accepted items only, using the cart’s discount and management fee percentages.

---

## Entities

- **proposal_links** – `id`, `cart_id`, `client_id`, `used_at` (null = valid).
- **cart_items** – includes **`is_approved`** (boolean): set from submit payload `items[].accepted`.
- **carts** – **`status`** set to `approved` (`CartStatus.APPROVED`) on submit.
- **billing_info** – One per cart: company name/address, signatory name/designation, official email, phone, preferred payment mode, docusign proof link, terms confirmed.
