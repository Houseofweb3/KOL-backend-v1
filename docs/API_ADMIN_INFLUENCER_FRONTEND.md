# Admin Influencer API – Frontend Implementation Guide

Use this doc to implement the admin influencer **Get one**, **Create**, and **Update** flows on the frontend. All requests require admin JWT.

**Base URL:** `https://your-api.com` (replace with your API host)  
**Base path:** `/api/v1/admin/influencer`  
**Auth header:** `Authorization: Bearer <admin_jwt>`

---

## Quick reference

| Action        | Method | Path                          | Body                    | Response      |
|-------------|--------|-------------------------------|-------------------------|---------------|
| Get one     | GET    | `/api/v1/admin/influencer/:id` | —                       | 200 + object  |
| Create      | POST   | `/api/v1/admin/influencer`     | JSON (see below)        | 201 + object  |
| Update      | PATCH  | `/api/v1/admin/influencer/:id` | JSON (partial)          | 200 + object  |

---

## 1. Get one influencer (for view / edit)

**GET** `/api/v1/admin/influencer/:id`

- **Path:** `id` = influencer UUID.
- **Response (200):** One object = influencer fields **+** `contentTypes` array.

### ContentTypes in GET response

- The API returns **at most one** content-type row, built from the influencer’s main fields:
  - `inventory` → `contentType`
  - `buyPrice` → `price`
  - `sellPrice` → `sellingPrice`
  - `avgViews` → `avgView`
  - `cpm` → `cpm`
- If the influencer has no inventory/price/views data, `contentTypes` is `[]`.
- Use this to show a single “content type” row in the edit form (or build one row from top-level fields if `contentTypes` is empty).

### Response shape (simplified)

```ts
interface GetInfluencerResponse {
  id: string;
  name: string;
  email: string;
  platform: string | null;
  platformLink: string | null;
  inventory: string | null;
  buyPrice: string | null;
  sellPrice: string | null;
  cpm: string | null;
  avgViews: string | null;
  industries: string | null;
  categories: string | null;
  primaryAudienceGeography: string | null;
  secondaryAudienceGeography: string | null;
  primaryCountry: string | null;
  primaryTimezone: string | null;
  telegramId: string | null;
  whatsAppNumber: string | null;
  ageScreenshotUrl: string | null;
  genderScreenshotUrl: string | null;
  topCountriesScreenshotUrl: string | null;
  paymentTerms: string | null;
  turnaroundTimes: string | null;
  firstCollaborationImage1: string | null;
  firstCollaborationImage2: string | null;
  firstCollaborationImage3: string | null;
  xLink: string | null;
  instagramLink: string | null;
  youtubeLink: string | null;
  tiktokLink: string | null;
  newsletterLink: string | null;
  finalConfirmation: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  deletedAt: string | null;
  contentTypes: ContentTypeItem[];
}

interface ContentTypeItem {
  id: string;           // same as influencer.id when from GET
  contentType: string;
  quantity: string;
  avgView: string;
  price: string;
  sellingPrice: string | null;
  cpm: string | null;
}
```

### Example GET request

```ts
const res = await fetch(`${API_BASE}/api/v1/admin/influencer/${id}`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (!res.ok) {
  if (res.status === 404) throw new Error('Influencer not found');
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || res.statusText);
}
const influencer = await res.json();
// influencer.contentTypes is an array (0 or 1 item)
```

