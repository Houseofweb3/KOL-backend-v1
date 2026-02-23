# KOL Backend – Auth API Integration (Frontend)

**Use this doc in your frontend repo:** Copy this file (or its contents) into your frontend project. In Cursor, you can say: *"Implement authentication using the API and payloads described in FRONTEND_AUTH_INTEGRATION.md. Add an auth service, types, and integrate signup, login, logout, and OTP with the UI."*

---

## Base URL

| Env (example) | Value | Usage |
|---------------|--------|--------|
| `VITE_API_BASE` or `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | Backend server |
| Auth base | `${API_BASE}/api/v1/admin` | Signup, login, logout, OTP, PATCH users/:id |

**Example:** Auth base = `http://localhost:3002/api/v1/admin`.

---

## Headers

| Header | When | Value |
|--------|------|--------|
| `Content-Type` | Every request with body | `application/json` |
| `Authorization` | After login (protected APIs) | `Bearer <token>` |

---

## TypeScript types (copy into frontend)

```ts
// User returned by signup, login, verify-otp (role set server-side only; new accounts: role 'admin_user', isVerified false)
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Success responses that return user + token
export interface AuthSuccess {
  message: string;
  user: AuthUser;
  token: string;
}

// Error response (all error statuses)
export interface ApiError {
  error: string;
}

// Request payloads
export interface SignupPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

// Send OTP success (no token)
export interface SendOtpSuccess {
  message: string;
  expiresInMinutes: number;
}

// Logout success
export interface LogoutSuccess {
  message: string;
}
```

---

## 1. Signup

**POST** `{API_BASE}/api/v1/admin/signup`

**Request payload:**
```json
{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```

**Success (201):** No token returned. User must login or use OTP to get a token.
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin_user",
    "isVerified": false,
    "isDeleted": false,
    "createdAt": "2025-02-21T10:00:00.000Z",
    "updatedAt": "2025-02-21T10:00:00.000Z",
    "deletedAt": null
  }
}
```

**Error:** `{ "error": "Email and password are required" }` (400) | `{ "error": "User with this email already exists" }` (409)

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/admin/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: { message, user } — no token; user must login or use OTP to get token
```

---

## 2. Login

**POST** `{API_BASE}/api/v1/admin/login`

**Request payload:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Success (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin_user",
    "isVerified": false,
    "isDeleted": false,
    "createdAt": "2025-02-21T10:00:00.000Z",
    "updatedAt": "2025-02-21T10:00:00.000Z",
    "deletedAt": null
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:** `{ "error": "Email and password are required" }` (400) | `{ "error": "Invalid email or password" }` (401) | `{ "error": "Account not verified...", "code": "ACCOUNT_NOT_VERIFIED" }` (403) | `{ "error": "Account has been deactivated...", "code": "ACCOUNT_DEACTIVATED" }` (403 — deleted user cannot login)

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: AuthSuccess → store data.user, data.token
```

---

## 3. Logout

**POST** `{API_BASE}/api/v1/admin/logout`

**Request payload:** none (or `{}`).

**Success (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Example (fetch):** Optional to call API; always clear token and user on frontend.
```ts
await fetch(`${API_BASE}/api/v1/admin/logout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
  body: JSON.stringify({}),
});
// Then: clear stored token and user, redirect to login
```

---

## 4. Send OTP

**POST** `{API_BASE}/api/v1/admin/send-otp`

User must already exist (signed up). Request payload:

```json
{
  "email": "user@example.com"
}
```

**Success (200):**
```json
{
  "message": "OTP sent successfully",
  "expiresInMinutes": 10
}
```

**Errors:** 400 (email required) | 404 (no user) | 403 `{ "error": "Account has been deactivated...", "code": "ACCOUNT_DEACTIVATED" }`

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/admin/send-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: SendOtpSuccess → show "OTP sent", then show code input
```

---

## 5. Verify OTP

**POST** `{API_BASE}/api/v1/admin/verify-otp`

**Request payload:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success (200):**
```json
{
  "message": "OTP verified",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin_user",
    "isVerified": false,
    "isDeleted": false,
    "createdAt": "2025-02-21T10:00:00.000Z",
    "updatedAt": "2025-02-21T10:00:00.000Z",
    "deletedAt": null
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:** 400 (email/code required) | 401 (invalid/expired OTP) | 403 `{ "error": "Account has been deactivated...", "code": "ACCOUNT_DEACTIVATED" }` (deleted user cannot login via OTP)

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/admin/verify-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: AuthSuccess → store data.user, data.token, redirect to app
```

---

## 6. Update user verification (admin only)

**PATCH** `{API_BASE}/api/v1/admin/users/:id`  
**Headers:** `Authorization: Bearer <admin token>`, `Content-Type: application/json`

**Request payload:**
```json
{
  "isVerified": true
}
```

**Success (200):**
```json
{
  "message": "User verification updated",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin_user",
    "isVerified": true,
    "isDeleted": false,
    "createdAt": "2025-02-21T10:00:00.000Z",
    "updatedAt": "2025-02-21T10:00:00.000Z",
    "deletedAt": null
  }
}
```

**Errors:** 400 (invalid body), 401 (no/invalid token), 403 (not admin), 404 (user not found)

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ isVerified: true }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
```

---

## Token (JWT)

- **Single token,** no refresh. **Expiry: 3 days.**
- **Store** token (and optionally `user`) in state + optionally `localStorage`/`sessionStorage`.
- **Send** on protected requests: `Authorization: Bearer <token>`.
- **On 401** (e.g. "Access token has expired"): clear token and user, redirect to login.

---

## Quick reference

| Action   | Method | URL | Body | Auth |
|----------|--------|-----|------|------|
| Signup   | POST   | `/api/v1/admin/signup` | `{ email, password }` | no |
| Login    | POST   | `/api/v1/admin/login` | `{ email, password }` | no |
| Logout   | POST   | `/api/v1/admin/logout` | none | no |
| Send OTP | POST   | `/api/v1/admin/send-otp` | `{ email }` | no |
| Verify OTP | POST | `/api/v1/admin/verify-otp` | `{ email, code }` | no |
| Update user verified | PATCH | `/api/v1/admin/users/:id` | `{ isVerified: boolean }` | Bearer (admin) |

**Auth base:** `{API_BASE}/api/v1/admin`  
**Example API_BASE:** `http://localhost:3002`

Use this document in the frontend repo to implement and integrate the auth API.
