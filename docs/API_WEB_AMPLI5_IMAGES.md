# Web Ampli5 audience demographic images API (no JWT)

Open endpoints for uploading, listing, and deleting **audience demographic images** used by `ampli5.ai` onboarding. **No `Authorization` header.**

Store the returned **`url`** in your onboarding payload (e.g. audience demographics images).

---

## Storage and security

Objects are stored in your configured S3-compatible bucket under:

- **`media/ampli5/<folderName>/...`**

The response uses a **public object URL** (see `getPublicUrl` in `src/services/v1/admin/object-storage.service.ts`): the object should be **readable with that URL** (public bucket ACL, bucket policy, or CDN). If the bucket is private-only, allow public read for `media/ampli5/*` or serve via CDN.

**Security note:** Anyone can call upload/list/delete. Delete only accepts URLs/keys whose object key starts with **`media/ampli5/`** (safety prefix).

---

## Folder naming

You must send a `folderName` at upload time. This becomes the second-level prefix:

`media/ampli5/<folderName>/<uuid>_<filename>`

Allowed `folderName`:

- 1–64 chars, letters/numbers/underscore/hyphen
- must start with a letter or number

Recommended examples:

- `onboarding-audience-demography`
- `client_12345_audience`

---

## Upload image

**POST** `/api/v1/web/ampli5-images/upload`

- **Content-Type:** `multipart/form-data`
- **Field name:** `file` (single image)
- **Field name:** `folderName` (string)
- **Allowed:** JPEG, PNG, GIF, WebP, SVG — **max 10MB**

### Success (201)

```json
{
  "url": "https://…/media/ampli5/<folderName>/<uuid>_<filename>"
}
```

### Errors

- `400` if `file` is missing, invalid type, too large, or `folderName` invalid

---

## List images (admin panel)

**GET** `/api/v1/web/ampli5-images?folderName=<folderName>&limit=200`

- `folderName` (required)
- `limit` (optional, 1–1000; default 200)

### Success (200)

```json
{
  "urls": [
    "https://…/media/ampli5/<folderName>/..."
  ]
}
```

---

## Delete image (S3)

**DELETE** `/api/v1/web/ampli5-images`

- **Content-Type:** `application/json`
- Provide either:
  - `{ "url": "<exact URL from upload or equivalent public URL for same object>" }`, or
  - `{ "key": "media/ampli5/<folderName>/<file>" }` (or without `media/` prefix)

### Success (200)

`{ "deleted": true }`

### Errors

- `400` if `url/key` missing/invalid or not under `media/ampli5/`

---

## URL quick reference

Base: `https://<host>/api/v1/web/ampli5-images`

| Method | Path |
|--------|------|
| POST | `/upload` |
| GET | `/?folderName=...` |
| DELETE | `/` (JSON body `{ "url" }` or `{ "key" }`) |

