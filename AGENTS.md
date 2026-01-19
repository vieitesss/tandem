# AGENTS.md

Tandem is a small monorepo with a Next.js frontend and an Express API backed by Supabase.

## Getting Oriented
- Apps: `apps/frontend` (Next.js App Router + Tailwind), `apps/backend` (Express + Supabase).
- Package manager: Bun (each app pins it via `packageManager`).
- Local dev (one command): `docker compose up --build` (uses `.env` for Supabase credentials).

## Repo-Wide Conventions
- JavaScript only.
- Frontend uses ESM; backend uses CommonJS.
- Formatting: 2 spaces, double quotes, semicolons.
- API payload keys: snake_case.
- Avoid adding new tooling unless requested.

## More Specific Guidance
- Frontend: `apps/frontend/AGENTS.md`
- Backend: `apps/backend/AGENTS.md`
