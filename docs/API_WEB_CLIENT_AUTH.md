# Web Client Auth API – Frontend Integration

**Use this doc in your frontend repo:** Copy this file (or its contents) into your frontend project. In Cursor, you can say: *"Implement client (website) signup and login using the API and payloads described in API_WEB_CLIENT_AUTH.md. Add an auth service, types, and integrate signup (create client), send-otp, verify-otp, token storage, and protected requests."*

---

## Overview

- **Audience:** Website (client portal), not admin.
- **Create client (signup):** New clients submit the **brand intake form** → **POST** `/api/v1/web/client/auth/signup`. Backend creates the client in the DB and sends a "new client onboard" notification to the team. No token returned; client then uses **login** (OTP) with the same email.
- **Login flow:** Email → Send OTP → User enters code → Verify OTP → Backend returns **client** (id, name, email) + **JWT**. No password; the email must exist in the **clients** table (sign up first if new).
- **Token:** Single JWT, **3 days** expiry. Send as `Authorization: Bearer <token>` on protected web routes.
- **No roles:** Backend only confirms the client exists (and is not deactivated); there is no separate "client role" beyond the token type.

---

## Base URL

| Env (example) | Value | Usage |
|---------------|--------|--------|
| `VITE_API_BASE` or `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | Backend server |
| Web client base | `${API_BASE}/api/v1/web/client` | Signup, Send OTP, Verify OTP (under `/auth/...`) |

**Example:** Base = `http://localhost:3002/api/v1/web/client`. Signup = `${API_BASE}/api/v1/web/client/auth/signup`, Send OTP = `${API_BASE}/api/v1/web/client/auth/send-otp`, Verify OTP = `${API_BASE}/api/v1/web/client/auth/verify-otp`.

---

## Headers

| Header | When | Value |
|--------|------|--------|
| `Content-Type` | Every request with body | `application/json` |
| `Authorization` | After login (protected web APIs) | `Bearer <token>` |

---

## TypeScript types (copy into frontend)

```ts
// Client returned by verify-otp and signup (id, name, email only)
export interface AuthClient {
  id: string;
  name: string;
  email: string;
}

// Brand intake form – create client (signup) payload
export interface ClientSignupPayload {
  brandProductName: string;
  websiteLink: string;
  primaryContactEmail: string;
  telegramId?: string;
  whatsappNumber?: string;
  categories?: string[];
  audienceReadinessLevel?: string;
  campaignGoals?: string[];
  monetizationModel?: string[];
  revenueModel?: string;
  marketFocus?: string;
  primaryAudienceGeography?: string[];
  ageRange?: string;
  genderSkew?: string;
  geographicLocation?: string;
  campaignStartTimeline?: string;
  campaignStartDate?: string;
  campaignEndDate?: string;
  customBrief?: string;
}

// Success: signup (create client) – same shape as verify-otp; includes token so user is logged in immediately
export interface ClientSignupSuccess {
  message: string;
  client: AuthClient;
  token: string;
}

// Success: verify-otp (same shape as signup)
export interface ClientAuthSuccess {
  message: string;
  client: AuthClient;
  token: string;
}

// Success: send-otp (no token)
export interface ClientSendOtpSuccess {
  message: string;
  expiresInMinutes: number;
}

// Request payloads
export interface ClientSendOtpPayload {
  email: string;
}

export interface ClientVerifyOtpPayload {
  email: string;
  code: string;
}

// Error response (all error statuses)
export interface ApiError {
  error: string;
  code?: string;  // e.g. "ACCOUNT_DEACTIVATED"
}
```

---

## 1. Create client (signup)

**POST** `{API_BASE}/api/v1/web/client/auth/signup`

Creates a new client from the brand intake form. Stores all data in the DB and sends a "new client onboard" notification to the team. Returns the **same response as sign-in** (client + JWT token), so the user is **logged in immediately**; no need to go through send-otp / verify-otp after signup.

