# Client API – Frontend Integration Guide

This document describes all **Client**-related API endpoints for frontend integration. All endpoints require **Admin authentication**.

---

## Base URL & Authentication

| Item | Value |
|------|--------|
| **Base URL** | `{BASE}/admin/client` |
| **Example** | `http://localhost:3000/api/v1/admin/client` |
| **Auth** | Admin JWT required on every request |

**Request header (all endpoints):**
```http
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Obtain JWT:** Use Admin Auth APIs (e.g. `POST /api/v1/admin/auth/login`) to get the token; send it in the `Authorization` header for all Client APIs.

---

## Client Resource Shape

Responses return **Client** objects with the following fields (camelCase in JSON):

| Field | Type | Required (Create) | Description |
|-------|------|-------------------|-------------|
| `id` | `string` (UUID) | — | Set by server |
| `name` | `string` | ✅ | Full name |
| `email` | `string` | ✅ | Unique email (stored lowercased) |
| `website` | `string \| null` | No | Website URL |
| `telegramId` | `string \| null` | No | Telegram ID |
| `whatsAppNumber` | `string \| null` | No | WhatsApp number |
| `categories` | `string \| null` | No | Categories (e.g. comma-separated or JSON) |
| `campaignGoals` | `string \| null` | No | Campaign goals (text) |
| `monetizationModel` | `string \| null` | No | Monetization model |
| `primaryAudienceGeography` | `string \| null` | No | Primary audience geography |
| `ageRange` | `string \| null` | No | Age range (e.g. "18-24") |
| `genderSkew` | `string \| null` | No | Gender skew (e.g. "Male", "Female") |
| `campaignStartTimeline` | `string \| null` | No | When campaign starts (e.g. "ASAP") |
| `customBrief` | `string \| null` | No | Custom brief (long text) |
| `isDeleted` | `boolean` | — | Soft-delete flag (set by server) |
| `createdAt` | `string` (ISO date) | — | From BaseModel |
| `updatedAt` | `string` (ISO date) | — | From BaseModel |
| `deletedAt` | `string \| null` (ISO date) | — | Set when soft-deleted |
| `billingInfo` | `object \| null` | No | Client billing information (admin-managed). Present on `GET /:id`, `POST`, `PATCH`. |

---

## Client BillingInfo Shape

`billingInfo` is a nested object (or `null`) with:

| Field | Type | Required (Create) | Description |
|-------|------|-------------------|-------------|
| `id` | `string` (UUID) | — | Set by server |
| `clientId` | `string` (UUID) | — | Set by server |
| `registeredCompanyName` | `string` | ✅ (if billingInfo provided) | Registered company name |
| `registeredCompanyAddress` | `string` | ✅ (if billingInfo provided) | Registered company address |
| `authorizedSignatoryName` | `string` | ✅ (if billingInfo provided) | Authorized signatory name |
| `authorizedSignatoryDesignation` | `string` | ✅ (if billingInfo provided) | Authorized signatory designation |
| `officialEmailId` | `string` | ✅ (if billingInfo provided) | Official email ID |
| `phoneNumber` | `string` | ✅ (if billingInfo provided) | Phone number |
| `preferredPaymentMode` | `"bank_transfer" \| "crypto"` | ✅ (if billingInfo provided) | Preferred payment mode |
| `docusignProofLink` | `string \| null` | No | Optional DocuSign link |
| `isTermsConfirmed` | `boolean` | No | Defaults to `false` |
| `createdAt` | `string` (ISO date) | — | From BaseModel |
| `updatedAt` | `string` (ISO date) | — | From BaseModel |

To **clear** billing info on update, send: `"billingInfo": null`.

---

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/client` | List clients (paginated, optional search) |
| `POST` | `/api/v1/admin/client/upload-csv` | Upload CSV file (Ampli5 brand-intake-form) to create clients |
| `GET` | `/api/v1/admin/client/:id` | Get one client by ID |
| `POST` | `/api/v1/admin/client` | Create a client |
| `PATCH` | `/api/v1/admin/client/:id` | Update a client (partial) |
| `DELETE` | `/api/v1/admin/client/:id` | Soft-delete a client |

---

## 1. List Clients

**Method:** `GET`  
**Path:** `/api/v1/admin/client`

Returns a paginated list of clients. By default, soft-deleted clients are excluded.

