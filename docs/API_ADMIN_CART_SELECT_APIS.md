# Admin Cart Select APIs – Client & Influencer lists for dropdowns

Use these APIs in the **admin panel** to power **Select Client** and **Select Influencer** dropdowns when creating a cart/proposal. Both support **pagination** (e.g. for infinite scroll) and **search**; the influencer list also supports **multi-value platform filter**.

**Auth:** All endpoints require **admin JWT**: `Authorization: Bearer <admin_token>`.

**Base path:** `{API_BASE}/api/v1/admin`  
Example: `http://localhost:3002/api/v1/admin`

---

## 1. Client list (for dropdown)

**GET** `/api/v1/admin/client/select`

Returns clients with **only** `id`, `name`, `email`. Use for the “Select Client” dropdown.

### Query parameters

| Param   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `page`  | number | No       | Page number (default `1`). |
| `limit` | number | No       | Items per page (default `10`, max `100`). Use for infinite scroll (e.g. 20). |
| `search`| string | No       | Search by **name** or **email** (case-insensitive). |

### Success (200)

```json
{
  "clients": [
    { "id": "uuid", "name": "Naimish", "email": "naimishbhesaniya212@gmail.com" }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### Example (infinite scroll)

```ts
// Load first page
GET /api/v1/admin/client/select?page=1&limit=20

// Search
GET /api/v1/admin/client/select?page=1&limit=20&search=naimish

// Next page
GET /api/v1/admin/client/select?page=2&limit=20
```

### TypeScript types

```ts
export interface ClientSelectItem {
  id: string;
  name: string;
  email: string;
}

export interface ClientSelectResponse {
  clients: ClientSelectItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 2. Influencer list (for dropdown)

**GET** `/api/v1/admin/influencer/select`

Returns influencers with **only** these fields:  
`id`, `name`, `platform`, `platformLink`, `inventory`, `sellPrice`, `firstCollaborationImage1`, `firstCollaborationImage2`, `firstCollaborationImage3`, `avgViews`, `cpm`, `buyPrice`.

Use for the “Select Influencer” dropdown and to show platform, inventory, price, images, etc.

### Query parameters

| Param     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `page`    | number | No       | Page number (default `1`). |
| `limit`   | number | No       | Items per page (default `10`, max `100`). Use for infinite scroll (e.g. 20). |
| `search`  | string | No       | Search by **name** or **email** (case-insensitive). |
| `platform`| string or string[] | No | Filter by platform. **Multiple values**: repeat param or comma-separated, e.g. `platform=X&platform=YouTube` or `platform=X,YouTube`. |

### Success (200)

```json
{
  "influencers": [
    {
      "id": "uuid",
      "name": "Senorita",
      "platform": "X",
      "platformLink": "https://x.com/...",
      "inventory": "Single Tweet",
      "sellPrice": "200",
      "firstCollaborationImage1": "https://...",
      "firstCollaborationImage2": null,
      "firstCollaborationImage3": null,
      "avgViews": "26000",
      "cpm": null,
      "buyPrice": "150"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### Example (infinite scroll + search + platform filter)

```ts
// First page, no filter
GET /api/v1/admin/influencer/select?page=1&limit=20

// Search by name/email
GET /api/v1/admin/influencer/select?page=1&limit=20&search=Senorita

// Multiple platforms (X and YouTube)
GET /api/v1/admin/influencer/select?page=1&limit=20&platform=X&platform=YouTube
// or
GET /api/v1/admin/influencer/select?page=1&limit=20&platform=X,YouTube

// Next page
GET /api/v1/admin/influencer/select?page=2&limit=20
```

### TypeScript types

```ts
export interface InfluencerSelectItem {
  id: string;
  name: string;
  platform: string | null;
  platformLink: string | null;
  inventory: string | null;
  sellPrice: string | null;
  firstCollaborationImage1: string | null;
  firstCollaborationImage2: string | null;
  firstCollaborationImage3: string | null;
  avgViews: string | null;
  cpm: string | null;
  buyPrice: string | null;
}

export interface InfluencerSelectResponse {
  influencers: InfluencerSelectItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## Quick reference

| Purpose           | Method | Path                               | Query |
|-------------------|--------|------------------------------------|-------|
| Client dropdown   | GET    | `/api/v1/admin/client/select`      | `page`, `limit`, `search` |
| Influencer dropdown | GET  | `/api/v1/admin/influencer/select` | `page`, `limit`, `search`, `platform` (multi) |

**Headers for all requests:**  
`Content-Type: application/json`  
`Authorization: Bearer <admin_token>`

---

## Frontend integration (infinite scroll)

1. **Select Client:** Call `GET /api/v1/admin/client/select?page=1&limit=20`. On scroll, increment `page` and append `clients` to the list. Use `search` for the dropdown search input (by name or email).
2. **Select Influencer:** Call `GET /api/v1/admin/influencer/select?page=1&limit=20`. On scroll, increment `page` and append `influencers`. Use `search` for name/email and `platform` (multiple values) for platform filter.
3. **Display:** Client: show `name` and `email` (e.g. "Naimish (naimishbhesaniya212@gmail.com)"). Influencer: show `name`, `platform`, `inventory`, `sellPrice` (e.g. "Senorita (X, Single Tweet) - $200") and use images/avgViews/cpm/buyPrice as needed.

Use this doc with your frontend (or frontend AI) to implement the admin cart “Select Client” and “Select Influencer” flows.
