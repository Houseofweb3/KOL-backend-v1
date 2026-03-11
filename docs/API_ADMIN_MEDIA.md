# Admin Media Management API

REST API for folder and file management. Files are stored in **Hetzner Object Storage** (or AWS S3) via S3-compatible API. Admin JWT required.

**Base path:** `/api/v1/admin/media`  
**Auth:** `Authorization: Bearer <admin_jwt>`

**Limits:**
- **Images:** max 10MB. Allowed: JPEG, PNG, GIF, WebP, SVG.
- **Documents:** max 20MB. Allowed: PDF, Word, Excel, TXT, CSV.

---

## Folders

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/admin/media/folders | List folders (optional `?parentId=<uuid>` for children; omit for root) |
| POST | /api/v1/admin/media/folders | Create folder. Body: `{ "name": "Folder Name", "parentId": "<uuid> \| null }` |
| DELETE | /api/v1/admin/media/folders/:id | Delete folder and all its files (and subfolders) |

### GET /folders

**Query:** `parentId` (optional) – list folders with this parent; omit or empty for root.

**Response 200:** `{ "folders": [ { "id", "name", "parentId", "createdAt", "updatedAt" }, ... ] }`

### POST /folders

**Body:** `{ "name": "My Folder", "parentId": null }`  
**Response 201:** `{ "id", "name", "parentId", "createdAt", "updatedAt" }`

### DELETE /folders/:id

**Response 200:** `{ "message": "Folder deleted" }`  
**404:** Folder not found.

---

## Files

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/admin/media/files | List files. Query: `folderId` (optional; omit for root) |
| POST | /api/v1/admin/media/files | Upload file (field: `file`). Images ≤10MB, documents ≤20MB. Optional body/query: `folderId` |
| DELETE | /api/v1/admin/media/files/:id | Delete file |

### GET /files

**Query:** `folderId` (optional) – list files in this folder; omit for root.

**Response 200:**  
`{ "files": [ { "id", "name", "mimeType", "sizeBytes", "type", "url", "createdAt" }, ... ] }`  
`url` is a signed GET URL (valid 1 hour) for private buckets.

### POST /files

**Content-Type:** `multipart/form-data`  
**Field name:** `file` – image or document. Type detected from mimetype; images max 10MB, documents max 20MB.  
**Optional:** `folderId` in body or query.

**Response 201:**  
`{ "id", "name", "mimeType", "sizeBytes", "type": "image" | "document", "url", "createdAt" }`

**400:** No file, wrong type, or file too large (image >10MB or document >20MB).

### DELETE /files/:id

**Response 200:** `{ "message": "File deleted" }`  
**404:** File not found.

---

## Environment (Hetzner Object Storage)

Use existing AWS_* vars; add optional endpoint for Hetzner:

- `S3_ENDPOINT` – e.g. `https://fsn1.your-objectstorage.com` (Hetzner)
- `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

If `S3_ENDPOINT` is set, the client uses it (Hetzner S3-compatible API). Otherwise default AWS S3.