### Query parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (1-based) |
| `limit` | number | `10` | Items per page (max 100) |
| `search` | string | — | Search in name, email, website, telegramId, whatsAppNumber, categories, campaignGoals, customBrief (case-insensitive) |
| `includeDeleted` | string | `"false"` | Use `"true"` to include soft-deleted clients |

### Example request

```http
GET /api/v1/admin/client?page=1&limit=10&search=acme
Authorization: Bearer <admin_jwt_token>
```

### Example response (200 OK)

```json
{
  "clients": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "website": "https://acme.com",
      "telegramId": "@acme",
      "whatsAppNumber": "+1234567890",
      "categories": "Tech, B2B",
      "campaignGoals": "Brand awareness",
      "monetizationModel": "CPM",
      "primaryAudienceGeography": "US, EU",
      "ageRange": "25-34",
      "genderSkew": "Neutral",
      "campaignStartTimeline": "ASAP",
      "customBrief": "Looking for tech influencers.",
      "isDeleted": false,
      "createdAt": "2025-02-01T12:00:00.000Z",
      "updatedAt": "2025-02-01T12:00:00.000Z",
      "deletedAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Error response examples

- **401 Unauthorized** – Missing or invalid JWT  
  ```json
  { "error": "Unauthorized" }
  ```
- **500 Internal Server Error**  
  ```json
  { "error": "Error message from server" }
  ```

---

## 2. Get Client by ID

**Method:** `GET`  
**Path:** `/api/v1/admin/client/:id`

Returns a single client by UUID.

### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Client ID |

### Example request

```http
GET /api/v1/admin/client/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <admin_jwt_token>
```

### Example response (200 OK)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "website": "https://acme.com",
  "telegramId": "@acme",
  "whatsAppNumber": "+1234567890",
  "categories": "Tech, B2B",
  "campaignGoals": "Brand awareness",
  "monetizationModel": "CPM",
  "primaryAudienceGeography": "US, EU",
  "ageRange": "25-34",
  "genderSkew": "Neutral",
  "campaignStartTimeline": "ASAP",
  "customBrief": "Looking for tech influencers.",
  "isDeleted": false,
  "createdAt": "2025-02-01T12:00:00.000Z",
  "updatedAt": "2025-02-01T12:00:00.000Z",
  "deletedAt": null,
  "billingInfo": {
    "id": "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "clientId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "registeredCompanyName": "Acme Corp Pvt Ltd",
    "registeredCompanyAddress": "123 Main St, City, Country",
    "authorizedSignatoryName": "John Doe",
    "authorizedSignatoryDesignation": "Director",
    "officialEmailId": "finance@acme.com",
    "phoneNumber": "+1234567890",
    "preferredPaymentMode": "bank_transfer",
    "docusignProofLink": null,
    "isTermsConfirmed": true,
    "createdAt": "2025-02-01T12:00:00.000Z",
    "updatedAt": "2025-02-01T12:00:00.000Z"
  }
}
```

### Error response examples

- **401 Unauthorized** – Missing or invalid JWT  
  ```json
  { "error": "Unauthorized" }
  ```
- **404 Not Found** – Client not found  
  ```json
  { "error": "Client not found" }
  ```
- **500 Internal Server Error**  
  ```json
  { "error": "Error message from server" }
  ```

---

## 3. Create Client

**Method:** `POST`  
**Path:** `/api/v1/admin/client`

Creates a new client. Only `name` and `email` are required; all other fields are optional.

### Request body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Full name |
| `email` | string | ✅ | Unique email (stored lowercased) |
| `website` | string \| null | No | Website URL |
| `telegramId` | string \| null | No | Telegram ID |
| `whatsAppNumber` | string \| null | No | WhatsApp number |
| `categories` | string \| null | No | Categories |
| `campaignGoals` | string \| null | No | Campaign goals |
| `monetizationModel` | string \| null | No | Monetization model |
| `primaryAudienceGeography` | string \| null | No | Primary audience geography |
| `ageRange` | string \| null | No | Age range |
| `genderSkew` | string \| null | No | Gender skew |
| `campaignStartTimeline` | string \| null | No | Campaign start timeline |
| `customBrief` | string \| null | No | Custom brief (long text) |
| `billingInfo` | object \| null | No | Optional nested billing info (see Client BillingInfo Shape) |

Only the keys listed above are accepted; any other keys in the body are ignored.

### Example request (minimal)

```http
POST /api/v1/admin/client
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "email": "contact@acme.com"
}
```

### Example request (full payload)

