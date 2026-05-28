# Admin kol Invoice API – Frontend integration guide

Use this document to implement the **kol Invoice** admin UI (list, create, edit, delete, mark paid, PDF download) and wire **dropdowns** for clients and influencers.

**Base URL:** All paths below are relative to:

`https://<host>/api/v<VERSION>`

The app reads `VERSION` from environment (typically **`1`**), so URLs look like:

`https://<host>/api/v1/admin/...`

---

## Authentication

**Admin JWT** (same as other admin routes):

- Header: `Authorization: Bearer <admin_access_token>`
- Token is returned from admin login (see existing admin auth flow: `POST /api/v1/admin/auth/login`).

**Protected routes in this doc:**

- All **`/admin/kol-invoices`** routes use `verifyAdminAuth`.
- **`/admin/client`** routes use `verifyAdminAuth`.

**Important:** In the current codebase, **`/admin/influencer`** routes have `verifyAdminAuth` **commented out** in `src/routes/v1/admin/influencer.routes.ts`. That means influencer list/select may work **without** a token in some deployments. For production, align with your team: either enable admin auth on influencer routes or keep using a token everywhere for consistency.

---

## Required APIs for dropdowns (select lists)

The invoice form needs:

1. **Client** options → single **client** select (`clientId`) for the whole invoice.
2. **Influencer** options → for **Invoice by** (`invoiceByInfluencerId`).

Use the **select** endpoints (lightweight, paginated, searchable).

### 1) Client list (for dropdown)

**GET** `/api/v1/admin/client/select`

**Auth:** `Authorization: Bearer <admin_token>`

**Query parameters:**

| Param    | Type   | Required | Default | Max | Description                          |
|----------|--------|----------|---------|-----|--------------------------------------|
| `page`   | number | No       | `1`     | —   | Page number.                         |
| `limit`  | number | No       | `10`    | `100` | Page size.                        |
| `search` | string | No       | —       | —   | Case-insensitive match on **name** or **email**. |

**Success (200):**

