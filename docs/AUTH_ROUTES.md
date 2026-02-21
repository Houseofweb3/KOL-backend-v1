# Auth API Routes – Frontend Implementation Guide

Base URL: `{API_BASE}` (e.g. `https://your-api.com/api/v1`).

All auth responses use a **single JWT** with **3-day expiry**. There is **no refresh token**; when the token expires, the user must log in again.

---

## 1. Admin Auth (separate Admin model)

Admin uses its own model. Use these routes for admin login, signup, and logout.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `{API_BASE}/admin/auth/signup`  | Admin signup |
| POST   | `{API_BASE}/admin/auth/login`   | Admin login (email + password) |
| POST   | `{API_BASE}/admin/auth/logout`  | Admin logout (client should discard token) |

### 1.1 Admin signup

**Request**

```http
POST {API_BASE}/admin/auth/signup
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

**Response (201)**

```json
{
  "message": "Admin created successfully",
  "admin": {
    "id": "uuid",
    "email": "admin@example.com",
    "isDeleted": false,
    "createdAt": "...",
    "updatedAt": "...",
    "deletedAt": null
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

- Store `token` (e.g. in memory or secure storage). Send it in `Authorization: Bearer <token>` for protected admin APIs.
- Token expires in **3 days**.

### 1.2 Admin login

**Request**

```http
POST {API_BASE}/admin/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

**Response (200)**

```json
{
  "message": "Login successful",
  "admin": { "id": "...", "email": "...", "isDeleted": false, "createdAt": "...", "updatedAt": "...", "deletedAt": null },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 1.3 Admin logout

**Request**

```http
POST {API_BASE}/admin/auth/logout
```

**Response (200)**

```json
{
  "message": "Logged out successfully"
}
```

- Frontend should remove the stored token and clear admin session.

---

## 2. User (client) Auth

User (client) uses the **User** model. Two ways to log in: **email + password** or **OTP**. Signup is **email + password** only.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `{API_BASE}/auth/client/signup`   | User signup (email + password) |
| POST   | `{API_BASE}/auth/client/login`    | User login with email + password |
| POST   | `{API_BASE}/auth/client/login-otp` | User login with OTP (email or phone) |

### 2.1 User signup

**Request**

```http
POST {API_BASE}/auth/client/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```

**Response (201)**

```json
{
  "message": "Signup successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "clientRole": "user",
    "is_deleted": false,
    "createdAt": "...",
    "updatedAt": "...",
    "deletedAt": null
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

- Store `token`. Use `Authorization: Bearer <token>` for protected user APIs. Token expires in **3 days**.

### 2.2 User login (email + password)

**Request**

```http
POST {API_BASE}/auth/client/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```

**Response (200)**

```json
{
  "message": "Login successful",
  "user": { "id": "...", "email": "...", "clientRole": "user", ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2.3 User login (OTP)

Supports **email OTP** or **phone OTP**.

**Option A – Email OTP**

1. Request OTP (use existing endpoint if available, e.g. send OTP to email).
2. Then:

**Request**

```http
POST {API_BASE}/auth/client/login-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otpCode": "123456"
}
```

**Option B – Phone OTP**

**Request**

```http
POST {API_BASE}/auth/client/login-otp
Content-Type: application/json

{
  "phoneNumber": "1234567890",
  "countryCode": "1",
  "otpCode": "123456"
}
```

**Response (200)** (same for both)

```json
{
  "message": "Login successful",
  "user": { "id": "...", "email": "...", "clientRole": "user", ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2.4 Requesting OTP (for login-otp)

Call one of these to send an OTP, then use the same identifier and the code in `login-otp`:

**Email OTP**

```http
POST {API_BASE}/admin/auth/generate-email-otp
Content-Type: application/json

{ "email": "user@example.com" }
```

**Phone OTP**

```http
POST {API_BASE}/admin/auth/generate-otp
Content-Type: application/json

{ "phoneNumber": "1234567890", "countryCode": "1" }
```

Then call `POST {API_BASE}/auth/client/login-otp` with the same `email` or `phoneNumber` + `countryCode` and the received `otpCode`.

---

## 3. Using the token

Send the JWT on protected requests:

```http
Authorization: Bearer <token>
```

- Token expires in **3 days**. On **401** (e.g. “Access token has expired” or “Access token is not provided”), redirect to login and get a new token (no refresh token).

---

## 4. User (client) role enum

User model has a `clientRole` field with enum:

- `admin`
- `admin_user`
- `user`

Use these for role-based UI or API checks on the frontend.

---

## 5. Error responses

- **400** – Missing or invalid body (e.g. missing email/password).
- **401** – Invalid credentials or invalid/expired OTP.
- **409** – Email already exists (signup).
- **500** – Server error.

Response shape:

```json
{
  "error": "Human-readable message"
}
```

Use these routes and the single 3-day JWT (no refresh token) to implement the full auth flow on the frontend.