```http
POST /api/v1/admin/client
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "website": "https://acme.com",
  "telegramId": "@acme",
  "whatsAppNumber": "+1234567890",
  "categories": "Tech, B2B",
  "campaignGoals": "Brand awareness",
  "monetizationModel": "CPM",
  "primaryAudienceGeography": "US, EU",
  "ageRange": "25-34",
  "genderSkew": "Neutral",
  "campaignStartTimeline": "ASAP",
  "customBrief": "Looking for tech influencers for Q1 campaign.",
  "billingInfo": {
    "registeredCompanyName": "Acme Corp Pvt Ltd",
    "registeredCompanyAddress": "123 Main St, City, Country",
    "authorizedSignatoryName": "John Doe",
    "authorizedSignatoryDesignation": "Director",
    "officialEmailId": "finance@acme.com",
    "phoneNumber": "+1234567890",
    "preferredPaymentMode": "bank_transfer",
    "docusignProofLink": null,
    "isTermsConfirmed": true
  }
}
```

### Example response (201 Created)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "website": "https://acme.com",
  "telegramId": "@acme",
  "whatsAppNumber": "+1234567890",
  "categories": "Tech, B2B",
  "campaignGoals": "Brand awareness",
  "monetizationModel": "CPM",
  "primaryAudienceGeography": "US, EU",
  "ageRange": "25-34",
  "genderSkew": "Neutral",
  "campaignStartTimeline": "ASAP",
  "customBrief": "Looking for tech influencers for Q1 campaign.",
  "billingInfo": {
    "id": "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "clientId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "registeredCompanyName": "Acme Corp Pvt Ltd",
    "registeredCompanyAddress": "123 Main St, City, Country",
    "authorizedSignatoryName": "John Doe",
    "authorizedSignatoryDesignation": "Director",
    "officialEmailId": "finance@acme.com",
    "phoneNumber": "+1234567890",
    "preferredPaymentMode": "bank_transfer",
    "docusignProofLink": null,
    "isTermsConfirmed": true,
    "createdAt": "2025-02-07T14:30:00.000Z",
    "updatedAt": "2025-02-07T14:30:00.000Z"
  },
  "isDeleted": false,
  "createdAt": "2025-02-07T14:30:00.000Z",
  "updatedAt": "2025-02-07T14:30:00.000Z",
  "deletedAt": null
}
```

### Error response examples

- **400 Bad Request** – Missing required fields  
  ```json
  { "error": "name and email are required" }
  ```
- **401 Unauthorized** – Missing or invalid JWT  
  ```json
  { "error": "Unauthorized" }
  ```
- **409 Conflict** – Email already exists (and not soft-deleted)  
  ```json
  { "error": "Client with this email already exists" }
  ```
- **500 Internal Server Error**  
  ```json
  { "error": "Error message from server" }
  ```

---

## 4. Update Client

**Method:** `PATCH`  
**Path:** `/api/v1/admin/client/:id`

Updates an existing client. Send only the fields you want to change (partial update).

### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Client ID |

### Request body (JSON)

Any subset of the following keys. Only provided keys are updated.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full name |
| `email` | string | Email (stored lowercased) |
| `website` | string \| null | Website URL |
| `telegramId` | string \| null | Telegram ID |
| `whatsAppNumber` | string \| null | WhatsApp number |
| `categories` | string \| null | Categories |
| `campaignGoals` | string \| null | Campaign goals |
| `monetizationModel` | string \| null | Monetization model |
| `primaryAudienceGeography` | string \| null | Primary audience geography |
| `ageRange` | string \| null | Age range |
| `genderSkew` | string \| null | Gender skew |
| `campaignStartTimeline` | string \| null | Campaign start timeline |
| `customBrief` | string \| null | Custom brief |
| `billingInfo` | object \| null | Upsert billing info (object) or remove it (`null`) |

### Example request (update a few fields)

```http
PATCH /api/v1/admin/client/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "campaignStartTimeline": "Next month"
}
```

### Example request (update email and brief)

```http
PATCH /api/v1/admin/client/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "email": "newcontact@acme.com",
  "customBrief": "Updated brief for Q2 campaign."
}
```

### Example response (200 OK)

Returns the full updated client object:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Acme Corp",
  "email": "newcontact@acme.com",
  "website": "https://acme.com",
  "telegramId": "@acme",
  "whatsAppNumber": "+1234567890",
  "categories": "Tech, B2B",
  "campaignGoals": "Brand awareness",
  "monetizationModel": "CPM",
  "primaryAudienceGeography": "US, EU",
  "ageRange": "25-34",
  "genderSkew": "Neutral",
  "campaignStartTimeline": "Next month",
  "customBrief": "Updated brief for Q2 campaign.",
  "isDeleted": false,
  "createdAt": "2025-02-01T12:00:00.000Z",
  "updatedAt": "2025-02-07T15:00:00.000Z",
  "deletedAt": null
}
```

