# Web: Creator onboarding API

Creators submit the onboarding form; the backend creates **influencer** records in the DB (one per selected platform + inventory item). Pricing uses the same rule as CSV upload: **buyPrice** = rate (numeric), **sellPrice** = buyPrice + 16% rounded to nearest 100.

---

## Endpoint

**POST** `/api/v1/web/creator-onboarding`

**Auth:** None.

**Content-Type:** `application/json`

---

## Request body

Same shape as the frontend creator onboarding form (Next.js). All fields except `channelBrandName` and `primaryContactEmail` are optional.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **channelBrandName** | string | Yes | Channel / Brand name. |
| **primaryContactEmail** | string | Yes | Primary contact email. |
| telegramId | string | No | Telegram ID. |
| whatsappNumber | string | No | WhatsApp number. |
| primaryCountry | string | No | Primary country. |
| primaryTimezone | string | No | Primary timezone. |
| platforms | string[] | No | e.g. `["X", "Youtube", "Instagram"]`. |
| platformUrls | object | No | `{ "X": "https://...", "Youtube": "https://..." }` – platform key → profile URL. |
| industries | string[] | No | Industries (joined to string in DB). |
| categories | string[] | No | Categories (joined to string in DB). |
| **inventoryItems** | object | No | Key = inventory label (e.g. `"Single tweet"`), value = `{ selected, rate, averageViews?, cpm? }`. |
| primaryAudienceGeography | string[] | No | Primary audience geography (joined). |
| secondaryAudienceGeography | string[] | No | Secondary (joined). |
| ageScreenshot | string | No | Age screenshot URL → `ageScreenshotUrl`. |
| genderScreenshot | string | No | Gender screenshot URL. |
| topCountriesScreenshot | string | No | Top countries screenshot URL. |
| paymentTerms | string | No | Payment terms. |
| turnaroundTimes | string[] | No | Turnaround times (joined). |
| firstCollaborationImage1 | string | No | First collaboration image URL. |
| firstCollaborationImage2 | string | No | |
| firstCollaborationImage3 | string | No | |
| xLink | string | No | X (Twitter) profile link. |
| instagramLink | string | No | |
| youtubeLink | string | No | |
| tiktokLink | string | No | |
| newsletterLink | string | No | |
| finalConfirmation | boolean | No | Final confirmation checkbox. |

**inventoryItems** shape per key:

- `selected` (boolean): include this item.
- `rate` (string): price/rate (e.g. `"200"` or `"$200"`). Stored as **buyPrice** (numeric only). **sellPrice** = buyPrice + 16% rounded to nearest 100.
- `averageViews` (string, optional): avg views.
- `cpm` (string, optional): CPM (stored as numeric).

One influencer row is created per (platform × selected inventory item with a non‑zero rate). Same contact info (name, email, etc.) is repeated; platform, platformLink, inventory, buyPrice, sellPrice, avgViews, cpm vary per row.

---

## Example request

```json
{
  "channelBrandName": "My Channel",
  "primaryContactEmail": "creator@example.com",
  "telegramId": "@handle",
  "whatsappNumber": "+1234567890",
  "primaryCountry": "India",
  "primaryTimezone": "Asia/Kolkata",
  "platforms": ["X", "Youtube"],
  "platformUrls": {
    "X": "https://x.com/mychannel",
    "Youtube": "https://youtube.com/@mychannel"
  },
  "industries": ["Tech", "Crypto"],
  "categories": ["Review"],
  "inventoryItems": {
    "Single tweet": { "selected": true, "rate": "200", "averageViews": "50000", "cpm": "4" },
    "Shorts": { "selected": true, "rate": "500", "averageViews": "100000" }
  },
  "primaryAudienceGeography": ["India", "US"],
  "secondaryAudienceGeography": ["UK"],
  "ageScreenshot": "https://...",
  "genderScreenshot": "https://...",
  "topCountriesScreenshot": "https://...",
  "paymentTerms": "Net 30",
  "turnaroundTimes": ["3-5 days"],
  "firstCollaborationImage1": "https://...",
  "xLink": "https://x.com/...",
  "youtubeLink": "https://youtube.com/...",
  "finalConfirmation": true
}
```

---

## Success response (200)

```json
{
  "message": "Form submitted successfully!",
  "created": 2,
  "influencerIds": ["uuid-1", "uuid-2"]
}
```

- **created**: number of influencer records created (one per selected inventory item with rate).
- **influencerIds**: DB IDs of the created influencers.

---

## Error responses

- **400** – Validation:
  - `"Channel / Brand Name is required."`
  - `"Primary Contact Email is required."`
  - `"No inventory items with a rate were selected. Please select at least one item and enter a rate."`
- **500** – Server error (e.g. DB or notification failure).

---

## Pricing (same as CSV)

- **buyPrice**: from `inventoryItems[].rate`; `$` and non-numeric characters are stripped; only the number is stored.
- **sellPrice**: `buyPrice * 1.16`, rounded to the **nearest 100** (e.g. 554 → 642.64 → 600).

---

## Frontend integration

Point the creator onboarding form to:

`POST /api/v1/web/creator-onboarding`

Send the same JSON body you currently send to the Next.js API (Google Sheet). The backend creates influencers in the DB and sends the team notification email (if configured). No Google Sheets or env vars for Sheets are required for this flow.
