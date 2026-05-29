# Web: Creator onboarding API

Creators submit the onboarding form; the backend creates **influencer** records in the DB (one per selected platform + inventory item). Pricing uses the same rule as CSV upload: **buyPrice** = rate (numeric), **sellPrice** = buyPrice + 16% rounded to nearest 100.

---

## Endpoint

**POST** `/api/v1/web/creator-onboarding`

**Auth:** None.

**Content-Type:** `application/json`

---

## Request body

Same shape as the frontend creator onboarding form (Next.js). Required: **`channelBrandName`**, **`primaryContactEmail`**, and **`type`**.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **channelBrandName** | string | Yes | Channel / Brand name. |
| **primaryContactEmail** | string | Yes | Primary contact email. |
| **type** | string | Yes | Creator role (“I am a …”), e.g. `"Influencer"`. Stored on each created influencer as **`creatorType`**. See **`CREATOR_TYPE_OPTIONS`** in `src/constants/creator-onboarding-options.ts` for canonical labels. |
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
| **platformCollaborationProof** | object | Yes* | Per-platform collaboration proof. Keys must match `platforms[]`. Required when platforms are selected. |
| firstCollaborationPostLink1 | string | No | Legacy mirror of first platform’s `postLink1`. |
| firstCollaborationPostLink2 | string | No | Legacy mirror of first platform’s `postLink2`. |
| firstCollaborationImage1 | string | No | Legacy mirror of first platform’s `image1`. |
| firstCollaborationImage2 | string | No | Legacy mirror of first platform’s `image2`. |
| firstCollaborationImage3 | string | No | Optional third screenshot (legacy). |
| platformAudienceProof | object | No | Per-platform audience screenshots (preferred over global fields). |
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

### Collaboration proof (Step 9)

For **each** entry in `platforms`, send `platformCollaborationProof[platform]`:

| Field | Required | Notes |
|-------|----------|--------|
| `postLink1` | Yes | HTTP(S) URL to collaboration post (screenshot 1) |
| `postLink2` | Yes | HTTP(S) URL to collaboration post (screenshot 2) |
| `image1` | Yes | Uploaded screenshot URL |
| `image2` | Yes | Uploaded screenshot URL |
| `image1PublicId` | No | Storage public id (optional) |
| `image2PublicId` | No | Storage public id (optional) |

Legacy root fields (`firstCollaborationPostLink1`, `firstCollaborationPostLink2`, `firstCollaborationImage1`, `firstCollaborationImage2`) are merged into the **first** platform when omitted in `platformCollaborationProof`.

Stored on each created influencer as:

- `firstCollaborationPostLink1` / `firstCollaborationPostLink2`
- `firstCollaborationImage1` / `firstCollaborationImage2`

**Example:**

```json
{
  "platforms": ["X", "Youtube"],
  "platformCollaborationProof": {
    "X": {
      "postLink1": "https://x.com/example/status/1",
      "image1": "https://cdn.example.com/s1.png",
      "postLink2": "https://x.com/example/status/2",
      "image2": "https://cdn.example.com/s2.png"
    },
    "Youtube": {
      "postLink1": "https://youtube.com/watch?v=abc",
      "image1": "https://cdn.example.com/y1.png",
      "postLink2": "https://youtube.com/watch?v=def",
      "image2": "https://cdn.example.com/y2.png"
    }
  },
  "firstCollaborationPostLink1": "https://x.com/example/status/1",
  "firstCollaborationPostLink2": "https://x.com/example/status/2",
  "firstCollaborationImage1": "https://cdn.example.com/s1.png",
  "firstCollaborationImage2": "https://cdn.example.com/s2.png"
}
```

---

## Example request

```json
{
  "channelBrandName": "My Channel",
  "primaryContactEmail": "creator@example.com",
  "type": "Influencer",
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
  - `"type is required (e.g. \"Influencer\")."`
  - `"Collaboration post link is required for Youtube (Screenshot 1)"` (and similar per platform/field)
  - `"Collaboration post link must be a valid URL for X (Screenshot 2)"` (invalid URL)
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
