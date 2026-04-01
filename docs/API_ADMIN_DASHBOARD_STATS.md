# Admin Dashboard Statistics API

**Admin-only.** Returns aggregated **read-only** statistics for the admin panel: influencer totals (with platform and industry breakdowns), client proposal (cart) counts by status, and active client total.

**Base path:** `{API_BASE}/api/v1/admin`  
Example: `http://localhost:3000/api/v1/admin`

**Auth:** `Authorization: Bearer <admin_token>`

---

## Get dashboard stats

**GET** `/api/v1/admin/dashboard/stats`

No query parameters.

### Success (200)

```json
{
  "generatedAt": "2026-04-01T12:00:00.000Z",
  "influencers": {
    "total": 120,
    "byPlatform": [
      { "key": "X", "count": 45 },
      { "key": "YouTube", "count": 30 },
      { "key": "Unknown", "count": 5 }
    ],
    "byIndustry": [
      { "key": "Crypto", "count": 40 },
      { "key": "DeFi", "count": 25 }
    ]
  },
  "proposals": {
    "total": 48,
    "byStatus": {
      "generate": 10,
      "send": 8,
      "updated": 4,
      "approved": 26
    }
  },
  "clients": {
    "total": 22
  }
}
```

### Field meanings

| Path | Description |
|------|-------------|
| `generatedAt` | ISO timestamp when aggregates were computed. |
| `influencers.total` | Count of influencers with **`is_deleted = false`**. |
| `influencers.byPlatform` | **Full list**: every platform key from `PLATFORM_INVENTORY_OPTIONS` (creator onboarding), each with `count` **≥ 0**. Then **`Unknown`** (null/empty platform in DB). Then any **extra** DB platform labels not in the canonical list (sorted by count). Matching is **case-insensitive** (e.g. `youtube` → `Youtube`). |
| `influencers.byIndustry` | **Full list**: every parent + subcategory from `INDUSTRY_CATEGORY_OPTIONS`, each with `count` **≥ 0**. Then any **extra** industry strings from DB not in that list (comma-split per influencer; PostgreSQL). Matching is **case-insensitive**. |
| `proposals.total` | Total **carts** (each cart is one client proposal). |
| `proposals.byStatus` | Cart workflow: `generate`, `send`, `updated`, `approved`. Keys with **0** are still returned. |
| `clients.total` | Clients with **`is_deleted = false`**. |

### TypeScript types (frontend)

```ts
export interface CountBucket {
  key: string;
  count: number;
}

export interface AdminDashboardStats {
  generatedAt: string;
  influencers: {
    total: number;
    byPlatform: CountBucket[];
    byIndustry: CountBucket[];
  };
  proposals: {
    total: number;
    byStatus: Record<string, number>;
  };
  clients: {
    total: number;
  };
}
```

### Example request

```bash
curl -s -H "Authorization: Bearer <admin_token>" \
  "http://localhost:3000/api/v1/admin/dashboard/stats"
```

### Errors

| Status | Body | When |
|--------|------|------|
| 401/403 | — | Missing/invalid admin token. |
| 500 | `{ "error": "<message>" }` | Server/database error. |

### Implementation notes

- **Database:** Industry breakdown uses raw SQL with `unnest(string_to_array(...))` — **PostgreSQL only**.
- **Charts:** Use `byPlatform` / `byIndustry` as pie/bar series (`key` = label, `count` = value).
- **KPI cards:** `influencers.total`, `clients.total`, `proposals.total`, plus per-status counts from `proposals.byStatus`.

### Backend files

- `src/routes/v1/admin/dashboard-stats.routes.ts` — mounts under `/dashboard`
- `src/controllers/v1/admin/dashboard-stats.controller.ts`
- `src/services/v1/admin/dashboard-stats.service.ts`