```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "billing@acme.com"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Frontend tips:**

- Use `clients[].id` as the **value** for **`clientId`** (one client per invoice).
- Show `name` (and optionally `email`) in the dropdown label.
- Paginate or debounce search; increase `limit` (up to 100) if you need more rows per request.

---

### 2) Influencer list (for dropdown)

**GET** `/api/v1/admin/influencer/select`

**Auth:** As deployed (see note above; ideally same Bearer token).

**Query parameters:**

| Param      | Type   | Required | Default | Max | Description |
|------------|--------|----------|---------|-----|-------------|
| `page`     | number | No       | `1`     | —   | Page number. |
| `limit`    | number | No       | `10`    | `100` | Page size. |
| `search`   | string | No       | —       | —   | Case-insensitive match on **name** or **email**. |
| `platform` | string | No       | —       | —   | Filter by platform; repeat param or comma-separated (e.g. `platform=instagram,youtube`). |

**Success (200):**

```json
{
  "influencers": [
    {
      "id": "uuid",
      "name": "Creator Name",
      "platform": "instagram",
      "platformLink": "https://...",
      "inventory": "...",
      "sellPrice": "500",
      "firstCollaborationImage1": null,
      "firstCollaborationImage2": null,
      "firstCollaborationImage3": null,
      "avgViews": "100000",
      "cpm": "5",
      "ccp": "12.5",
      "buyPrice": "400"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 10,
  "totalPages": 12
}
```

**Frontend tips:**

- Use `influencers[].id` for **`invoiceByInfluencerId`**.
- Label can be `name` + optional `platform`.
- PDF uses **invoice-by** influencer **name** and **platform** as designation text.

---

## kol Invoice API (CRUD, mark paid, PDF)

Resource name in URLs: **`kol-invoices`** (kebab-case). All routes below require **`Authorization: Bearer <admin_token>`** unless noted otherwise.

| Method | Path | Summary |
|--------|------|---------|
| **GET** | `/api/v1/admin/kol-invoices` | Paginated list (`page`, `limit`, optional `search`, `status`). |
| **GET** | `/api/v1/admin/kol-invoices/next-invoice-number` | Next suggested **`INV-YYYY-NNN`** (optional query **`year`**). |
| **GET** | `/api/v1/admin/kol-invoices/:id` | Single invoice (JSON). |
| **GET** | `/api/v1/admin/kol-invoices/:id/pdf` | PDF download (binary, not JSON). |
| **POST** | `/api/v1/admin/kol-invoices` | Create invoice. |
| **POST** | `/api/v1/admin/kol-invoices/:id/mark-paid` | Set **`paid`**; body **`{ "payment_utr": "..." }`**. |
| **PATCH** | `/api/v1/admin/kol-invoices/:id` | Partial update (including **`status`** + **`utr`**). |
| **DELETE** | `/api/v1/admin/kol-invoices/:id` | Soft delete. |

---

**GET** `/api/v1/admin/kol-invoices/next-invoice-number`

**Auth:** `Authorization: Bearer <admin_token>`

**Purpose:** Returns the next **`invoiceNumber`** in the canonical per-year sequence **`INV-<YYYY>-<NNN>`** (e.g. `INV-2026-001`, `INV-2026-002`). The sequence resets each calendar year: numbers are allocated per **year**, not globally across all time.

**Query parameters**

| Param  | Type   | Required | Default | Description |
|--------|--------|----------|---------|-------------|
| `year` | string | No       | **Current UTC calendar year** (e.g. `2026`) | Four digits, `2000`–`9999`. Use the same year as **`invoiceDate`** when you want the number to match the invoice’s calendar year. |

**Success (200):**

```json
{
  "year": 2026,
  "invoiceNumber": "INV-2026-003",
  "lastInvoiceNumber": "INV-2026-002"
}
```

- **`year`:** The calendar year this suggestion applies to (same as the `year` query param, or the default).
- **`invoiceNumber`:** Next free number for that year (checked against non-deleted rows).
- **`lastInvoiceNumber`:** The **highest-sequence** existing invoice for that year matching `INV-<year>-<digits>`, or **`null`** if there are none yet (first invoice of the year → `INV-2026-001`).

Empty state for a year with no matching invoices:

```json
{
  "year": 2026,
  "invoiceNumber": "INV-2026-001",
  "lastInvoiceNumber": null
}
```

**How the suggestion is built**

1. Consider all **non-deleted** invoices whose `invoiceNumber` matches **`^INV-<year>-[0-9]+$`** (PostgreSQL `~` regex on the server).
2. Parse the trailing numeric segment; take **max + 1** as the next sequence (padded to at least **3** digits, e.g. `001`; grows beyond three digits when needed, e.g. `INV-2026-1000`).
3. If no rows match for that year, the suggestion is **`INV-<year>-001`**.
4. The server verifies **uniqueness** again before returning (handles concurrent creates or manually entered numbers); it may bump the sequence (up to 100 attempts, then **409**).

Legacy numbers that do **not** follow `INV-YYYY-…` (e.g. old `INV-042`) do **not** affect the per-year counter.

**Errors**

- **400** `{ "error": "year must be a 4-digit integer between 2000 and 9999" }` — invalid `year` query.
- **409** `{ "error": "Could not allocate a unique invoice number" }` — extremely unlikely; retry or pick a number manually.

**Frontend tips**

- On “new invoice”, call **`GET .../next-invoice-number?year=<invoiceDateYear>`** when **`invoiceDate`** changes so the suggested number stays aligned with the selected year (or omit `year` to use the current UTC year).
- Set the form’s **`invoiceNumber`** from **`invoiceNumber`** in the response; the user may still edit it. **Create** rejects duplicates with **400**.
- Re-call after a successful create if you stay on the form for another invoice.

---

### List invoices

**GET** `/api/v1/admin/kol-invoices`

**Auth:** `Authorization: Bearer <admin_token>`

**Query parameters:**

| Param    | Type   | Required | Default | Max | Description                    |
|----------|--------|----------|---------|-----|--------------------------------|
| `page`   | number | No       | `1`     | —   | Page number.                   |
| `limit`  | number | No       | `10`    | `100` | Page size.                  |
| `search` | string | No       | —       | —   | Partial match on **invoice number** (case-insensitive). |
| `status` | string | No       | —       | —   | Exact filter: **`unpaid`** or **`paid`**. |

**Success (200):**

```json
{
  "invoices": [
    {
      "id": "invoice-uuid",
      "invoiceNumber": "INV-2026-001",
      "invoiceDate": "2026-05-12",
      "currency": "USD",
      "clientId": "client-uuid",
      "invoiceByInfluencerId": "uuid",
      "lineItems": [
        { "deliverable": "Instagram story set", "amount": 1500 },
        { "deliverable": "Tweet thread", "amount": 800 }
      ],
      "amountPayable": "2300.00",
      "paymentDetails": "bank",
      "status": "unpaid",
      "utr": null,
      "bankAccountHolderName": "Holder",
      "bankName": "Bank",
      "bankAccountNumberOrIban": "IBAN...",
      "bankSwiftOrIfsc": "SWIFT",
      "bankCountry": "US",
      "cryptoChainAddress": null,
      "cryptoWalletAddress": null,
      "isDeleted": false,
      "createdAt": "2026-05-12T10:00:00.000Z",
      "updatedAt": "2026-05-12T10:00:00.000Z",
      "invoiceByInfluencer": { "id": "...", "name": "...", "...": "..." },
      "client": { "id": "...", "name": "...", "email": "...", "...": "..." }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

Notes:

- List items include joined **`invoiceByInfluencer`** and **`client`** (full entity shapes as TypeORM returns them).
- `amountPayable` is stored as a **decimal string** (e.g. `"2300.00"`).
- `paymentDetails` is **`"bank"`** or **`"crypto"`**.
- **`status`** is **`"unpaid"`** or **`"paid"`** (payment received). New invoices are always created as **`unpaid`** with **`utr`** `null`.
- **`utr`**: payment reference (e.g. bank UTR / transaction id). Required when **`status`** is **`paid`**; cleared when set back to **`unpaid`**.

---

### Get one invoice

**GET** `/api/v1/admin/kol-invoices/:id`

**Auth:** Bearer admin token.

**Success (200):** Single invoice object (same shape as one element in `invoices` above), including `invoiceByInfluencer` and `client`.

**Errors:**

- **404** `{ "error": "Invoice not found" }` if missing or soft-deleted.

---

### Create invoice

**POST** `/api/v1/admin/kol-invoices`

**Auth:** Bearer admin token.

**Headers:** `Content-Type: application/json`

#### Common fields (always required on create)

| Field                     | Type     | Description |
|---------------------------|----------|-------------|
| `invoiceNumber`           | string   | Unique among non-deleted invoices. Suggested format: **`INV-<year>-<seq>`** (e.g. `INV-2026-001`) from **next-invoice-number**; user may override if unique. |
| `invoiceDate`             | string   | ISO date, e.g. `"2026-05-12"`. |
| `clientId`                | string (uuid) | Bill-to client (single select for the whole invoice). |
| `currency`                | string   | No | Invoice currency: `USD`, `INR`, or `AED`. Defaults to `USD`. |
| `invoiceByInfluencerId`   | string (uuid) | Who issues the invoice (dropdown). |
| `lineItems`               | object[] | Non-empty; each item: `deliverable` (non-empty string), `amount` (positive number). |
| `amountPayable`           | number or string | Positive; stored to 2 decimal places. |
| `paymentDetails`        | string   | **`"bank"`** or **`"crypto"`**. |

New invoices always start with **`status`: `"unpaid"`** and **`utr`**: `null` (do not send `status` / `utr` on create; they are ignored if sent).

#### When `paymentDetails` is `"bank"` (all required)

| Field                      | Type   |
|----------------------------|--------|
| `bankAccountHolderName`    | string |
| `bankName`                 | string |
| `bankAccountNumberOrIban`  | string |
| `bankSwiftOrIfsc`          | string |
| `bankCountry`              | string |

Crypto fields should be omitted or ignored; server stores them as `null`.

#### When `paymentDetails` is `"crypto"` (both required)

| Field                 | Type   |
|-----------------------|--------|
| `cryptoChainAddress`  | string (e.g. chain name or label) |
| `cryptoWalletAddress` | string |

Bank fields should be omitted or ignored; server stores them as `null`.

#### Example: bank

```json
{
  "invoiceNumber": "INV-2026-001",
  "invoiceDate": "2026-05-12",
  "currency": "USD",
  "clientId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "invoiceByInfluencerId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "lineItems": [
    { "deliverable": "Instagram story set", "amount": 1500 },
    { "deliverable": "Tweet thread", "amount": 800 }
  ],
  "amountPayable": 2300,
  "paymentDetails": "bank",
  "bankAccountHolderName": "Acme Ltd",
  "bankName": "Example Bank",
  "bankAccountNumberOrIban": "GB00EXAMPLE00000000000000",
  "bankSwiftOrIfsc": "EXAMPLEGB2L",
  "bankCountry": "United Kingdom"
}
```

#### Example: crypto

```json
{
  "invoiceNumber": "INV-2026-002",
  "invoiceDate": "2026-05-12",
  "currency": "USD",
  "clientId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "invoiceByInfluencerId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "lineItems": [
    { "deliverable": "YouTube integration", "amount": 5000 }
  ],
  "amountPayable": "5000.00",
  "paymentDetails": "crypto",
  "cryptoChainAddress": "Ethereum",
  "cryptoWalletAddress": "0x0000000000000000000000000000000000000000"
}
```

**Success (201):** Created invoice JSON (with relations `invoiceByInfluencer`, `client` loaded).

**Typical errors (4xx):**

- **400** `{ "error": "<validation message>" }` — e.g. missing bank fields when `paymentDetails` is `bank`, duplicate `invoiceNumber`, invalid `lineItems`, unknown client/influencer id.
- **404** — referenced influencer or client not found / deleted.

---

### Update invoice

**PATCH** `/api/v1/admin/kol-invoices/:id`

**Auth:** Bearer admin token.

**Body:** Partial object; any supplied field overwrites that field. Rules:

- If you change `paymentDetails`, re-send the appropriate bank or crypto fields (merged with existing in memory for validation).
- `currency` (when sent) must be one of `USD`, `INR`, `AED` (defaults to `USD` when omitted).
- `lineItems` / `clientId` when sent must still satisfy non-empty rules.
- `invoiceNumber` must remain unique.

#### Payment received (“Mark as paid”) — option A: full PATCH

Use **`PATCH`** with:

- **`status`**: `"paid"` and **`utr`**: non-empty string (bank UTR, UPI ref, transaction id, etc.), **in the same request** when first marking paid.

Example:

```json
{
  "status": "paid",
  "utr": "HDFC000123456789"
}
```

If the invoice is **already** `paid` and you only need to correct the reference, you may send **`utr`** alone.

To revert to unpaid (e.g. mistake), send **`status`**: `"unpaid"` — the server clears **`utr`**.

Rules:

- **`status`** must be **`"unpaid"`** or **`"paid"`** if present.
- When **`status`** is **`paid`**, a non-empty **`utr`** must be present (in the body or already stored on the invoice).
- When **`status`** is **`unpaid`**, **`utr`** is stored as **`null`** (any `utr` in the body is ignored for storage).

**Success (200):** Updated invoice (with relations).

---

### Mark invoice as paid (UTR only) — option B: dedicated endpoint

**POST** `/api/v1/admin/kol-invoices/:id/mark-paid`

**Auth:** Bearer admin token.

**Headers:** `Content-Type: application/json`

**Purpose:** Set **`status`** to **`paid`** and store the payment reference using a **single** body field. Handy for a minimal “Record payment” action without sending the full PATCH body.

**Body (JSON)** — send **one** of these keys (non-empty string):

| Field           | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| **`payment_utr`** | string | **Yes** (recommended) | Bank UTR, UPI ref, crypto tx id, etc. Stored as invoice **`utr`** (DB column `payment_utr`). |
| `paymentUtr`    | string | No       | Camel-case alias; same as `payment_utr`. |
| `utr`           | string | No       | Alias; same semantics. |

Example (preferred):

```json
{
  "payment_utr": "HDFC000123456789"
}
```

**Success (200):** Full invoice JSON (same shape as **GET** one invoice), including `invoiceByInfluencer` and `client`.

**Behavior**

- **Unpaid → paid:** Sets `status` to `"paid"` and `utr` to the trimmed value.
- **Already paid, same UTR:** **Idempotent** — returns the invoice unchanged (safe to retry).
- **Already paid, different UTR:** **400** — `"Invoice is already marked as paid with a different payment reference"`.
- **400** — Missing/blank `payment_utr` (or equivalent field).
- **404** — Invoice not found or soft-deleted.

To set an invoice back to **unpaid**, use **`PATCH`** with **`status`**: `"unpaid"` (this endpoint does not support that).

---

### Delete invoice (soft delete)

**DELETE** `/api/v1/admin/kol-invoices/:id`

**Auth:** Bearer admin token.

**Success (200):**

```json
{ "message": "Invoice deleted" }
```

Deleted invoices are not returned in list/get and cannot be PDF-downloaded.

---

### Download PDF

**GET** `/api/v1/admin/kol-invoices/:id/pdf`

**Auth:** Bearer admin token.

**Success (200):**

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="invoice-<sanitized-invoice-number>.pdf"`
- Body: raw PDF bytes (do not expect JSON).

**Frontend tips:**

- Use `fetch` with `Authorization` header, then `response.blob()` and trigger download with `URL.createObjectURL`, or open in a new tab if your UX allows.
- **404** if invoice not found or deleted.

**PDF content (high level):**

- Invoice number, date, invoice-by name.
- From: invoice-by influencer name + platform (designation).
- Bill to: client name and billing details (from `clientId`).
- Line items table: **deliverable** description and amount.
- Amount payable.
- Payment block: bank details **or** crypto details depending on `paymentDetails`.
- **Payment status** (`Paid` / `Unpaid`) and **UTR / payment reference** when paid (see `status` and `utr` on the invoice).

---

## Suggested UI flow (checklist for AI / implementers)

1. **Login** as admin → store JWT.
2. **Load dropdowns:**
   - Clients: `GET .../admin/client/select?page=1&limit=100&search=`
   - Influencers: `GET .../admin/influencer/select?page=1&limit=100&search=`
3. **New invoice only:** `GET .../admin/kol-invoices/next-invoice-number` (optional **`?year=`** from **`invoiceDate`**) → pre-fill **`invoiceNumber`** from **`invoiceNumber`** (user may edit).
4. **Invoice form:**
   - Text: `invoiceNumber`, `invoiceDate`.
   - Select: `clientId` (single client for the whole invoice), `invoiceByInfluencerId`.
   - Dynamic table: `lineItems[]` — per row: deliverable text + amount (number > 0).
   - Number: `amountPayable` (> 0).
   - Radio / select: `paymentDetails` → show **bank** fields OR **crypto** fields only (do not send the other branch’s fields as empty strings if you can omit them).
5. **Submit:** `POST .../admin/kol-invoices` with JSON body.
6. **List page:** `GET .../admin/kol-invoices?page=1&limit=10&search=`.
7. **Edit:** `GET .../admin/kol-invoices/:id` → fill form → `PATCH .../admin/kol-invoices/:id`.
8. **Mark paid (simple):** `POST .../admin/kol-invoices/:id/mark-paid` with JSON `{ "payment_utr": "..." }` when the user records payment (alternative to `PATCH` with `status` + `utr`).
9. **PDF:** `GET .../admin/kol-invoices/:id/pdf` → save blob as file.

---

## Error response shape

Most admin JSON errors:

```json
{ "error": "Human readable message" }
```

Unauthorized / forbidden (auth middleware) may use:

```json
{ "success": false, "message": "..." }
```

Handle **401**, **403**, **404**, **400**, **409** (next-invoice-number allocation), and **500** appropriately in the UI.

---

## Related code (for backend developers)

| Area        | Path |
|------------|------|
| Routes     | `src/routes/v1/admin/kol-invoice.routes.ts` |
| Controller | `src/controllers/v1/admin/kol-invoice.controller.ts` |
| Service    | `src/services/v1/admin/kol-invoice.service.ts` |
| PDF        | `src/services/v1/admin/kol-invoice-pdf.service.ts`, `src/templates/koalInvoice.ejs` |
| Entity     | `src/entity/kol-invoice.entity.ts` |
| Constants  | `src/constants/kol-invoice.ts` |
| Client select | `src/routes/v1/admin/client.routes.ts` (`GET /select`) |
| Influencer select | `src/routes/v1/admin/influencer.routes.ts` (`GET /select`) |
