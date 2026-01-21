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

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

Remove any changes mave to the database after running commands.
