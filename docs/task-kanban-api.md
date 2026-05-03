# Task Kanban API (admin)

This document describes REST endpoints for the admin task/Kanban board. Use it when wiring a frontend or an AI coding agent: all task routes require an **admin JWT** (same auth as other `/api/v1/admin/*` routes).

## Base URL and auth

| Item | Value |
|------|--------|
| Prefix | `/api/v1/admin/task` |
| Auth header | `Authorization: Bearer <admin_access_token>` |

Obtain a token via `POST /api/v1/admin/auth/login` or OTP verification on the admin auth routes.

## User picker: list users for assignment

To populate “assign task to user” selectors, call the existing **admin users** API (not part of the task module).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/user` | Paginated user list (search by email optional) |

**Query parameters**

| Name | Type | Description |
|------|------|-------------|
| `page` | number | Page number (default `1`) |
| `limit` | number | Page size (default `10`, max `100`) |
| `search` | string | Case-insensitive substring match on email |
| `includeDeleted` | `true` \| omit | If `true`, includes soft-deleted users |

**Example response** `200 OK` (shape from `getAllUsers` in `user.service.ts`)

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "ops@example.com",
      "role": "ADMIN",
      "isVerified": true,
      "isDeleted": false,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-02T12:00:00.000Z",
      "deletedAt": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

Use each `user.id` (UUID string) in **`assignedUserIds`** when creating or updating a task. Passwords are never returned.

---

## Task model (JSON)

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | Read-only |
| `title` | string | Required on create |
| `status` | string | `todo` \| `in_progress` \| `review` \| `completed` |
| `label` | string \| `null` | Optional short tag |
| `priority` | string | `low` \| `medium` \| `high` (default `medium` on create) |
| `description` | string \| `null` | May contain HTML from the client |
| `assignedUserIds` | UUID[] | User ids to assign; send only ids from the users API |
| `createdByUserId` | UUID | Set from the admin JWT on create (read-only semantics) |
| `createdAt`, `updatedAt` | ISO datetime | From `BaseModel` |
| `deletedAt` | ISO datetime \| `null` | Set when soft-deleted |
| `isDeleted` | boolean | `true` after delete |

---

## Endpoints

### 1. Board: tasks you created (grouped by status)

**`GET /api/v1/admin/task/board/created`**

Returns an object with **four keys** matching statuses. Each value is an array of full task objects; within a column, tasks are ordered by `updatedAt` descending.

**Response** `200 OK`

```json
{
  "todo": [],
  "in_progress": [],
  "review": [],
  "completed": []
}
```

Each array item matches the **Task model** above. Only tasks where `createdByUserId` equals the **current admin’s user id** and `isDeleted === false` are included.

---

### 2. Board: tasks assigned to you (grouped by status)

**`GET /api/v1/admin/task/board/assigned`**

Same response shape as **`board/created`**, but includes tasks where the current admin’s user id appears in `assignedUserIds` (and `isDeleted === false`).

---

### 3. Create task

**`POST /api/v1/admin/task`**  
**Content-Type:** `application/json`

**Body**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Non-empty string |
| `status` | No | Default `todo` |
| `label` | No | String or `null` |
| `priority` | No | Default `medium` |
| `description` | No | String (HTML) or `null` |
| `assignedUserIds` | No | Array of user UUID strings |

**Example**

```json
{
  "title": "Ship onboarding flow",
  "status": "todo",
  "label": "product",
  "priority": "high",
  "description": "<p>Use the new layout.</p>",
  "assignedUserIds": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

**Responses**

- `201 Created` — created task entity as JSON
- `400` — validation error (body: `{ "error": "..." }`)
- `401` / `403` — auth

---

### 4. Get one task

**`GET /api/v1/admin/task/:id`**

- `200 OK` — task JSON  
- `404` — not found or soft-deleted  

---

### 5. Update task content (not status)

**`PATCH /api/v1/admin/task/:id`**  
**Content-Type:** `application/json`

Send only fields to change. Allowed fields: **`title`**, **`label`**, **`priority`**, **`description`**, **`assignedUserIds`**.

`status` is **not** accepted here; use the status endpoint below.

**Example**

```json
{
  "title": "Ship onboarding flow v2",
  "assignedUserIds": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
}
```

- `200 OK` — updated task  
- `400` / `404` — validation or missing task  

---

### 6. Update status only (drag Kanban column)

**`PATCH /api/v1/admin/task/:id/status`**  
**Content-Type:** `application/json`

**Body**

```json
{ "status": "in_progress" }
```

Allowed `status` values: `todo`, `in_progress`, `review`, `completed`.

- `200 OK` — updated task  
- `400` — missing or invalid status  
- `404` — task not found  

---

### 7. Delete task (soft delete)

**`DELETE /api/v1/admin/task/:id`**

- `200 OK`:

```json
{
  "message": "Task deleted",
  "task": { }
}
```

Deleted tasks no longer appear on boards or `GET /:id`.

---

## Frontend integration notes

1. **Tabs “Created” vs “Assigned”**: call `GET .../board/created` and `GET .../board/assigned` respectively; render four columns from each response object.
2. **Assignees**: load options from `GET .../admin/user`; store selected values as UUID strings in `assignedUserIds`.
3. **Kanban drag**: on drop, call `PATCH .../:id/status` with the target column’s status.
4. **Rich description**: treat `description` as HTML on the client; sanitize if you display untrusted content.

---

## Error shape

Most failures return:

```json
{ "error": "<human-readable message>" }
```

HTTP status reflects the error (`400`, `401`, `403`, `404`, `500`, etc.).
