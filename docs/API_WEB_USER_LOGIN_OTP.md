# Web user login (email + OTP)

Passwordless login for accounts in the **`users`** table (same OTP storage as admin/client: `otps` table). The login email uses the **same HTML template as the client portal OTP** (`sendClientOtpEmail`: Ampli5 branding, “Your login code”, etc.).

There are **two endpoints only**: request OTP, then verify OTP and receive a JWT.

**Base path:** `/api/v1/web/user`

---

## 1. Send OTP

**POST** `/api/v1/web/user/auth/send-otp`

**Auth:** None  
**Headers:** `Content-Type: application/json`

### Request body

| Field   | Type   | Required | Description                          |
|---------|--------|----------|--------------------------------------|
| `email` | string | Yes      | Email registered on a `users` row    |

### Example

```json
{
  "email": "person@example.com"
}
```

### Success (200)

```json
{
  "message": "OTP sent successfully",
  "expiresInMinutes": 10
}
```

`expiresInMinutes` comes from server config (`OTP_EXPIRY_MINUTES`).

### Errors

| Status | Condition |
|--------|-----------|
| 400    | Missing `email` |
| 404    | No user with that email |
| 403    | User is soft-deleted (`is_deleted`) — optional `code`: `ACCOUNT_DEACTIVATED` |
| 500    | Email not configured or send failure |

---

## 2. Verify OTP

**POST** `/api/v1/web/user/auth/verify-otp`

**Auth:** None  
**Headers:** `Content-Type: application/json`

### Request body

| Field   | Type   | Required | Description        |
|---------|--------|----------|--------------------|
| `email` | string | Yes      | Same as send-otp   |
| `code`  | string | Yes      | OTP from email     |

### Example

```json
{
  "email": "person@example.com",
  "code": "123456"
}
```

### Success (200)

Same **shape** as client verify-otp: message, principal object, and **3-day** JWT.

```json
{
  "message": "OTP verified",
  "user": {
    "id": "uuid",
    "email": "person@example.com",
    "role": "admin",
    "isVerified": true
  },
  "token": "<jwt>"
}
```

**Password is never returned.** `role` and `isVerified` reflect the `users` row.

### Using the token

Send as a Bearer token:

`Authorization: Bearer <token>`

**JWT payload (conceptually):** user id, `type: "user"` (web user session — parallel to client tokens using `type: "client"`), and `email`. Expiry: **3 days**.

For routes that should only accept this web-user OTP token, use the **`verifyWebUserAuth`** middleware (requires `type === user` in the JWT and a non-deleted `users` row).

### Errors

| Status | Condition |
|--------|-----------|
| 400    | Missing `email` or `code` |
| 401    | Invalid/expired OTP, OTP already used, or user missing after verify |
| 403    | User deactivated — optional `code`: `ACCOUNT_DEACTIVATED` |
| 500    | Server error |

---

## Full URL examples

With API root `http://localhost:3002/api/v1`:

- `POST http://localhost:3002/api/v1/web/user/auth/send-otp`
- `POST http://localhost:3002/api/v1/web/user/auth/verify-otp`

---

## Relation to client OTP

| Aspect | Client (`/web/client/...`) | User (`/web/user/...`) |
|--------|----------------------------|-------------------------|
| Identity table | `clients` | `users` |
| Response principal | `client` | `user` |
| JWT `type` | `client` | `user` |
| OTP email template | Client portal OTP | **Same** client portal OTP template |

OTP codes for the **same email** share one `otps` table; avoid overlapping client vs user OTP flows on one inbox at the same time if both exist for that email.
