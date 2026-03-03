# Get influencer by ID – API doc

Returns a single influencer by UUID. Use this on the frontend to load influencer details for view or edit.

---

## Endpoint

**GET** `/api/v1/admin/influencer/:id`

**Auth:** Admin only. Send `Authorization: Bearer <admin_jwt>`.

**Path parameter**

| Name | Type   | Required | Description        |
|------|--------|----------|--------------------|
| **id** | string | Yes      | Influencer UUID.   |

---

## Request

**Method:** `GET`  
**Body:** None.  
**Query:** None.

**Example**

```http
GET /api/v1/admin/influencer/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Success response (200)

JSON object: the influencer entity. All fields below are included; `null` when not set.

| Field | Type | Description |
|-------|------|-------------|
| **id** | string | UUID. |
| **name** | string | Channel / brand name. |
| **email** | string | Primary contact email. |
| **telegramId** | string \| null | Telegram ID. |
| **whatsAppNumber** | string \| null | WhatsApp number. |
| **primaryCountry** | string \| null | Primary country. |
| **primaryTimezone** | string \| null | Primary timezone. |
| **platform** | string \| null | e.g. X, Youtube, Instagram. |
| **platformLink** | string \| null | Profile/channel URL. |
| **inventory** | string \| null | Inventory type. |
| **buyPrice** | string \| null | Buying price (numeric string). |
| **sellPrice** | string \| null | Selling price (numeric string). |
| **cpm** | string \| null | CPM. |
| **avgViews** | string \| null | Average views. |
| **industries** | string \| null | Industries (comma-separated or single). |
| **categories** | string \| null | Categories. |
| **primaryAudienceGeography** | string \| null | Primary audience geography. |
| **secondaryAudienceGeography** | string \| null | Secondary audience geography. |
| **ageScreenshotUrl** | string \| null | Age screenshot URL. |
| **genderScreenshotUrl** | string \| null | Gender screenshot URL. |
| **topCountriesScreenshotUrl** | string \| null | Top countries screenshot URL. |
| **paymentTerms** | string \| null | Payment terms. |
| **turnaroundTimes** | string \| null | Turnaround times. |
| **firstCollaborationImage1** | string \| null | First collaboration image URL. |
| **firstCollaborationImage2** | string \| null | |
| **firstCollaborationImage3** | string \| null | |
| **xLink** | string \| null | X (Twitter) link. |
| **instagramLink** | string \| null | Instagram link. |
| **youtubeLink** | string \| null | YouTube link. |
| **tiktokLink** | string \| null | TikTok link. |
| **newsletterLink** | string \| null | Newsletter link. |
| **finalConfirmation** | boolean | Final confirmation flag. |
| **isVerified** | boolean | Verified flag. |
| **isDeleted** | boolean | Soft-delete flag. |
| **createdAt** | string | ISO 8601 date. |
| **updatedAt** | string | ISO 8601 date. |
| **deletedAt** | string \| null | ISO 8601 date if deleted. |
| **contentTypes** | array | Single content-type row for edit UI (0 or 1 item). See below. |

**contentTypes** (array): **At most one item**, built from influencer fields: `inventory`→contentType, `buyPrice`→price, `sellPrice`→sellingPrice, `avgViews`→avgView, `cpm`→cpm. If the influencer has no inventory/price/views, the array is empty. Use for edit form; on PATCH send the first item in `contentTypes` to update those influencer fields.

**Example response body**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Channel",
  "email": "creator@example.com",
  "telegramId": "@handle",
  "whatsAppNumber": null,
  "primaryCountry": "India",
  "primaryTimezone": "Asia/Kolkata",
  "platform": "X",
  "platformLink": "https://x.com/mychannel",
  "inventory": "Single tweet",
  "buyPrice": "200",
  "sellPrice": "600",
  "cpm": "4",
  "avgViews": "50000",
  "industries": "Tech, Crypto",
  "categories": "Review",
  "primaryAudienceGeography": "India, US",
  "secondaryAudienceGeography": "UK",
  "ageScreenshotUrl": "https://...",
  "genderScreenshotUrl": "https://...",
  "topCountriesScreenshotUrl": "https://...",
  "paymentTerms": "Net 30",
  "turnaroundTimes": "3-5 days",
  "firstCollaborationImage1": "https://...",
  "firstCollaborationImage2": null,
  "firstCollaborationImage3": null,
  "xLink": "https://x.com/...",
  "instagramLink": null,
  "youtubeLink": "https://youtube.com/...",
  "tiktokLink": null,
  "newsletterLink": null,
  "finalConfirmation": true,
  "isVerified": true,
  "isDeleted": false,
  "createdAt": "2026-03-02T10:00:00.000Z",
  "updatedAt": "2026-03-02T10:00:00.000Z",
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

## Error responses

| Status | Description |
|--------|-------------|
| **401** | Missing or invalid admin token. |
| **404** | Influencer not found for the given `id`. Body: `{ "error": "Influencer not found" }`. |
| **500** | Server error. Body: `{ "error": "..." }`. |

---

## Frontend usage

1. Obtain admin JWT (e.g. after login).
2. Call `GET /api/v1/admin/influencer/{id}` with header `Authorization: Bearer <token>`.
3. On 200, use the JSON object as the influencer record (view or edit form).
4. On 404, show “Influencer not found”.
5. On 401, redirect to login or refresh token.

**Example (fetch)**

```ts
const res = await fetch(`https://your-api.com/api/v1/admin/influencer/${id}`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${adminToken}` },
});
if (!res.ok) {
  if (res.status === 404) throw new Error('Influencer not found');
  throw new Error(await res.json().then((b) => b.error));
}
const influencer = await res.json();
```