### Error response examples

- **401 Unauthorized** – Missing or invalid JWT  
  ```json
  { "error": "Unauthorized" }
  ```
- **404 Not Found** – Client not found  
  ```json
  { "error": "Client not found" }
  ```
- **500 Internal Server Error**  
  ```json
  { "error": "Error message from server" }
  ```

---

## 5. Delete Client (soft delete)

**Method:** `DELETE`  
**Path:** `/api/v1/admin/client/:id`

Soft-deletes a client (`isDeleted` set to `true`, `deletedAt` set). The client is not removed from the database and can be included in list results with `includeDeleted=true`.

### Path parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Client ID |

### Example request

```http
DELETE /api/v1/admin/client/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <admin_jwt_token>
```

### Example response (200 OK)

```json
{
  "message": "Client deleted"
}
```

### Error response examples

- **401 Unauthorized** – Missing or invalid JWT  
  ```json
  { "error": "Unauthorized" }
  ```
- **404 Not Found** – Client not found  
  ```json
  { "error": "Client not found" }
  ```
- **500 Internal Server Error**  
  ```json
  { "error": "Error message from server" }
  ```

---

## 6. Upload clients from CSV

**Method:** `POST`  
**Path:** `/api/v1/admin/client/upload-csv`

Accepts a CSV file in **Ampli5 brand-intake-form** format. Column headers must match exactly. Rows are mapped to clients; duplicate email skips and counts as skipped. Max file size 5MB.

**CSV column mapping:**

| CSV header | Client field |
|------------|--------------|
| Brand Product Name | name |
| Primary Contact Email | email |
| Website Link | website |
| Telegram ID | telegramId |
| WhatsApp Number | whatsAppNumber |
| Categories | categories |
| Campaign Goals | campaignGoals |
| Monetization Model | monetizationModel |
| Primary Audience Geography | primaryAudienceGeography |
| Age Range | ageRange |
| Gender Skew | genderSkew |
| Campaign Start Timeline | campaignStartTimeline |
| Custom Brief | customBrief |
| Date, Time | ignored |

**Request:** `multipart/form-data`, field name **`file`**, file must be `.csv` (or `text/csv` / `application/csv`).

**Example (curl):**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/client/upload-csv" \
  -H "Authorization: Bearer <token>" \
  -F "file=@brand-intake-form-26-2.csv"
```

**Example response 200:**
```json
{
  "message": "CSV processed",
  "created": 8,
  "skipped": 1,
  "errors": [
    { "row": 4, "email": "bad@example.com", "error": "Missing name or email" }
  ]
}
```

**Errors:** 400 (no file, wrong type, file too large), 401, 500.

---

## Quick Reference: All Routes

| Method | Path | Body | Query |
|--------|------|------|--------|
| GET | `/api/v1/admin/client` | — | `page`, `limit`, `search`, `includeDeleted` |
| POST | `/api/v1/admin/client/upload-csv` | multipart: `file` (CSV) | — |
| GET | `/api/v1/admin/client/:id` | — | — |
| POST | `/api/v1/admin/client` | Client create payload (min: `name`, `email`) | — |
| PATCH | `/api/v1/admin/client/:id` | Partial client fields | — |
| DELETE | `/api/v1/admin/client/:id` | — | — |

**Auth:** For every request, send `Authorization: Bearer <admin_jwt_token>`.

---

## Frontend integration checklist

- [ ] Use base URL `{API_BASE}/admin/client` (e.g. `http://localhost:3000/api/v1/admin/client`).
- [ ] Attach Admin JWT to all requests: `Authorization: Bearer <token>`.
- [ ] List: handle `clients`, `total`, `page`, `limit`, `totalPages`; support `page`, `limit`, `search`, `includeDeleted` query params.
- [ ] Create: send at least `name` and `email`; optionally all other Client fields (camelCase).
- [ ] Update: send only fields to change (PATCH); response is full Client object.
- [ ] Delete: no body; success returns `{ "message": "Client deleted" }`.
- [ ] Handle 400 (validation), 401 (auth), 404 (not found), 409 (duplicate email), 500 (server error) with `{ "error": "string" }`.