### Example GET response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Creator Name",
  "email": "creator@example.com",
  "platform": "X",
  "platformLink": "https://x.com/...",
  "inventory": "Single tweet",
  "buyPrice": "500",
  "sellPrice": "600",
  "cpm": "600",
  "avgViews": "1000",
  "industries": "Tech, Crypto",
  "categories": "DeFi",
  "primaryAudienceGeography": "North America",
  "secondaryAudienceGeography": "Europe",
  "primaryCountry": "United States",
  "primaryTimezone": "America/New_York",
  "telegramId": "@handle",
  "whatsAppNumber": null,
  "ageScreenshotUrl": "https://...",
  "genderScreenshotUrl": "https://...",
  "topCountriesScreenshotUrl": "https://...",
  "paymentTerms": "50% upfront",
  "turnaroundTimes": "1-2 weeks",
  "firstCollaborationImage1": "https://...",
  "firstCollaborationImage2": "https://...",
  "firstCollaborationImage3": "https://...",
  "xLink": "https://...",
  "instagramLink": null,
  "youtubeLink": null,
  "tiktokLink": null,
  "newsletterLink": null,
  "finalConfirmation": true,
  "isVerified": false,
  "isDeleted": false,
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-01T10:00:00.000Z",
  "deletedAt": null,
  "contentTypes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "contentType": "Single tweet",
      "quantity": "1",
      "avgView": "1000",
      "price": "500",
      "sellingPrice": "600",
      "cpm": "600"
    }
  ]
}
```

---

## 2. Create influencer

**POST** `/api/v1/admin/influencer`

- **Body:** JSON. Required: `name`, `email`. All other fields optional.
- **contentTypes:** Optional array. Behaviour:
  - **0 or 1 item:** Creates **one** influencer; that item sets `inventory`, `buyPrice`, `sellPrice`, `avgViews`, `cpm`. Response is a **single** influencer object.
  - **2+ items:** Creates **one influencer per item** (same profile data for all; each influencer gets that item’s `contentType`, `price`, `sellingPrice`, `avgView`, `cpm`). Response is an **array** of influencer objects (same shape as GET).
- **Response (201):** Single influencer object, or array of influencer objects when multiple content types were sent.

### Create body (content type item)

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| contentType   | string | Yes      | e.g. "Single tweet", "Story"         |
| quantity      | string | Yes      | Usually `"1"`                        |
| avgView       | string | Yes      | Average views                        |
| price         | string | Yes      | Buying price                         |
| sellingPrice  | string | No       | Optional; can be derived (price+16%) |
| cpm           | string | No       | Optional                             |

Do **not** send `id` on create (all items are new).

### Example POST request (minimal)

```ts
const body = {
  name: 'New Creator',
  email: 'new@example.com',
};
const res = await fetch(`${API_BASE}/api/v1/admin/influencer`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(body),
});
if (!res.ok) {
  if (res.status === 400) throw new Error('name and email are required');
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || res.statusText);
}
const influencer = await res.json(); // 201 – single object
```

### Example POST request (with multiple contentTypes – creates 2 influencers)

```ts
const body = {
  name: 'ab',
  email: 'ab@gmail.com',
  platform: 'Youtube',
  contentTypes: [
    { contentType: 'Streams/Live trading video', quantity: '1', avgView: '1200', price: '5200', sellingPrice: '6000', cpm: '5000' },
    { contentType: 'Sponsored-by tag', quantity: '1', avgView: '6000', price: '5000', sellingPrice: '5800', cpm: '966.67' },
  ],
};
const res = await fetch(`${API_BASE}/api/v1/admin/influencer`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify(body),
});
const result = await res.json(); // 201 – array of 2 influencers
// Array.isArray(result) === true; result[0] and result[1] are full influencer objects
```

### Example POST request (single contentType – creates 1 influencer)

```ts
const body = {
  name: 'New Creator',
  email: 'new@example.com',
  platform: 'X',
  contentTypes: [
    { contentType: 'Single tweet', quantity: '1', avgView: '1000', price: '500', sellingPrice: '600', cpm: '600' },
  ],
};
const res = await fetch(`${API_BASE}/api/v1/admin/influencer`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify(body),
});
const influencer = await res.json(); // 201 – single object (one content type)
```

---

## 3. Update influencer

**PATCH** `/api/v1/admin/influencer/:id`

- **Path:** `id` = influencer UUID.
- **Body:** JSON with **only the fields you want to change** (partial update). Same field names as influencer + optional `contentTypes`.
- **contentTypes:** Optional. If sent, the **first item** is used to update the influencer’s `inventory`, `buyPrice`, `sellPrice`, `avgViews`, `cpm`. Send one row (or more; only the first is applied).
- **Response (200):** Full influencer object with `contentTypes` (same shape as GET).

### Example PATCH request (influencer fields only)

```ts
const body = {
  name: 'Updated Name',
  isVerified: true,
  sellPrice: '800',
};
const res = await fetch(`${API_BASE}/api/v1/admin/influencer/${id}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(body),
});
const influencer = await res.json(); // 200
```

### Example PATCH request (with contentTypes)

```ts
const body = {
  name: 'Updated Name',
  platform: 'X',
  contentTypes: [
    {
      id: influencer.id,  // optional; first item drives influencer fields
      contentType: 'Single tweet',
      quantity: '1',
      avgView: '1500',
      price: '550',
      sellingPrice: '638',
      cpm: '425.33',
    },
  ],
};
const res = await fetch(`${API_BASE}/api/v1/admin/influencer/${id}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify(body),
});
const updated = await res.json(); // 200
```

---

## Error responses

| Status | When              | Body example                                  |
|--------|-------------------|-----------------------------------------------|
| 400    | Create without name/email | `{ "error": "name and email are required" }` |
| 401    | Missing/invalid token     | `{ "error": "..." }`                         |
| 404    | Influencer not found      | `{ "error": "Influencer not found" }`         |
| 500    | Server error              | `{ "error": "..." }`                          |

---

## Frontend checklist

1. **Auth:** Send `Authorization: Bearer <admin_jwt>` on every request.
2. **Get for edit:** `GET /api/v1/admin/influencer/:id` → use response to fill form; show `contentTypes[0]` as the single content-type row (or build one from `inventory`, `buyPrice`, etc. if `contentTypes` is empty).
3. **Create:** `POST /api/v1/admin/influencer` with `name`, `email`, and optionally `contentTypes`. If `contentTypes` has 2+ items, the API creates one influencer per item (same profile, different inventory/price) and returns an **array**; otherwise returns a **single** object. Use `Array.isArray(result)` to handle both.
4. **Update:** `PATCH /api/v1/admin/influencer/:id` with only changed fields; optionally send `contentTypes` (first item updates influencer pricing/inventory).
5. **Errors:** Handle 400, 401, 404, 500 and show user-friendly messages.

---

## Optional: list influencers

**GET** `/api/v1/admin/influencer?page=1&limit=10&search=...`

Query params: `page`, `limit`, `search`, `industries`, `categories`, `platform`, `primaryCountry`, `inventory`, `primaryAudienceGeography`, `includeDeleted`.

Response: `{ influencers: [...], total, page, limit, totalPages }`. List items do **not** include `contentTypes`; use GET by id when you need the full record and contentTypes.
