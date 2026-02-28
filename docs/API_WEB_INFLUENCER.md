# Web Influencer List API – Frontend Implementation Guide

Use this doc to implement the **list influencers** API on the frontend. This route is **protected** and requires a valid **client JWT token** (see `API_WEB_CLIENT_AUTH.md`).

---

## Endpoint

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path** | `/api/v1/web/influencer` |
| **Full URL example** | `http://localhost:3000/api/v1/web/influencer` |
| **Auth** | `Authorization: Bearer <client_token>` |

### Headers

| Header | When | Value |
|--------|------|--------|
| `Content-Type` | Always | `application/json` |
| `Authorization` | Required | `Bearer <token-from-client-auth>` |

---

## Query Parameters (all optional)

Pass as URL query string. All filters and search are case-insensitive (partial match).

**Filters (`primaryCountry`, `platform`, `inventory`, `industries`, `categories`, `primaryAudienceGeography`):** Each accepts **one or more values**. Match is OR (influencer matches if it has any of the values). Send multiple values either as repeated params or comma-separated:
- Repeated: `?platform=X&platform=YouTube`
- Comma-separated: `?platform=X,YouTube` or `?categories=Tech,Crypto`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (1-based). |
| `limit` | number | `10` | Items per page. Max `100`. |
| `search` | string | — | Search in **name**, **email**, **telegramId**. |
| `primaryCountry` | string or string[] | — | One or more values (partial match). |
| `platform` | string or string[] | — | One or more values (e.g. YouTube, X). |
| `inventory` | string or string[] | — | One or more values. |
| `industries` | string or string[] | — | One or more values. |
| `categories` | string or string[] | — | One or more values. |
| `primaryAudienceGeography` | string or string[] | — | One or more values. |

---

## Example Requests

**Paginated list (first page, 10 per page):**
```
GET /api/v1/web/influencer?page=1&limit=10
```

**With search (name, email, or telegram):**
```
GET /api/v1/web/influencer?search=john
```

**With filters (single value per filter):**
```
GET /api/v1/web/influencer?primaryCountry=US&platform=YouTube&industries=Tech
```

**With multiple values per filter (OR match):**
```
GET /api/v1/web/influencer?platform=X&platform=YouTube&categories=Tech,Crypto
```

**Combined (pagination + search + filters):**
```
GET /api/v1/web/influencer?page=2&limit=20&search=@handle&primaryCountry=India&platform=YouTube&categories=Reviews
```

**JavaScript (fetch):** For multi-value filters, pass arrays; build query with repeated keys or comma-separated.
```javascript
const params = new URLSearchParams({ page: '1', limit: '10', search: searchInput || '' });
['primaryCountry', 'platform', 'inventory', 'industries', 'categories', 'primaryAudienceGeography'].forEach(key => {
  const v = filters[key];
  if (Array.isArray(v)) v.forEach(val => params.append(key, val));
  else if (v) params.append(key, v);
});
// Remove empty params if your backend doesn't ignore them
const url = `${API_BASE}/web/influencer?${params.toString()}`;
const res = await fetch(url);
const data = await res.json();
```

---
  
## Response (200 OK)

**Shape:**

```ts
{
  influencers: Influencer[];  // array of influencer objects
  total: number;              // total count matching filters
  page: number;               // current page
  limit: number;              // page size
  totalPages: number;         // ceil(total / limit)
}
```

**Influencer object fields (only these are returned – smaller payload):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique id. |
| `name` | string | Name / channel name. |
| `email` | string | Email. |
| `createdAt` | string (ISO date) | Created at. |
| `platform` | string \| null | e.g. YouTube, Instagram. |
| `platformLink` | string \| null | URL. |
| `inventory` | string \| null | Inventory type. |
| `primaryCountry` | string \| null | Country. |
| `sellPrice` | string \| null | Sell price. |
| `cpm` | string \| null | CPM. |
| `avgViews` | string \| null | Average views. |
| `industries` | string \| null | Industries. |
| `categories` | string \| null | Categories. |
| `primaryAudienceGeography` | string \| null | Primary audience geography. |

*Not returned (excluded for less load): updatedAt, deletedAt, telegramId, whatsAppNumber, primaryCountry, primaryTimezone, secondaryAudienceGeography, ageScreenshotUrl, genderScreenshotUrl, topCountriesScreenshotUrl, paymentTerms, turnaroundTimes, firstCollaborationImage1/2/3, xLink, instagramLink, youtubeLink, tiktokLink, newsletterLink, finalConfirmation, isVerified, isDeleted.*

---

## Example Response Body

```json
{
  "influencers": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Tech Creator",
      "email": "creator@example.com",
      "primaryCountry":"USA",
      "createdAt": "2025-02-01T12:00:00.000Z",
      "platform": "YouTube",
      "platformLink": "https://youtube.com/techcreator",
      "inventory": "Pre-roll",
      "sellPrice": "750",
      "cpm": "25",
      "avgViews": "100000",
      "industries": "Tech",
      "categories": "Reviews",
      "primaryAudienceGeography": "US, EU"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

## Pagination (frontend usage)

- **total**: Total number of influencers matching current filters/search.
- **page**: Current page (1-based).
- **limit**: Page size used.
- **totalPages**: `Math.ceil(total / limit)` — use for “Page X of Y” or last page.

To get the next page, send the same query params but increase `page` (e.g. `page=2`).  
Disable “Next” when `page >= totalPages`.  
Disable “Previous” when `page <= 1`.

---

## Error Responses

| Status | When | Body |
|--------|------|------|
| 500 | Server error | `{ "error": "string message" }` |

No auth, so no 401. Typically only 200 or 500.

---

## Quick Reference

- **URL:** `GET {BASE}/api/v1/web/influencer`
- **Params:** `page`, `limit`, `search`, `primaryCountry`, `platform`, `inventory`, `price`, `industries`, `categories`, `primaryAudienceGeography`
- **Response:** `{ influencers, total, page, limit, totalPages }`
- **Auth:** None

---

## Frontend Checklist

- [ ] Base URL: `{API_BASE}/api/v1/web/influencer` (e.g. from env).
- [ ] GET only; no request body.
- [ ] Build query string from: pagination (`page`, `limit`) + `search` + filter params (only non-empty).
- [ ] Parse response: `data.influencers`, `data.total`, `data.page`, `data.limit`, `data.totalPages`.
- [ ] Use `totalPages` and `page` for pagination UI (Next/Previous, page numbers).
- [ ] Handle 500: show `error` message from `data.error`.
