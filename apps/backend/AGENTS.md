# apps/backend/AGENTS.md

This app is an Express API (CommonJS) that talks to Supabase.

## Commands
- Install: `bun install`
- Dev (nodemon): `bun run dev`
- Start (prod): `bun run start`
- Run migrations: `bun run db:migrate`

## Environment
- Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Optional: `PORT` (default 4000), `CORS_ORIGIN`.

## Backend Conventions
- Express: async handlers; parse JSON via `express.json()`.
- Validate inputs early; `400` with a clear error string.
- Supabase: check `{ error }` after each request; use `.single()` when expecting one row.
- Errors: return `500` with `error.message` for Supabase failures.
- Payloads and DB column names use snake_case; coerce numeric strings with `Number(...)` early.
