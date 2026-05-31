# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Run locally with hot reload (nodemon → ts-node src/index.ts)
npm run build          # Clean + tsc -b → dist/
npm start              # Run compiled output (node dist/index.js)
npm run start:prod     # build + start
npm run lint           # eslint src/**/*.ts --fix
npm run format         # prettier --write
npm run db:drop-all    # DESTRUCTIVE: drop all tables (ts-node src/scripts/drop-all-tables.ts)
```

There is **no test runner** despite the husky `pre-commit` hook referencing `npm test` (the script does not exist). After non-trivial changes, run `npm run lint` and `npm run build`.

Deployment is PM2-based on the server: `./deploy.sh` does `git pull && npm install && npm run build && pm2 restart kol-backend` (see `ecosystem.config.cjs`). API docs are served at `/docs` (Swagger).

## Environment

Env is loaded and validated via `dotenv-safe` in `src/config/env.ts` against `.env.example`. **Every key in `.env.example` must have a non-empty value in `.env` or the process throws at startup.** When adding a new env var, add it to `.env.example`, type it in the `Env` interface, and read it in the `ENV` object — do not edit `.env` directly (it holds secrets). `NODE_ENV` is normalized to `'dev' | 'prod'`.

## Architecture

Node + Express + TypeORM + TypeScript REST backend for the KOL (Key Opinion Leader) platform. PostgreSQL via TypeORM with `synchronize: true` — **the schema is auto-synced from entity decorators; there are no migrations** despite the `migrations`/`subscribers` globs in `src/config/data-source.ts`. Changing an entity changes the live schema on next boot.

### Request flow & strict layering

`src/index.ts` mounts everything under `/api/v{VERSION}` (e.g. `/api/v1`) → `routes/v1/index.ts` splits into two top-level surfaces:

- **`/api/v1/admin/*`** — internal admin panel (auth, influencer, client, cart, media, rate, dashboard, task, kol-invoices, database).
- **`/api/v1/web/*`** — public/client-facing (client auth, user auth, influencer, cart, proposal, creator-onboarding, blogs, images).

Each surface mirrors the same 3-layer split, and code is duplicated per surface by design (admin and web have **separate** controllers/services for the same domain concept):

```
routes/v1/{admin,web}/*.routes.ts   → wire endpoints + auth middleware
controllers/v1/{admin,web}/*.controller.ts → parse/validate input, shape HTTP response, try/catch + logger
services/v1/{admin,web}/*.service.ts → business rules, pricing, all DB access (repository / query-builder)
```

Keep this separation: **controllers do no business logic; services own DB writes and pricing.** When a business rule changes (especially pricing/currency), update shared helpers in `src/utils/**` and `src/constants/**` so admin and web flows stay aligned rather than editing one side only.

### Auth (four distinct JWT identities)

All auth lives in `src/middleware/auth.ts`. A single JWT secret signs four token *types* (`UserRole` in `src/constants/roles.ts`), and each guard rejects mismatched types:

- `verifyAdminAuth` — `type === admin` (admin panel).
- `verifyClientAuth` — `type === client`; re-loads the `Client` row, rejects if deleted. Attaches `req.client` / `req.clientEntity`.
- `verifyWebUserAuth` — `type === user` (OTP login); re-loads `User`. Attaches `req.webUser` / `req.webUserEntity`.
- `verifyAccessToken` — generic decode, no type check.

The augmented request shape is `JwtRequest`. Note many admin routes currently have `router.use(verifyAdminAuth)` commented out — check the specific route file before assuming a route is protected.

### Entities

Entity classes live in `src/entity/*.entity.ts`, re-exported from `src/entity/index.ts`, and **must also be listed in the `entities` array in `src/config/data-source.ts`** to be registered. Most extend `BaseModel` (`createdAt`, `updatedAt`, `deletedAt`) and use **soft deletes** (`isDeleted` / `deletedAt`) rather than hard deletes — filter on these in queries.

### Naming wrinkle: "Koal" vs "kol"

The KOL-invoice feature was originally spelled **`Koal`** and is being renamed to **`kol`**. The entity class is still exported as `KoalInvoice`, and `src/db/ensure-koal-invoice-indexes.ts` (run once at startup from `index.ts`) creates a unique invoice-number index. Files/routes use `kol-invoice`. Expect both spellings; match whatever the surrounding file uses.

### Other conventions

- HTTP status via `http-status-codes` (`HttpStatus`); JSON responses follow `{ success, message, data? }`.
- Logging via Winston (`src/config/logger.ts`, daily-rotate to `logs/`); log IDs/counts, never PII/tokens/secrets.
- Centralize magic numbers and business config in `src/constants/**` (roles, cart, kol-invoice, creator-onboarding-options, ampli5, auto-proposal, blog, task).
- File uploads: `multer` middleware (`uploadCsv.ts`, `uploadMedia.ts`); object storage is S3-compatible (AWS S3 or Hetzner — `object-storage.service.ts`, set `S3_ENDPOINT` for Hetzner).
- PDF generation: `puppeteer` + EJS templates in `src/templates/` (invoices, cart proposals).
- Email via `nodemailer` (`src/notifications/`); a separate sender pair exists for bounty emails.
- One-off scripts in `src/scripts/**` must be idempotent and re-runnable, read env the same way as the app, batch write-heavy work, and reuse shared pricing utils if they touch money fields.

## Reference

Per-endpoint API docs are maintained as markdown in `docs/` (e.g. `API_ADMIN_CART.md`, `API_WEB_CREATOR_ONBOARDING.md`, `SYSTEM_CONTEXT.md`). Consult these for exact request/response contracts before changing an endpoint, and keep response shapes stable.