**Request payload:** (all optional except the three required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `brandProductName` | string | **Yes** | Brand or product name (stored as client `name`) |
| `websiteLink` | string | **Yes** | Website URL (stored as `website`) |
| `primaryContactEmail` | string | **Yes** | Contact email (stored as `email`; must be unique) |
| `telegramId` | string | No | Telegram ID |
| `whatsappNumber` | string | No | WhatsApp number |
| `categories` | string[] | No | e.g. `["Tech", "B2B"]` (stored comma-separated) |
| `audienceReadinessLevel` | string | No | Not stored on client; can be sent for future use |
| `campaignGoals` | string[] | No | Stored comma-separated |
| `monetizationModel` | string[] | No | Stored comma-separated |
| `revenueModel` | string | No | Not stored on client |
| `marketFocus` | string | No | Not stored on client |
| `primaryAudienceGeography` | string[] | No | Stored comma-separated |
| `ageRange` | string | No | Age range (e.g. "18-24") |
| `genderSkew` | string | No | Gender skew |
| `geographicLocation` | string | No | Not stored on client |
| `campaignStartTimeline` | string | No | When campaign starts (e.g. "ASAP") |
| `campaignStartDate` | string | No | Not stored on client |
| `campaignEndDate` | string | No | Not stored on client |
| `customBrief` | string | No | Long text brief |

**Example request (minimal):**
```json
{
  "brandProductName": "Acme Corp",
  "websiteLink": "https://acme.com",
  "primaryContactEmail": "contact@acme.com"
}
```

**Example request (full):**
```json
{
  "brandProductName": "Acme Corp",
  "websiteLink": "https://acme.com",
  "primaryContactEmail": "contact@acme.com",
  "telegramId": "@acme",
  "whatsappNumber": "+1234567890",
  "categories": ["Tech", "B2B"],
  "campaignGoals": ["Brand awareness"],
  "monetizationModel": ["CPM"],
  "primaryAudienceGeography": ["US", "EU"],
  "ageRange": "25-34",
  "genderSkew": "Neutral",
  "campaignStartTimeline": "ASAP",
  "customBrief": "Looking for tech influencers for Q1 campaign."
}
```

**Success (201 Created):** Same shape as verify-otp (client + token).
```json
{
  "message": "Form submitted successfully",
  "client": {
    "id": "uuid",
    "name": "Acme Corp",
    "email": "contact@acme.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Brand / Product Name is required" }` | Missing `brandProductName` |
| 400 | `{ "error": "Website Link is required" }` | Missing `websiteLink` |
| 400 | `{ "error": "Primary Contact Email is required" }` | Missing `primaryContactEmail` |
| 409 | `{ "error": "Client with this email already exists" }` | Email already registered |
| 500 | `{ "error": "<message>" }` | Server error |

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/web/client/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: ClientSignupSuccess (client + token) → store data.client, data.token; user is logged in; redirect to app
```

---

## 2. Send OTP

**POST** `{API_BASE}/api/v1/web/client/auth/send-otp`

Sends a one-time code to the client’s email. The email **must** exist in the **clients** table and the client must not be deactivated.

**Request payload:**
```json
{
  "email": "client@example.com"
}
```

**Success (200):**
```json
{
  "message": "OTP sent successfully",
  "expiresInMinutes": 10
}
```

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Email is required" }` | Missing or empty `email` |
| 404 | `{ "error": "No client found with this email. If you are a new client, please sign up first." }` | Email not in clients table |
| 403 | `{ "error": "Account has been deactivated. Contact support.", "code": "ACCOUNT_DEACTIVATED" }` | Client is deleted |
| 500 | `{ "error": "<message>" }` | Server / email error |

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/web/client/auth/send-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: ClientSendOtpSuccess → show "Code sent", then show code input; optionally display data.expiresInMinutes
```

---

## 3. Verify OTP

**POST** `{API_BASE}/api/v1/web/client/auth/verify-otp`

Verifies the OTP code and returns the **client** (id, name, email only) and a **JWT**. Store both on the frontend and use the token for protected requests.

**Request payload:**
```json
{
  "email": "client@example.com",
  "code": "123456"
}
```

**Success (200):**
```json
{
  "message": "OTP verified",
  "client": {
    "id": "uuid",
    "name": "Acme Corp",
    "email": "client@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Email and code are required" }` | Missing `email` or `code` |
| 401 | `{ "error": "Invalid or expired OTP" }` | Wrong code or OTP not found |
| 401 | `{ "error": "OTP has expired" }` | Code past expiry |
| 401 | `{ "error": "Client not found" }` | Client missing after OTP use |
| 403 | `{ "error": "Account has been deactivated. Contact support.", "code": "ACCOUNT_DEACTIVATED" }` | Client is deleted |
| 500 | `{ "error": "<message>" }` | Server error |

**Example (fetch):**
```ts
const res = await fetch(`${API_BASE}/api/v1/web/client/auth/verify-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code: String(code).trim() }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data: ClientAuthSuccess → store data.client, data.token; redirect to dashboard
```

---

## 4. Using the token (protected web routes)

Any route that uses **client auth** expects:

**Header:**
```
Authorization: Bearer <token>
```

**Token contents (JWT payload):**
- `id` – client UUID  
- `type` – `"client"`  
- `email` – client email  
- `exp` – expiry (3 days from issue)

**On success:** The backend validates the JWT and ensures the client still exists and is not deactivated; your request proceeds and the backend has access to `req.client` and `req.clientEntity`.

**Error responses (when token is missing or invalid):**

| Status | Body | When |
|--------|------|------|
| 401 | `{ "success": false, "message": "Access token is not provided" }` | No `Authorization` header or no Bearer token |
| 401 | `{ "success": false, "message": "Access token has expired" }` | JWT expired |
| 401 | `{ "success": false, "message": "Access token is not valid" }` | Invalid JWT |
| 403 | `{ "success": false, "message": "Invalid token type" }` | Token is not a client token (e.g. admin token used on client route) |
| 401 | `{ "success": false, "message": "Client not found or deactivated" }` | Client no longer exists or is deleted |
| 500 | `{ "success": false, "message": "Internal server error" }` | Server error during validation |

**Frontend handling:**
- Store `token` (and optionally `client`) after verify-otp (e.g. in state + `localStorage` or `sessionStorage`).
- On every protected request, send: `Authorization: Bearer ${token}`.
- If any protected request returns **401** or **403** with one of the messages above: clear token and client, redirect to login (e.g. send-otp screen).

**Example (protected request):**
```ts
const res = await fetch(`${API_BASE}/api/v1/web/some-protected-route`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});
if (res.status === 401 || res.status === 403) {
  const data = await res.json();
  if (data.success === false) {
    // Clear token and client, redirect to login
    clearAuth();
    redirectToLogin();
    return;
  }
}
const data = await res.json();
```

---

## Quick reference

| Action        | Method | URL | Body | Auth |
|---------------|--------|-----|------|------|
| Create client (signup) | POST | `/api/v1/web/client/auth/signup` | Brand intake (see §1) | no  |
| Send OTP      | POST   | `/api/v1/web/client/auth/send-otp`   | `{ email }`       | no  |
| Verify OTP    | POST   | `/api/v1/web/client/auth/verify-otp` | `{ email, code }` | no  |
| Protected web routes | GET/POST/etc. | e.g. `/api/v1/web/...` | as per route | Bearer (client token) |

**Base:** `{API_BASE}/api/v1/web/client`  
**Example API_BASE:** `http://localhost:3002`

---

## Flow summary

**New client (signup)**
1. User fills **brand intake form** → **POST** `/api/v1/web/client/auth/signup` with full payload.
2. On success (201): response includes **client** + **token** (same as sign-in). Store `client` and `token`; user is logged in; redirect to app. No OTP step needed.

**Login (existing client, via OTP)**
1. User enters **email** → **POST** `/api/v1/web/client/auth/send-otp` with `{ email }`.
2. On success: show "Code sent" and an input for the **code**; optionally show `expiresInMinutes`.
3. User enters **code** → **POST** `/api/v1/web/client/auth/verify-otp` with `{ email, code }`.
4. On success: store `client` and `token`; redirect to app; send `Authorization: Bearer <token>` on all protected web requests.
5. On 401/403 from protected routes: clear auth and redirect to login (step 1).

Use this document in the frontend repo to implement and integrate the web client auth API.