# Web Client Auth Controller – API Reference

Documentation for **`src/controllers/v1/web/client-auth.controller.ts`**: endpoints, payloads, and responses. Base path: **`/api/v1/web/client`**.

---

## Overview

| Endpoint        | Method | Path                          | Purpose                    |
|----------------|--------|-------------------------------|----------------------------|
| Send OTP       | POST   | `/api/v1/web/client/auth/send-otp`   | Send OTP to client email  |
| Verify OTP     | POST   | `/api/v1/web/client/auth/verify-otp` | Verify code, return client + JWT |
| Signup         | POST   | `/api/v1/web/client/auth/signup`     | Brand intake; create client + token |

All request bodies: **JSON**. Header: **`Content-Type: application/json`**. No auth required for these three endpoints.

---

## 1. Send OTP

**POST** `/api/v1/web/client/auth/send-otp`

Client must already exist in the clients table. Sends an OTP to the given email.

**Request body:**

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `email` | string | Yes      | Client email. |

**Example:** `{ "email": "client@example.com" }`

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
| 400 | `{ "error": "Email is required" }` | Missing `email` |
| 404 | `{ "error": "No client found with this email. If you are a new client, please sign up first." }` | Email not in clients table |
| 403 | `{ "error": "Account has been deactivated. Contact support.", "code": "ACCOUNT_DEACTIVATED" }` | Client is deleted |
| 500 | `{ "error": "<message>" }` | Server error |

---

## 2. Verify OTP

**POST** `/api/v1/web/client/auth/verify-otp`

Verifies the OTP code and returns the **client** object and a **JWT** (3 days). Use the token for protected web routes (`Authorization: Bearer <token>`).

**Request body:**

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `email` | string | Yes      | Same email used in send-otp. |
| `code`  | string | Yes      | OTP code from email (trimmed by backend). |

**Example:** `{ "email": "client@example.com", "code": "123456" }`

**Success (200):**

```json
{
  "message": "OTP verified",
  "client": {
    "id": "uuid",
    "name": "Client Name",
    "email": "client@example.com",
    "projectName": null,
    "projectUrl": null,
    "telegramId": null,
    "whatsAppNumber": null
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
| 401 | `{ "error": "Client not found. Please sign up first or contact support." }` | Client missing after OTP use |
| 403 | `{ "error": "Account has been deactivated. Contact support.", "code": "ACCOUNT_DEACTIVATED" }` | Client is deleted |
| 500 | `{ "error": "<message>" }` | Server error |

Errors may include an optional **`code`** field when set by the service (e.g. `ACCOUNT_DEACTIVATED`).

---

## 3. Signup (brand intake)

**POST** `/api/v1/web/client/auth/signup`

Creates a client from the brand intake form and sends an onboard notification. Returns **client + token** (user is logged in); no OTP step needed.

**Request body:** Brand intake form payload (see service / `BrandIntakeFormData`). Required fields include at least:

- `brandProductName`
- `websiteLink`
- `primaryContactEmail`

**Success (201 Created):**

```json
{
  "message": "Form submitted successfully",
  "client": {
    "id": "uuid",
    "name": "Acme Corp",
    "email": "client@example.com",
    "projectName": null,
    "projectUrl": null,
    "telegramId": null,
    "whatsAppNumber": null
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "<message>" }` | Validation (e.g. missing required fields) |
| 500 | `{ "error": "<message>" }` | Server error |

---

## Quick reference

| Action     | Method | Path                                      | Body |
|-----------|--------|-------------------------------------------|------|
| Send OTP  | POST   | `/api/v1/web/client/auth/send-otp`        | `{ "email" }` |
| Verify OTP| POST   | `/api/v1/web/client/auth/verify-otp`       | `{ "email", "code" }` |
| Signup    | POST   | `/api/v1/web/client/auth/signup`          | Brand intake object |

**Base URL example:** `http://localhost:3002/api/v1/web/client`

**Controller file:** `src/controllers/v1/web/client-auth.controller.ts`  
**Routes:** `src/routes/v1/web/client.auth.routes.ts` (mounted at `/client` in web routes).
