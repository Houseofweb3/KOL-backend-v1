# Web blogs — public read API (no JWT)

Use these from a public site, app shell, or SEO crawler. **No `Authorization` header.** Non-deleted posts only; soft-deleted posts are omitted (same visibility rules as authenticated read).

**Related:** [Authenticated blog API](./API_WEB_BLOGS_AUTHENTICATED.md) (CRUD, JWT) · [Blog images](./API_WEB_BLOG_IMAGES.md) (open upload/delete for covers and inline HTML)

---

## Base URL

`https://<host>/api/v1/web/blogs/public`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List posts (newest first): title, teaser, cover, slug, author, dates, SEO |
| GET | `/slug/:slug` | Full post: includes `content` and `updatedAt` |

---

## 1. Public list

**GET** `/api/v1/web/blogs/public`

Returns **non-deleted** posts, newest first. Each item includes **title**, **teaser**, **coverImage**, **slug**, **author**, **createdAt**, and **SEO** fields (`seoTitle`, `seoDescription`, `seoKeywords`). Omits full **content** (use detail by slug).

### Success (200)

```json
{
  "blogs": [
    {
      "id": "uuid",
      "title": "Hello world",
      "slug": "hello-world",
      "teaser": "A short intro…",
      "coverImage": "https://…/media/blog-public/…",
      "author": "editor@example.com",
      "createdAt": "2026-04-16T12:00:00.000Z",
      "seoTitle": "Hello world | Blog",
      "seoDescription": "Summary for search and social previews.",
      "seoKeywords": "marketing, blog"
    }
  ]
}
```

---

## 2. Public detail by slug

**GET** `/api/v1/web/blogs/public/slug/:slug`

- `:slug` should be the stored slug (e.g. `hello-world`). URL-encode if needed; the server decodes it.

Returns a single **`blog`** object: same field set as [authenticated detail by slug](./API_WEB_BLOGS_AUTHENTICATED.md#2-blog-detail-by-slug) (`content`, `coverImage`, `teaser`, `author`, `createdAt`, `updatedAt`, SEO fields).

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid slug format |
| 404 | No non-deleted blog with that slug |

---

## URL quick reference

Base: `https://<host>/api/v1/web/blogs/public`

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/slug/:slug` |

Slug rules: [API_WEB_BLOGS_AUTHENTICATED.md — Slug rules](./API_WEB_BLOGS_AUTHENTICATED.md#slug-rules)
