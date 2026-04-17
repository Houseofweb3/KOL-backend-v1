# Web blog images API (no JWT)

Open endpoints for uploading and deleting **blog cover** and **inline rich-text** images. **No `Authorization` header.**

**Related:** [Public blog read](./API_WEB_BLOGS_PUBLIC.md) · [Authenticated blogs](./API_WEB_BLOGS_AUTHENTICATED.md)

Store the returned **`url`** in `coverImage` on create/update, or embed it in HTML `content`.

---

## Storage and security

Objects are stored in your configured S3-compatible bucket under **`media/blog-public/`**. The response uses a **public object URL** (see `getPublicUrl` in `object-storage.service.ts`): the object should be **readable with that URL** (public bucket ACL, bucket policy, or CDN). If the bucket is private-only, allow public read for `media/blog-public/*` or serve via CDN.

**Security note:** Anyone can call upload or delete. Delete only accepts URLs whose object key starts with **`media/blog-public/`** (same prefix as this uploader).

---

## Upload image

**POST** `/api/v1/web/blog-images/upload`

- **Content-Type:** `multipart/form-data`
- **Field name:** `file` (single image)
- **Allowed:** JPEG, PNG, GIF, WebP, SVG — **max 10MB**

### Success (201)

```json
{
  "url": "https://…/media/blog-public/<uuid>_<filename>"
}
```

---

## Delete image by URL

**DELETE** `/api/v1/web/blog-images`

- **Content-Type:** `application/json`
- **Body:** `{ "url": "<exact URL from upload or equivalent public URL for the same object>" }`

### Success (200)

`{ "deleted": true }`

### Errors

`400` if `url` is missing, invalid, or not under `media/blog-public/` for this app’s bucket.

---

## URL quick reference

Base: `https://<host>/api/v1/web/blog-images`

| Method | Path |
|--------|------|
| POST | `/upload` |
| DELETE | `/` (JSON body `{ "url" }`) |
