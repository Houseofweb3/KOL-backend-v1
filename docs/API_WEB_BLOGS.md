# Web blogs API — index

Blog functionality is split into **separate docs** by audience and auth:

| Doc | Audience | Base path |
|-----|----------|-----------|
| [**API_WEB_BLOGS_PUBLIC.md**](./API_WEB_BLOGS_PUBLIC.md) | Public site / SEO | `/api/v1/web/blogs/public` — **no JWT** |
| [**API_WEB_BLOGS_AUTHENTICATED.md**](./API_WEB_BLOGS_AUTHENTICATED.md) | Editors (CRUD + authed list/detail) | `/api/v1/web/blogs` — **JWT required** |
| [**API_WEB_BLOG_IMAGES.md**](./API_WEB_BLOG_IMAGES.md) | Editor uploads | `/api/v1/web/blog-images` — **no JWT** |

**Login for editors:** [API_WEB_USER_LOGIN_OTP.md](./API_WEB_USER_LOGIN_OTP.md) (`Authorization: Bearer <token>` after OTP verify).
