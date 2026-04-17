# Web blogs — authenticated API (JWT)

CRUD and authenticated read under **`/api/v1/web/blogs`**. All routes on this base path require a **web user JWT** (`Authorization: Bearer <token>`) from [user email + OTP login](./API_WEB_USER_LOGIN_OTP.md) (`verifyWebUserAuth`: token `type` must be `user`, user must exist and not be soft-deleted).

**Related:** [Public blog read (no JWT)](./API_WEB_BLOGS_PUBLIC.md) · [Blog images](./API_WEB_BLOG_IMAGES.md)

For public marketing sites, prefer **`GET /api/v1/web/blogs/public`** — richer list (cover + SEO) without a token.

---

## Authentication

```http
Authorization: Bearer <jwt>
```

Obtain the token via `POST /api/v1/web/user/auth/verify-otp` (see user login OTP doc).

**`GET /api/v1/web/blogs`** and **`GET /api/v1/web/blogs/slug/:slug`** require this header. Mutating routes (`POST`, `PATCH`, `DELETE`) require it as well.

---

## Data model

| Field         | Type   | Description |
|---------------|--------|-------------|
| `id`          | UUID   | Primary key |
| `title`       | string | Post title (max 500 chars) |
| `slug`        | string | URL segment, unique (max 320 chars). Lowercase letters, numbers, single hyphens. |
| `teaser`      | string | Short blurb for lists / cards (max 2000 chars) |
| `coverImage`  | string | Cover image URL (max 2000 chars) |
| `content`     | string | Rich text / HTML from the frontend editor |
| `author`      | string | Display byline (max 255 chars). Defaults to the signed-in user’s email on create if omitted. |
| `seoTitle`    | string | Optional SEO page title / og:title (max 500 chars). Empty string if unset. |
| `seoDescription` | string | Optional meta description (max 2000 chars). |
| `seoKeywords` | string | Optional meta keywords, e.g. comma-separated (max 2000 chars). |
| `createdAt`   | ISO date | From server |
| `updatedAt`   | ISO date | From server |

**Delete** is a **soft delete** (`deletedAt` set). Deleted posts are omitted from list and slug lookup.

**Create API:** every content field is required (see POST body). The database may still allow NULL on older rows so migrations/`synchronize` do not fail; JSON responses treat missing values as empty strings. After the app connects, you can tighten data with SQL, for example: `UPDATE blogs SET cover_image = COALESCE(cover_image,''), teaser = COALESCE(teaser,''), content = COALESCE(content,''), title = COALESCE(title,''), author = COALESCE(author,''), seo_title = COALESCE(seo_title,''), seo_description = COALESCE(seo_description,''), seo_keywords = COALESCE(seo_keywords,'') WHERE …;`

Constants live in `src/constants/blog.ts`.

---

## 1. List blogs (summary)

**GET** `/api/v1/web/blogs`

Returns **non-deleted** posts, newest first.

### Success (200)

```json
{
  "blogs": [
    {
      "id": "uuid",
      "title": "Hello world",
      "slug": "hello-world",
      "teaser": "A short intro…",
      "coverImage": "https://…",
      "author": "editor@example.com",
      "createdAt": "2026-04-16T12:00:00.000Z"
    }
  ]
}
```

List items include **`coverImage`** for cards and admin tables. They still **omit** `content` and SEO fields (use detail by slug for those).

---

## 2. Blog detail by slug

**GET** `/api/v1/web/blogs/slug/:slug`

- `:slug` should be the stored slug (e.g. `hello-world`). Use URL encoding if needed; the server decodes it.

### Success (200)

```json
{
  "blog": {
    "id": "uuid",
    "title": "Hello world",
    "slug": "hello-world",
    "teaser": "A short intro…",
    "author": "editor@example.com",
    "createdAt": "2026-04-16T12:00:00.000Z",
    "coverImage": "https://…",
    "content": "<p>Rich HTML…</p>",
    "seoTitle": "Hello world | Ampli5 Blog",
    "seoDescription": "A concise summary for search results and social previews.",
    "seoKeywords": "influencer, marketing, blog",
    "updatedAt": "2026-04-16T14:00:00.000Z"
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid slug format |
| 404 | No non-deleted blog with that slug |

---

## 3. Create blog

**POST** `/api/v1/web/blogs`  
**Body:** JSON

| Field         | Required | Description |
|---------------|----------|-------------|
| `title`       | Yes      | |
| `slug`        | Yes      | Normalized to lowercase; invalid chars stripped; must match slug rules after normalization |
| `teaser`      | Yes      | |
| `coverImage`  | Yes      | URL string |
| `content`     | Yes      | Rich text / HTML |
| `author`      | No       | Defaults to authenticated user’s **email** |
| `seoTitle`    | No       | SEO / meta `<title>` style (max 500 chars) |
| `seoDescription` | No  | Meta description (max 2000 chars) |
| `seoKeywords` | No       | Meta keywords (max 2000 chars) |

### Success (201)

Same shape as detail: `{ "blog": { ... } }`.

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Validation (missing fields, slug rules, max lengths) |
| 409 | Slug already in use |

---

## 4. Update blog by id

**PATCH** `/api/v1/web/blogs/:id`

`:id` must be a UUID. Send **only fields to change** (partial update). To replace body HTML, send `content`.

| Field         | Required | Notes |
|---------------|----------|-------|
| `title`       | No       | Non-empty when present |
| `slug`        | No       | Same rules as create; unique |
| `teaser`      | No       | |
| `coverImage`  | No       | |
| `content`     | No       | Rich text / HTML |
| `author`      | No       | |
| `seoTitle`    | No       | Send `""` to clear |
| `seoDescription` | No  | Send `""` to clear |
| `seoKeywords` | No       | Send `""` to clear |

### Success (200)

`{ "blog": { ... } }` (full detail DTO).

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid id or validation |
| 404 | Blog not found or already soft-deleted |
| 409 | Slug conflict |

---

## 5. Delete blog by id

**DELETE** `/api/v1/web/blogs/:id`

`:id` = UUID. Soft-deletes the row.

### Success (200)

```json
{ "message": "Blog deleted" }
```

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid UUID |
| 404 | Not found or already deleted |

---

## Full URL reference (authenticated)

Base: `https://<host>/api/v1/web/blogs`

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/slug/:slug` |
| POST | `/` |
| PATCH | `/:id` |
| DELETE | `/:id` |

---

## Slug rules

After normalization (trim, lowercase, spaces → hyphens, remove invalid characters):

- Must match: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Examples: `my-post`, `launch-2026`  
- Invalid: empty string, leading/trailing `-`, `--` (collapsed), uppercase (normalized away), slashes in slug (avoid; use hyphenated segments).
