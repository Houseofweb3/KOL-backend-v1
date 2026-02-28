# Influencer API (Influencer routes only)

All requests need admin JWT. Send header: `Authorization: Bearer <token>`. No auth routes are documented here.

Base path: `/api/v1/admin/influencer`

---

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/admin/influencer | List influencers (paginated) |
| POST | /api/v1/admin/influencer/upload-csv | Upload CSV (influencer intake) to create influencers |
| GET | /api/v1/admin/influencer/:id | Get one influencer |
| POST | /api/v1/admin/influencer | Create influencer |
| PATCH | /api/v1/admin/influencer/:id | Update influencer |
| DELETE | /api/v1/admin/influencer/:id | Soft-delete influencer |

---

## Influencer fields (response / body)

| Field | Type | Create required | Notes |
|-------|------|-----------------|-------|
| id | string (UUID) | no | Set by server |
| name | string | yes | |
| email | string | yes | Stored lowercased |
| telegramId | string \| null | no | |
| whatsAppNumber | string \| null | no | |
| primaryCountry | string \| null | no | |
| primaryTimezone | string \| null | no | |
| platform | string \| null | no | |
| platformLink | string \| null | no | |
| inventory | string \| null | no | |
| buyPrice | string \| null | no | |
| sellPrice | string \| null | no | |
| cpm | string \| null | no | |
| avgViews | string \| null | no | |
| industries | string \| null | no | |
| categories | string \| null | no | |
| primaryAudienceGeography | string \| null | no | |
| secondaryAudienceGeography | string \| null | no | |
| ageScreenshotUrl | string \| null | no | |
| genderScreenshotUrl | string \| null | no | |
| topCountriesScreenshotUrl | string \| null | no | |
| paymentTerms | string \| null | no | |
| turnaroundTimes | string \| null | no | |
| firstCollaborationImage1 | string \| null | no | |
| firstCollaborationImage2 | string \| null | no | |
| firstCollaborationImage3 | string \| null | no | |
| xLink | string \| null | no | |
| instagramLink | string \| null | no | |
| youtubeLink | string \| null | no | |
| tiktokLink | string \| null | no | |
| newsletterLink | string \| null | no | |
| finalConfirmation | boolean | no | default false |
| isVerified | boolean | no | default false |
| isDeleted | boolean | no | Set by server |
| createdAt | string (ISO) | no | From server |
| updatedAt | string (ISO) | no | From server |
| deletedAt | string \| null (ISO) | no | Set when deleted |

---

## 1. List influencers

**GET** `/api/v1/admin/influencer`

Query:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Per page (max 100) |
| search | string | - | Search in name, email, industries, categories, platform, inventory |
| industries | string | - | Filter by industries (ILike) |
| categories | string | - | Filter by categories (ILike) |
| platform | string | - | Filter by platform (ILike) |
| includeDeleted | string | "false" | "true" to include soft-deleted |

Example request:

```
GET /api/v1/admin/influencer?page=1&limit=10&search=tech
Authorization: Bearer <token>
```

Example response 200:

```json
{
  "influencers": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Tech Creator",
      "email": "creator@example.com",
      "telegramId": "@techcreator",
      "whatsAppNumber": "+1234567890",
      "primaryCountry": "US",
      "primaryTimezone": "America/New_York",
      "platform": "YouTube",
      "platformLink": "https://youtube.com/techcreator",
      "inventory": "Pre-roll",
      "buyPrice": "500",
      "sellPrice": "750",
      "cpm": "25",
      "avgViews": "100000",
      "industries": "Tech",
      "categories": "Reviews",
      "primaryAudienceGeography": "US, EU",
      "secondaryAudienceGeography": null,
      "ageScreenshotUrl": null,
      "genderScreenshotUrl": null,
      "topCountriesScreenshotUrl": null,
      "paymentTerms": "Net 30",
      "turnaroundTimes": "2 weeks",
      "firstCollaborationImage1": null,
      "firstCollaborationImage2": null,
      "firstCollaborationImage3": null,
      "xLink": null,
      "instagramLink": null,
      "youtubeLink": "https://youtube.com/techcreator",
      "tiktokLink": null,
      "newsletterLink": null,
      "finalConfirmation": false,
      "isVerified": true,
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

Errors: 401 Unauthorized, 500 with `{ "error": "..." }`

---

## 2. Get influencer by id

**GET** `/api/v1/admin/influencer/:id`

Example request:

```
GET /api/v1/admin/influencer/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
```

Example response 200: single influencer object (same shape as in list above).

Errors: 401, 404 `{ "error": "Influencer not found" }`, 500 `{ "error": "..." }`

---

## 3. Create influencer

**POST** `/api/v1/admin/influencer`

Body: JSON. Required: `name`, `email`. All other fields optional (see Influencer fields table).

Example request (minimal):

```json
{
  "name": "Tech Creator",
  "email": "creator@example.com"
}
```

Example request (full):

```json
{
  "name": "Tech Creator",
  "email": "creator@example.com",
  "telegramId": "@techcreator",
  "whatsAppNumber": "+1234567890",
  "primaryCountry": "US",
  "primaryTimezone": "America/New_York",
  "platform": "YouTube",
  "platformLink": "https://youtube.com/techcreator",
  "inventory": "Pre-roll",
  "buyPrice": "500",
  "sellPrice": "750",
  "cpm": "25",
  "avgViews": "100000",
  "industries": "Tech",
  "categories": "Reviews",
  "primaryAudienceGeography": "US, EU",
  "secondaryAudienceGeography": null,
  "ageScreenshotUrl": null,
  "genderScreenshotUrl": null,
  "topCountriesScreenshotUrl": null,
  "paymentTerms": "Net 30",
  "turnaroundTimes": "2 weeks",
  "firstCollaborationImage1": null,
  "firstCollaborationImage2": null,
  "firstCollaborationImage3": null,
  "xLink": null,
  "instagramLink": null,
  "youtubeLink": "https://youtube.com/techcreator",
  "tiktokLink": null,
  "newsletterLink": null,
  "finalConfirmation": false,
  "isVerified": false
}
```

Example response 201: full influencer object (with id, createdAt, updatedAt, isDeleted: false, etc.).

Errors: 400 `{ "error": "name and email are required" }`, 401, 409 `{ "error": "Influencer with this email already exists" }`, 500 `{ "error": "..." }`

---

## 4. Update influencer

**PATCH** `/api/v1/admin/influencer/:id`

Body: JSON with only the fields to update (partial). Same field names as in the Influencer fields table.

Example request:

```json
{
  "isVerified": true,
  "sellPrice": "800"
}
```

Example response 200: full updated influencer object.

Errors: 401, 404 `{ "error": "Influencer not found" }`, 500 `{ "error": "..." }`

---

## 5. Delete influencer (soft)

**DELETE** `/api/v1/admin/influencer/:id`

No body.

Example request:

```
DELETE /api/v1/admin/influencer/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
```

Example response 200:

```json
{
  "message": "Influencer deleted"
}
```

Errors: 401, 404 `{ "error": "Influencer not found" }`, 500 `{ "error": "..." }`

---

## 6. Upload influencers from CSV

**POST** `/api/v1/admin/influencer/upload-csv`

Accepts a CSV file in **influencer intake** format. Column headers must match exactly. Rows are mapped to influencers; duplicate email skips. Max file size 5MB.

**CSV column mapping (use these exact headers):**

| CSV header | Influencer field |
|------------|------------------|
| Channel / Brand Name (or Name) | name |
| Primary Contact Email (or Email) | email |
| Telegram ID | telegramId |
| WhatsApp Number | whatsAppNumber |
| Primary Country | primaryCountry |
| Primary Timezone | primaryTimezone |
| Platform | platform |
| Platform Link | platformLink |
| Inventory | inventory |
| Buy Price | buyPrice |
| Sell Price or Price | sellPrice |
| CPM | cpm |
| Avg Views | avgViews |
| Industries | industries |
| Categories | categories |
| Primary Audience Geography | primaryAudienceGeography |
| Secondary Audience Geography | secondaryAudienceGeography |
| Age Screenshot URL | ageScreenshotUrl |
| Gender Screenshot URL | genderScreenshotUrl |
| Top Countries Screenshot URL | topCountriesScreenshotUrl |
| Payment Terms | paymentTerms |
| Turnaround Times | turnaroundTimes |
| First Collaboration Image 1 | firstCollaborationImage1 |
| First Collaboration Image 2 | firstCollaborationImage2 |
| First Collaboration Image 3 | firstCollaborationImage3 |
| X Link | xLink |
| Instagram Link | instagramLink |
| YouTube Link | youtubeLink |
| TikTok Link | tiktokLink |
| Newsletter Link | newsletterLink |
| Final Confirmation | finalConfirmation (yes/true/1 = true) |
| Date, Time | ignored |

**Request:** `multipart/form-data`, field name **`file`**, file must be `.csv`.

**Example (curl):**
```bash
curl -X POST "http://localhost:3000/api/v1/admin/influencer/upload-csv" \
  -H "Authorization: Bearer <token>" \
  -F "file=@influencer-intake.csv"
```

**Example response 200:**
```json
{
  "message": "CSV processed",
  "created": 10,
  "skipped": 2,
  "errors": []
}
```

Errors: 400 (no file, wrong type, file too large), 401, 500.

---

## Quick reference

- All routes: base `/api/v1/admin/influencer`, header `Authorization: Bearer <token>`.
- List: GET with query page, limit, search, industries, categories, platform, includeDeleted.
- Upload CSV: POST /upload-csv, multipart field `file`.
- Get one: GET /:id.
- Create: POST, body min { name, email }.
- Update: PATCH /:id, body partial fields.
- Delete: DELETE /:id, no body.
