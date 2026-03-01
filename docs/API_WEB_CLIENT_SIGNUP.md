# Web Client Signup API

**Single endpoint:** create a client from the brand intake form. Returns **client + JWT** so the user is logged in immediately (no OTP step required after signup).

---

## Endpoint

**POST** `/api/v1/web/client/auth/signup`

**Auth:** None.  
**Header:** `Content-Type: application/json`

**Full URL example:** `http://localhost:3002/api/v1/web/client/auth/signup`

---

## Request body (brand intake)

**Required:**

| Field                 | Type   | Description                    |
|-----------------------|--------|--------------------------------|
| `brandProductName`    | string | Brand / product name           |
| `websiteLink`         | string | Website URL                    |
| `primaryContactEmail` | string | Contact email (used for login) |

**Optional:**

| Field                     | Type     | Description              |
|---------------------------|----------|--------------------------|
| `telegramId`              | string   | Telegram id              |
| `whatsappNumber`          | string   | WhatsApp number          |
| `categories`              | string[] | e.g. Tech, Fashion       |
| `audienceReadinessLevel`  | string   | —                        |
| `campaignGoals`           | string[] | —                        |
| `monetizationModel`       | string[] | —                        |
| `revenueModel`            | string   | —                        |
| `marketFocus`             | string   | —                        |
| `primaryAudienceGeography`| string[] | —                        |
| `ageRange`                | string   | —                        |
| `genderSkew`              | string   | —                        |
| `geographicLocation`     | string   | —                        |
| `campaignStartTimeline`   | string   | —                        |
| `campaignStartDate`       | string   | —                        |
| `campaignEndDate`         | string   | —                        |
| `customBrief`             | string   | Free text                 |

**Example (minimal):**

```json
{
  "brandProductName": "Acme Corp",
  "websiteLink": "https://acme.com",
  "primaryContactEmail": "hello@acme.com"
}
```

**Example (with optional fields):**

```json
{
  "brandProductName": "Acme Corp",
  "websiteLink": "https://acme.com",
  "primaryContactEmail": "hello@acme.com",
  "telegramId": "@acme",
  "whatsappNumber": "+1234567890",
  "categories": ["Tech", "Crypto"],
  "campaignGoals": ["Awareness"],
  "customBrief": "Looking for influencer partnerships."
}
```

---

## Success (201 Created)

Creates the client in the DB, sends an onboard notification to the team, and returns the same shape as verify-otp so the user is logged in.

```json
{
  "message": "Form submitted successfully",
  "client": {
    "id": "uuid",
    "name": "Acme Corp",
    "email": "hello@acme.com",
    "projectName": null,
    "projectUrl": null,
    "telegramId": null,
    "whatsAppNumber": null
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Frontend:** Store `client` and `token`; use `Authorization: Bearer <token>` for protected web routes (cart, influencer list, etc.).

---

## Error responses

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Brand / Product Name is required" }` | Missing `brandProductName` |
| 400 | `{ "error": "Website Link is required" }` | Missing `websiteLink` |
| 400 | `{ "error": "Primary Contact Email is required" }` | Missing `primaryContactEmail` |
| 400/409 | `{ "error": "<message>" }` | Other validation or duplicate email (from createClient) |
| 500 | `{ "error": "<message>" }` | Server error |

---

## Example (fetch)

```ts
const res = await fetch(`${API_BASE}/api/v1/web/client/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brandProductName: 'Acme Corp',
    websiteLink: 'https://acme.com',
    primaryContactEmail: 'hello@acme.com',
  }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data.client, data.token → store and use for protected requests
```

---

## Summary

- **Path:** `POST /api/v1/web/client/auth/signup`
- **Body:** Brand intake object; required: `brandProductName`, `websiteLink`, `primaryContactEmail`.
- **Response:** 201 with `message`, `client`, `token`. Use the token for subsequent authenticated requests.
